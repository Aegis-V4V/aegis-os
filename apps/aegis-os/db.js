const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbFilePath = process.env.DB_PATH || path.join(dataDir, 'spider.db');

class NodeSqliteCompat {
    constructor(targetPath) {
        this.raw = new DatabaseSync(targetPath);
        console.log(`Connected to the SQLite database (node:sqlite native ABI 137).`);
        initDb(this);
    }

    serialize(callback) {
        if (typeof callback === 'function') callback();
    }

    run(sql, params = [], callback = () => {}) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        try {
            const stmt = this.raw.prepare(sql);
            const info = stmt.run(...params);
            callback.call({ lastID: Number(info.lastInsertRowid), changes: Number(info.changes) }, null);
        } catch (err) {
            callback(err);
        }
        return this;
    }

    get(sql, params = [], callback = () => {}) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        try {
            const stmt = this.raw.prepare(sql);
            const row = stmt.get(...params);
            callback(null, row);
        } catch (err) {
            callback(err);
        }
        return this;
    }

    all(sql, params = [], callback = () => {}) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        try {
            const stmt = this.raw.prepare(sql);
            const rows = stmt.all(...params);
            callback(null, rows || []);
        } catch (err) {
            callback(err);
        }
        return this;
    }

    close(callback = () => {}) {
        try {
            this.raw.close();
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
}

const db = new NodeSqliteCompat(dbFilePath);

function initDb(databaseInstance) {
    databaseInstance.run(`CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        podcast_index_id INTEGER UNIQUE,
        title TEXT,
        url TEXT,
        original_url TEXT,
        link TEXT,
        description TEXT,
        author TEXT,
        image TEXT,
        artwork TEXT,
        newest_item_pub_date INTEGER,
        itunes_id INTEGER,
        trend_score REAL,
        language TEXT,
        categories TEXT,
        score_technical REAL DEFAULT 0.0,
        omni_score REAL DEFAULT 0.0,
        value_model TEXT,
        score_quality REAL DEFAULT 0.0,
        score_speed REAL DEFAULT 0.0,
        score_overall REAL DEFAULT 0.0,
        score_v4v REAL DEFAULT 0.0,
        score_community REAL DEFAULT 0.0,
        medium TEXT DEFAULT 'podcast',
        generator TEXT,
        value_block TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    databaseInstance.run(`CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER,
        title TEXT,
        link TEXT,
        guid TEXT UNIQUE,
        pub_date INTEGER,
        enclosure_url TEXT,
        enclosure_type TEXT,
        enclosure_length INTEGER,
        duration INTEGER,
        value_block TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(feed_id) REFERENCES feeds(id)
    )`);

    databaseInstance.run(`CREATE TABLE IF NOT EXISTS value_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER,
        episode_id INTEGER,
        name TEXT,
        type TEXT,
        address TEXT,
        split INTEGER,
        fee INTEGER DEFAULT 0,
        custom_key TEXT,
        custom_value TEXT,
        FOREIGN KEY(feed_id) REFERENCES feeds(id),
        FOREIGN KEY(episode_id) REFERENCES episodes(id)
    )`);
}

module.exports = db;
