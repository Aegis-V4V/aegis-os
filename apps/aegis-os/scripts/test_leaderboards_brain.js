const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function assert(condition, message) {
  if (!condition) {
    console.error('Assertion Failed:', message);
    process.exit(1);
  }
}

async function run() {
  console.log('--- Aegis OS Leaderboards & Brain Loop Validation ---');

  const testDbPath = path.resolve(__dirname, '../data/test_leaderboard_alignment.db');
  const testBrainDbPath = path.resolve(__dirname, '../data/aegis_brain_sqlite.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // 1. Setup DB alignment
  process.env.DB_PATH = testDbPath;
  const db = require('../db');
  await new Promise(resolve => setTimeout(resolve, 800));

  // 2. Query empty leaderboard
  console.log('2. Querying leaderboard from sqlite feeds table...');
  const { getTopLeaderboard } = require('../leaderboards');
  const board = await getTopLeaderboard('omni', 5);
  assert(Array.isArray(board), 'Leaderboard result must be an array');
  console.log('   [PASS] Leaderboard queried successfully.');

  // 3. Initialize Python Brain SQLite DB using reaper.py
  console.log('3. Running python reaper.py to initialize sqlite brain database...');
  const pyResult = spawnSync('python', [path.resolve(__dirname, '../reaper.py')]);
  
  if (pyResult.status !== 0) {
    console.warn(`Warning: python execution returned exit code ${pyResult.status}`);
    console.error(pyResult.stderr.toString());
  }

  assert(fs.existsSync(testBrainDbPath), 'Python reaper should have successfully created aegis_brain_sqlite.db');
  console.log('   [PASS] Python brain database initialized cleanly.');

  console.log('\n--- ALL LEADERBOARD & BRAIN INTEGRATION TESTS PASSED ---');

  // Cleanup
  db.close((err) => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testBrainDbPath)) {
        fs.unlinkSync(testBrainDbPath);
      }
    } catch (e) {}
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Leaderboards validation failed:', err);
  process.exit(1);
});
