// AEGIS BRAIN INITIALIZER
// Prepares the high-performance local analytical core (DuckDB).

const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'aegis_brain.db');

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const db = new duckdb.Database(dbPath);
const con = db.connect();

con.run(`
  CREATE TABLE IF NOT EXISTS stream_intelligence (
    id UUID PRIMARY KEY,
    url TEXT,
    title TEXT,
    baseline_score INTEGER,
    reaped_at TIMESTAMP,
    tags TEXT[],
    connections JSON
  )
`, (err) => {
  if (err) {
    console.error("[BRAIN] Initialization Failed:", err);
  } else {
    console.log("[BRAIN] Aegis Local Brain Initialized at:", dbPath);
    console.log("[BRAIN] Ready for high-performance Everything Search.");
  }
});

module.exports = { db, con };
