/**
 * Unit Test Suite for Node 24 native node:sqlite persistence of Agora Room & Timetable states
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const { agoraRoomManager } = require('../dist/modules/agora-room');
const { horaiScheduler } = require('../dist/modules/horai-scheduler');
const {
  getSpiderDb,
  loadRoomPlaybackState,
  loadRoomTimetable
} = require('../dist/db/spider-db');

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function run() {
  console.log('--- Agora & Horai spider.db Persistence Unit Tests ---');

  const spiderDbPath = process.env.SPIDER_DB_PATH || path.resolve(process.cwd(), 'data/spider.db');
  console.log(`1. Target spider.db: ${spiderDbPath}`);

  const roomId = 'test-persistent-agora-room-42';
  const feedUrl = 'https://podcast.example.com/v4v/feed.xml';
  const episodeGuid = 'guid-persistent-999';
  const episodeTitle = 'Persistence on Node 24 Native';

  // 2. Initialize Room
  console.log('2. Initializing Agora room and verifying persistence...');
  agoraRoomManager.initializeEpisodeRoom(roomId, feedUrl, episodeGuid, episodeTitle);

  // Directly verify table content using native DatabaseSync
  const rawDb = new DatabaseSync(spiderDbPath);
  const row1 = rawDb.prepare('SELECT * FROM agora_room_playback WHERE room_id = ?').get(roomId);
  assert(row1 !== undefined && row1 !== null, 'Room must be persisted in agora_room_playback table');
  assert(row1.room_id === roomId, 'room_id must match');
  assert(row1.episode_title === episodeTitle, 'episode_title must match');
  assert(Number(row1.is_playing) === 0, 'is_playing should initially be 0');
  console.log('   [PASS] Initial room state persisted in spider.db.');

  // 3. User joins and starts playback
  console.log('3. Listener joins, starts playback, seeks to 45000ms...');
  agoraRoomManager.joinRoom(roomId, {
    userId: 'user-sat-collector',
    username: 'SatCollector',
    walletAddress: 'collector@getalby.com'
  });
  agoraRoomManager.updatePlaybackState(roomId, 'user-sat-collector', true, 30000);
  agoraRoomManager.hostSeek(roomId, 'user-sat-collector', 45000);

  const row2 = rawDb.prepare('SELECT * FROM agora_room_playback WHERE room_id = ?').get(roomId);
  assert(Number(row2.is_playing) === 1, 'is_playing must be 1');
  assert(row2.host_user_id === 'user-sat-collector', 'host_user_id must be updated');
  assert(Number(row2.playback_position_ms) === 45000, 'playback_position_ms must be 45000');
  const listeners = JSON.parse(row2.listeners_json);
  assert(listeners.length === 1 && listeners[0].username === 'SatCollector', 'Listeners JSON must persist');
  console.log('   [PASS] Playback and host seek state updates persisted to spider.db.');

  // 4. Timetable Items Persistence
  console.log('4. Adding timetable items and verifying persistence in agora_timetable...');
  const now = Date.now();
  const itemA = {
    id: 'tt-seg-1',
    title: 'Segment 1: Lightning Micropayments',
    feedUrl,
    episodeGuid: 'ep-seg-1',
    startTime: now + 5000,
    duration: 30000
  };
  const itemB = {
    id: 'tt-seg-2',
    title: 'Segment 2: Value Invariants',
    feedUrl,
    episodeGuid: 'ep-seg-2',
    startTime: now + 35000,
    duration: 60000
  };

  horaiScheduler.addScheduledItem(roomId, itemA);
  horaiScheduler.addScheduledItem(roomId, itemB);

  const timetableRows = rawDb.prepare('SELECT * FROM agora_timetable WHERE room_id = ? ORDER BY start_time ASC').all(roomId);
  assert(timetableRows.length === 2, 'Two timetable items must be stored in agora_timetable');
  assert(timetableRows[0].id === 'tt-seg-1', 'First item ID matches');
  assert(timetableRows[1].id === 'tt-seg-2', 'Second item ID matches');
  console.log('   [PASS] Timetable items persisted in agora_timetable table.');

  // 5. Memory eviction and reload test: Verify data is restored directly from DB
  console.log('5. Evicting in-memory caches and reloading from spider.db...');
  // Force delete from in-memory Map
  agoraRoomManager['rooms'].delete(roomId);
  assert(agoraRoomManager['rooms'].has(roomId) === false, 'Room evicted from memory cache');

  const reloadedRoom = agoraRoomManager.getRoom(roomId);
  assert(reloadedRoom !== null, 'Room must be reloaded from spider.db');
  assert(reloadedRoom.playbackPositionMs === 45000, 'Reloaded playback position matches');
  assert(reloadedRoom.hostUserId === 'user-sat-collector', 'Reloaded host matches');
  assert(reloadedRoom.isPlaying === true, 'Reloaded playback state matches');

  // Verify timetable retrieval from DB
  const reloadedSchedule = horaiScheduler.getRoomSchedule(roomId);
  assert(reloadedSchedule.length === 2, 'Reloaded timetable schedule length matches');
  assert(reloadedSchedule[0].title === 'Segment 1: Lightning Micropayments', 'Reloaded schedule title matches');
  console.log('   [PASS] Room and timetable reload from spider.db verified.');

  // 6. Cleanup room and schedule
  console.log('6. Cleaning up room and schedule...');
  horaiScheduler.clearRoomSchedule(roomId);
  const remainingTimetable = rawDb.prepare('SELECT * FROM agora_timetable WHERE room_id = ?').all(roomId);
  assert(remainingTimetable.length === 0, 'Timetable items deleted from DB on clearRoomSchedule');

  rawDb.close();
  console.log('   [PASS] Cleanup completed.');

  console.log('\n--- ALL SPIDER.DB PERSISTENCE TESTS PASSED ---');
}

run().catch(err => {
  console.error('spider.db persistence test failed:', err);
  process.exit(1);
});
