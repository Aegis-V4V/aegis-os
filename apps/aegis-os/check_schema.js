const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('podcastindex_feeds.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Tables:", tables.map(t => t.name));
    
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
            console.log(`\nSchema for ${table.name}:`);
            console.table(columns);
        });
    });
});
