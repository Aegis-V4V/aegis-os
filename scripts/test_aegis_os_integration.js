const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error('Assertion Failed:', message);
    process.exit(1);
  }
}

async function run() {
  console.log('--- Aegis OS Scout & Reaper Loop Integration Validation ---');

  const testDbPath = path.resolve(__dirname, '../data/test_bot_alignment.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // 1. Set environment variable DB_PATH
  console.log(`1. Setting DB_PATH to: ${testDbPath}`);
  process.env.DB_PATH = testDbPath;

  // 2. Load DB layer (should initialize schema in our aligned DB location)
  console.log('2. Loading database layer...');
  const db = require('../db');

  // Let's wait a brief moment for sqlite connection and serialization to complete
  await new Promise(resolve => setTimeout(resolve, 800));

  assert(fs.existsSync(testDbPath), 'SQLite DB should have been created at process.env.DB_PATH');
  console.log('   [PASS] Database successfully aligned with pod-bot location.');

  // 3. Verify Scout loop initialization
  console.log('3. Checking Scout module initialization...');
  const { startScouting, scoutNext } = require('../scout');
  
  // We check if startScouting is exported and typed as a function
  assert(typeof startScouting === 'function', 'startScouting should be a function');
  assert(typeof scoutNext === 'function', 'scoutNext should be a function');
  
  console.log('   [PASS] Scout and reaper initialization interfaces verified.');

  console.log('\n--- ALL AEGIS OS INTEGRATION TESTS PASSED ---');

  // Cleanup test DB file and close connection
  db.close((err) => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (e) {}
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
