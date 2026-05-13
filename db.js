const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'spider.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // --- Core Podcast Data ---
        db.run(`CREATE TABLE IF NOT EXISTS feeds (
            id INTEGER PRIMARY KEY,
            podcast_index_id INTEGER UNIQUE,
            title TEXT,
            url TEXT,
            medium TEXT,
            score_v4v INTEGER DEFAULT 0,
            score_community INTEGER DEFAULT 0,
            score_technical INTEGER DEFAULT 0,
            omni_score INTEGER DEFAULT 0,
            last_checked DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY,
            podcast_index_id INTEGER UNIQUE,
            feed_id INTEGER,
            title TEXT,
            enclosure_url TEXT,
            timestamp DATETIME,
            FOREIGN KEY(feed_id) REFERENCES feeds(id)
        )`);

        // --- Community/Identity ---
        db.run(`CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY,
            name TEXT,
            href TEXT,
            role TEXT,
            group_name TEXT,
            feed_id INTEGER,
            episode_id INTEGER,
            FOREIGN KEY(feed_id) REFERENCES feeds(id),
            FOREIGN KEY(episode_id) REFERENCES episodes(id)
        )`);

        // --- V4V Economy ---
        db.run(`CREATE TABLE IF NOT EXISTS v4v_transactions (
            id INTEGER PRIMARY KEY,
            feed_id INTEGER,
            episode_id INTEGER,
            amount_sats INTEGER,
            lightning_node TEXT,
            recipient_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(feed_id) REFERENCES feeds(id),
            FOREIGN KEY(episode_id) REFERENCES episodes(id)
        )`);

        // --- The Assayer Wallet (Phase 4) ---
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            pubkey TEXT UNIQUE, -- LNURL pubkey
            email TEXT UNIQUE,
            password_hash TEXT,
            credit_balance_sats INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ledger_transactions (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            type TEXT, -- 'DEPOSIT' or 'VERIFICATION_FEE' or 'BOOST'
            provider TEXT, -- 'ALBY', 'STRIKE', 'INTERNAL'
            amount_sats INTEGER,
            reference_id TEXT, -- e.g. Strike invoice ID or Lightning payment hash
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        console.log("Database schema initialized.");
    });
}

module.exports = db;
