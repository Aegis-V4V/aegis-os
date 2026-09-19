const db = require('./db.js');
const sqlite3 = {
  OPEN_READWRITE: 0,
  OPEN_CREATE: 0,
  verbose: function() { return this; },
  Database: function() { return db; }
};
// AEGIS SCOUT | The Deep Index Explorer
// Low-priority, background harvester that finds the "weird" stuff in the index.

const axios = require('axios');
const { reapFeed } = require('./reaper');
const path = require('path');

// Connect to the local metadata cache to find "un-scanned" shows

/**
 * The Scout's Route: Pick a random show that hasn't been reaped yet.
 */
async function scoutNext() {
  console.log("[SCOUT] Scanning horizons for new intelligence...");
  
  metaDb.get("SELECT url FROM feeds ORDER BY RANDOM() LIMIT 1", async (err, row) => {
    if (err || !row) {
      console.warn("[SCOUT] No un-scanned feeds found in local cache.");
      return;
    }

    const url = row.url;
    console.log(`[SCOUT] Investigating deep-sector node: ${url}`);
    
    // Use the Reaper to process it (1 show per minute maximum)
    await reapFeed(url);
    
    // We'll add logic later to flag "Weird" content for the nightly cron
  });
}

/**
 * Initializes the Scout's duty cycle.
 */
function startScouting(intervalMinutes = 1) {
  console.log(`[SCOUT] Deployment verified. Interval: ${intervalMinutes}m`);
  setInterval(scoutNext, intervalMinutes * 60 * 1000);
}

module.exports = { startScouting, scoutNext };
