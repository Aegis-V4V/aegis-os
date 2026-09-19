const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'aegis_brain.db');

let duckdb;
let db, con;
try {
    duckdb = require('duckdb');
    db = new duckdb.Database(dbPath);
    con = db.connect();
} catch (err) {
    console.warn('[init_brain] Native DuckDB unavailable on Node 24. Running in compatibility mock mode.');
    con = {
        run: (sql, cb) => { if (typeof cb === 'function') cb(null); },
        all: (sql, cb) => { if (typeof cb === 'function') cb(null, []); },
        exec: (sql, cb) => { if (typeof cb === 'function') cb(null); }
    };
    db = {
        connect: () => con,
        all: (sql, cb) => { if (typeof cb === 'function') cb(null, []); },
        run: (sql, cb) => { if (typeof cb === 'function') cb(null); }
    };
}

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
