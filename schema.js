const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('podcastindex_feeds.db');

console.time('QueryTime');
db.all("SELECT title, url FROM podcasts ORDER BY popularityScore DESC LIMIT 10", (err, rows) => {
    console.timeEnd('QueryTime');
    if (err) console.error(err);
    else console.log(rows);
});
