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

        // --- Project Astrogation Mirror Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS podcast_metadata (
            id INTEGER PRIMARY KEY,
            feed_url TEXT UNIQUE,
            star_tier TEXT,
            star_coordinates TEXT, -- JSON representation of X,Y,Z
            verified_status INTEGER DEFAULT 0,
            platform_boosts INTEGER DEFAULT 0,
            last_scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS revenue_split_ledger (
            id INTEGER PRIMARY KEY,
            tx_id INTEGER,
            index_node_sats REAL,
            jackpot_sats REAL,
            house_sats REAL,
            total_sats INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tx_id) REFERENCES ledger_transactions(id)
        )`);

        // Persistent System Variables (e.g. Global Jackpot pool)
        db.run(`CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT
        )`, () => {
            // Initialize default jackpot of 0 SATS (Pure, non-fictional start)
            db.run("INSERT OR IGNORE INTO system_state (key, value) VALUES ('global_jackpot', '0')");
            // Migration: Safely reset any previous 5000 placeholder to 0
            db.run("UPDATE system_state SET value = '0' WHERE key = 'global_jackpot' AND value = '5000'");
        });

        console.log("Database schema initialized.");
    });
}

module.exports = db;
