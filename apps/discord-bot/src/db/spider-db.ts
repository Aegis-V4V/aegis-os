import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';

export interface AgoraListenerPersisted {
  userId: string;
  username: string;
  nostrPubkey?: string;
  walletAddress?: string;
  lastObservedPositionMs?: number;
}

export interface AgoraRoomPersisted {
  roomId: string;
  feedUrl: string;
  episodeGuid: string;
  episodeTitle: string;
  isPlaying: boolean;
  startedAt: number;
  listeners: AgoraListenerPersisted[];
  hostUserId: string | null;
  playbackPositionMs: number;
  playbackLastUpdatedAt: number;
  playbackRate: number;
}

export interface TimetableItemPersisted {
  id: string;
  title: string;
  feedUrl: string;
  episodeGuid: string;
  startTime: number;
  duration: number;
}

let spiderDbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function getSpiderDb(): DatabaseSync {
  const dbPath = process.env.SPIDER_DB_PATH || path.resolve(process.cwd(), 'data/spider.db');

  if (!spiderDbInstance || currentDbPath !== dbPath) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    spiderDbInstance = new DatabaseSync(dbPath);
    currentDbPath = dbPath;

    // Initialize Schema
    spiderDbInstance.exec(`
      CREATE TABLE IF NOT EXISTS agora_room_playback (
        room_id                  TEXT PRIMARY KEY,
        feed_url                 TEXT NOT NULL,
        episode_guid             TEXT NOT NULL,
        episode_title            TEXT NOT NULL,
        is_playing               INTEGER NOT NULL DEFAULT 0,
        started_at               INTEGER NOT NULL,
        host_user_id             TEXT,
        playback_position_ms     INTEGER NOT NULL DEFAULT 0,
        playback_last_updated_at INTEGER NOT NULL,
        playback_rate            REAL NOT NULL DEFAULT 1.0,
        listeners_json           TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS agora_timetable (
        id           TEXT NOT NULL,
        room_id      TEXT NOT NULL,
        title        TEXT NOT NULL,
        feed_url     TEXT NOT NULL,
        episode_guid TEXT NOT NULL,
        start_time   INTEGER NOT NULL,
        duration     INTEGER NOT NULL,
        PRIMARY KEY (room_id, id)
      );
    `);
  }

  return spiderDbInstance;
}

export function resetSpiderDb(): void {
  if (spiderDbInstance) {
    try {
      spiderDbInstance.close();
    } catch (_) {}
    spiderDbInstance = null;
    currentDbPath = null;
  }
}

/**
 * Persist room playback state into data/spider.db.
 */
export function persistRoomPlaybackState(room: AgoraRoomPersisted): void {
  const db = getSpiderDb();
  const stmt = db.prepare(`
    INSERT INTO agora_room_playback (
      room_id,
      feed_url,
      episode_guid,
      episode_title,
      is_playing,
      started_at,
      host_user_id,
      playback_position_ms,
      playback_last_updated_at,
      playback_rate,
      listeners_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET
      feed_url = excluded.feed_url,
      episode_guid = excluded.episode_guid,
      episode_title = excluded.episode_title,
      is_playing = excluded.is_playing,
      started_at = excluded.started_at,
      host_user_id = excluded.host_user_id,
      playback_position_ms = excluded.playback_position_ms,
      playback_last_updated_at = excluded.playback_last_updated_at,
      playback_rate = excluded.playback_rate,
      listeners_json = excluded.listeners_json
  `);

  stmt.run(
    room.roomId,
    room.feedUrl,
    room.episodeGuid,
    room.episodeTitle,
    room.isPlaying ? 1 : 0,
    room.startedAt,
    room.hostUserId,
    room.playbackPositionMs,
    room.playbackLastUpdatedAt,
    room.playbackRate,
    JSON.stringify(room.listeners || [])
  );
}

/**
 * Retrieve room playback state from data/spider.db.
 */
export function loadRoomPlaybackState(roomId: string): AgoraRoomPersisted | null {
  const db = getSpiderDb();
  const stmt = db.prepare(`
    SELECT
      room_id,
      feed_url,
      episode_guid,
      episode_title,
      is_playing,
      started_at,
      host_user_id,
      playback_position_ms,
      playback_last_updated_at,
      playback_rate,
      listeners_json
    FROM agora_room_playback
    WHERE room_id = ?
  `);

  const row = stmt.get(roomId) as any;
  if (!row) return null;

  let listeners: AgoraListenerPersisted[] = [];
  try {
    listeners = JSON.parse(row.listeners_json || '[]');
  } catch (_) {
    listeners = [];
  }

  return {
    roomId: row.room_id,
    feedUrl: row.feed_url,
    episodeGuid: row.episode_guid,
    episodeTitle: row.episode_title,
    isPlaying: Boolean(row.is_playing),
    startedAt: Number(row.started_at),
    listeners,
    hostUserId: row.host_user_id,
    playbackPositionMs: Number(row.playback_position_ms),
    playbackLastUpdatedAt: Number(row.playback_last_updated_at),
    playbackRate: Number(row.playback_rate),
  };
}

/**
 * Delete a room playback state from data/spider.db.
 */
export function removeRoomPlaybackState(roomId: string): void {
  const db = getSpiderDb();
  const stmt = db.prepare('DELETE FROM agora_room_playback WHERE room_id = ?');
  stmt.run(roomId);
}

/**
 * Retrieve all room playback states from data/spider.db.
 */
export function loadAllRoomPlaybackStates(): AgoraRoomPersisted[] {
  const db = getSpiderDb();
  const stmt = db.prepare(`
    SELECT
      room_id,
      feed_url,
      episode_guid,
      episode_title,
      is_playing,
      started_at,
      host_user_id,
      playback_position_ms,
      playback_last_updated_at,
      playback_rate,
      listeners_json
    FROM agora_room_playback
  `);

  const rows = stmt.all() as any[];
  return rows.map((row) => {
    let listeners: AgoraListenerPersisted[] = [];
    try {
      listeners = JSON.parse(row.listeners_json || '[]');
    } catch (_) {
      listeners = [];
    }

    return {
      roomId: row.room_id,
      feedUrl: row.feed_url,
      episodeGuid: row.episode_guid,
      episodeTitle: row.episode_title,
      isPlaying: Boolean(row.is_playing),
      startedAt: Number(row.started_at),
      listeners,
      hostUserId: row.host_user_id,
      playbackPositionMs: Number(row.playback_position_ms),
      playbackLastUpdatedAt: Number(row.playback_last_updated_at),
      playbackRate: Number(row.playback_rate),
    };
  });
}

/**
 * Persist an Agora timetable item into data/spider.db.
 */
export function persistTimetableItem(roomId: string, item: TimetableItemPersisted): void {
  const db = getSpiderDb();
  const stmt = db.prepare(`
    INSERT INTO agora_timetable (
      id,
      room_id,
      title,
      feed_url,
      episode_guid,
      start_time,
      duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id, id) DO UPDATE SET
      title = excluded.title,
      feed_url = excluded.feed_url,
      episode_guid = excluded.episode_guid,
      start_time = excluded.start_time,
      duration = excluded.duration
  `);

  stmt.run(
    item.id,
    roomId,
    item.title,
    item.feedUrl,
    item.episodeGuid,
    item.startTime,
    item.duration
  );
}

/**
 * Retrieve all Agora timetable items for a given room from data/spider.db.
 */
export function loadRoomTimetable(roomId: string): TimetableItemPersisted[] {
  const db = getSpiderDb();
  const stmt = db.prepare(`
    SELECT
      id,
      title,
      feed_url,
      episode_guid,
      start_time,
      duration
    FROM agora_timetable
    WHERE room_id = ?
    ORDER BY start_time ASC
  `);

  const rows = stmt.all(roomId) as any[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    feedUrl: row.feed_url,
    episodeGuid: row.episode_guid,
    startTime: Number(row.start_time),
    duration: Number(row.duration),
  }));
}

/**
 * Clear all Agora timetable items for a given room from data/spider.db.
 */
export function deleteRoomTimetable(roomId: string): void {
  const db = getSpiderDb();
  const stmt = db.prepare('DELETE FROM agora_timetable WHERE room_id = ?');
  stmt.run(roomId);
}
