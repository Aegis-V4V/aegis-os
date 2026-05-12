const db = require('./db');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

async function crawlFeeds() {
    console.log("Spider is waking up...");

    db.all("SELECT id, url, title FROM feeds WHERE url IS NOT NULL AND url != '' ORDER BY id DESC LIMIT 20", async (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        for (const feed of rows) {
            console.log(`\nCrawling [${feed.title}]: ${feed.url}`);
            try {
                const response = await fetch(feed.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const xmlData = await response.text();
                const jsonObj = parser.parse(xmlData);
                
                if (!jsonObj.rss || !jsonObj.rss.channel) {
                    console.log("  -> Invalid RSS structure. Skipping.");
                    continue;
                }

                const channel = jsonObj.rss.channel;
                
                // Track Scores
                let scoreV4V = 0;
                let scoreCommunity = 0;
                let scoreTechnical = 0;

                // --- 1. V4V Track Evaluation ---
                if (channel['podcast:value']) {
                    scoreV4V += 20; // Bronze
                    
                    const val = channel['podcast:value'];
                    // Basic check for valid recipients (Silver)
                    if (val['podcast:valueRecipient'] || (val.length && val[0]['podcast:valueRecipient'])) {
                        scoreV4V += 30; // Silver
                    }
                }
                
                // Check items for Time Splits or overrides (Gold)
                let hasItemOverrides = false;
                const items = Array.isArray(channel.item) ? channel.item : [channel.item];
                for(let item of items) {
                    if(!item) continue;
                    if(item['podcast:value']) hasItemOverrides = true;
                    if(item['podcast:valueTimeSplit']) scoreV4V += 50; // Instant Gold bump
                }
                if (hasItemOverrides && scoreV4V >= 50) scoreV4V += 50; // Hit Gold 100

                // --- V4V Music Specific Verification ---
                const feedMedium = channel['podcast:medium'] || feed.medium;
                if (feedMedium === 'music' || feedMedium === 'musicL') {
                    // It's a music feed!
                    if (feedMedium === 'musicL' && channel['podcast:remoteItem']) {
                        scoreV4V += 30; // Bonus for musicL utilizing remoteItems
                        console.log("  -> [V4V MusicL Playlist Detected]");
                    } else if (feedMedium === 'music') {
                        console.log("  -> [V4V Music Album Detected]");
                    }
                }

                // --- 2. Community Track Evaluation ---
                if (channel['podcast:person']) {
                    scoreCommunity += 30; // Bronze
                    
                    const persons = Array.isArray(channel['podcast:person']) ? channel['podcast:person'] : [channel['podcast:person']];
                    let hasHref = false;
                    for (let p of persons) {
                        if (p['@_href']) hasHref = true;
                    }
                    if (hasHref) scoreCommunity += 30; // Silver
                }
                if (channel['podcast:podroll']) scoreCommunity += 20;
                if (channel['podcast:socialInteract']) scoreCommunity += 20; // Gold

                // --- 3. Technical Track Evaluation ---
                // We only check tags, NO media is downloaded!
                if (feed.url.startsWith('https://')) scoreTechnical += 20; // Bronze
                if (channel['podcast:locked']) scoreTechnical += 20; // Bronze+
                if (channel['podcast:podping']) scoreTechnical += 30; // Silver
                
                // Check for integrity hashes (just the tag, not the file)
                let hasIntegrity = false;
                for(let item of items) {
                    if(item && item['podcast:integrity']) hasIntegrity = true;
                }
                if(hasIntegrity) scoreTechnical += 30; // Gold

                // Cap scores at 100
                scoreV4V = Math.min(100, scoreV4V);
                scoreCommunity = Math.min(100, scoreCommunity);
                scoreTechnical = Math.min(100, scoreTechnical);
                
                let omniScore = Math.floor((scoreV4V + scoreCommunity + scoreTechnical) / 3);

                console.log(`  -> Scores | V4V: ${scoreV4V} | Community: ${scoreCommunity} | Tech: ${scoreTechnical} | OMNI: ${omniScore}`);

                // Update Database
                db.run(`UPDATE feeds SET 
                    score_v4v = ?, 
                    score_community = ?, 
                    score_technical = ?, 
                    omni_score = ?,
                    last_checked = CURRENT_TIMESTAMP
                    WHERE id = ?`, 
                    [scoreV4V, scoreCommunity, scoreTechnical, omniScore, feed.id]
                );

            } catch (error) {
                console.error(`  -> Failed to crawl: ${error.message}`);
            }
        }
        
        console.log("\nCrawl complete.");
    });
}

// Run if called directly
if (require.main === module) {
    crawlFeeds();
}

module.exports = { crawlFeeds };
