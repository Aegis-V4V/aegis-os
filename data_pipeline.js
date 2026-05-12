const { fetchFromIndex } = require('./api');
const db = require('./db');

async function syncTrendingPodcasts() {
    console.log("Fetching Top Trending Podcasts...");
    
    // Hit the trending endpoint. 'max' is the number to return. 
    // We can pull a large number, let's pull 100 for now to avoid timeout, up to 1000 later.
    const data = await fetchFromIndex('/podcasts/trending?max=100');
    
    if (data && data.status === 'true' && data.feeds) {
        console.log(`Received ${data.feeds.length} trending feeds. Syncing to DB...`);
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare(`
                INSERT INTO feeds (podcast_index_id, title, url, medium, last_checked) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(podcast_index_id) DO UPDATE SET 
                title=excluded.title, url=excluded.url, last_checked=CURRENT_TIMESTAMP
            `);

            data.feeds.forEach(feed => {
                // If medium is not provided in trending endpoint, default to podcast
                const medium = feed.medium || 'podcast';
                stmt.run(feed.id, feed.title, feed.url, medium);
            });

            stmt.finalize();
            db.run("COMMIT", () => {
                console.log("Trending feeds synced successfully.");
            });
        });
    } else {
        console.log("Failed to fetch trending podcasts.");
    }
}

async function syncRecentEpisodes() {
    console.log("Fetching Real-time Recent Episodes...");
    
    const data = await fetchFromIndex('/recent/episodes?max=50');
    
    if (data && data.status === 'true' && data.items) {
        console.log(`Received ${data.items.length} recent episodes. Syncing to DB...`);
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // First, ensure the feed exists (stub it if we don't have it)
            const feedStmt = db.prepare(`
                INSERT OR IGNORE INTO feeds (podcast_index_id, title, url, medium) 
                VALUES (?, ?, '', 'podcast')
            `);

            const epStmt = db.prepare(`
                INSERT INTO episodes (podcast_index_id, feed_id, title, enclosure_url, timestamp) 
                VALUES (
                    ?, 
                    (SELECT id FROM feeds WHERE podcast_index_id = ?), 
                    ?, ?, CURRENT_TIMESTAMP
                )
                ON CONFLICT(podcast_index_id) DO NOTHING
            `);

            data.items.forEach(ep => {
                feedStmt.run(ep.feedId, ep.feedTitle);
                epStmt.run(ep.id, ep.feedId, ep.title, ep.enclosureUrl);
            });

            feedStmt.finalize();
            epStmt.finalize();
            db.run("COMMIT", () => {
                console.log("Recent episodes synced successfully.");
            });
        });
    } else {
        console.log("Failed to fetch recent episodes.");
    }
}

// Run them if called directly
if (require.main === module) {
    (async () => {
        await syncTrendingPodcasts();
        await syncRecentEpisodes();
        
        // Give DB time to flush before exit
        setTimeout(() => process.exit(0), 1000);
    })();
}

module.exports = {
    syncTrendingPodcasts,
    syncRecentEpisodes
};
