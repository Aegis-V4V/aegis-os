const { fetchFromIndex } = require('./api');
const db = require('./db');

async function seedKnownFeeds() {
    console.log("Searching for known highly-compliant feeds...");

    const searches = ["Podcasting 2.0", "No Agenda", "Podping"];

    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT INTO feeds (podcast_index_id, title, url, medium, last_checked) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(podcast_index_id) DO UPDATE SET 
            title=excluded.title, url=excluded.url
        `);

        (async function processSearches() {
            for (let term of searches) {
                const data = await fetchFromIndex(`/search/byterm?q=${encodeURIComponent(term)}`);
                if (data && data.feeds && data.feeds.length > 0) {
                    const topHit = data.feeds[0];
                    console.log(`Found: [${topHit.title}] - ${topHit.url}`);
                    stmt.run(topHit.id, topHit.title, topHit.url, topHit.medium || 'podcast');
                }
            }
            stmt.finalize();
            console.log("\nKnown feeds seeded into database! You can now run the spider on them.");
        })();
    });
}

if (require.main === module) {
    seedKnownFeeds();
}
