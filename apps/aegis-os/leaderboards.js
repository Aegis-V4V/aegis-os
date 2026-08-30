const db = require('./db');

function getTopLeaderboard(track, limit = 10) {
    return new Promise((resolve, reject) => {
        let orderByClause = 'omni_score DESC';
        if (track === 'v4v') orderByClause = 'score_v4v DESC';
        if (track === 'community') orderByClause = 'score_community DESC';
        if (track === 'technical') orderByClause = 'score_technical DESC';

        const query = `
            SELECT podcast_index_id, title, url, medium, score_v4v, score_community, score_technical, omni_score 
            FROM feeds 
            ORDER BY ${orderByClause} 
            LIMIT ?
        `;

        db.all(query, [limit], (err, rows) => {
            if (err) {
                console.error(`Error fetching ${track} leaderboard:`, err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function generateAllTopLists() {
    console.log("=== THE SPIDER LEADERBOARDS ===");

    const topOmni = await getTopLeaderboard('omni', 5);
    console.log("\n🏆 TOP 5: PLATINUM OMNI-SCORE 🏆");
    topOmni.forEach((f, i) => console.log(`${i+1}. [${f.omni_score}] ${f.title} (V4V: ${f.score_v4v} | Com: ${f.score_community} | Tech: ${f.score_technical})`));

    const topV4V = await getTopLeaderboard('v4v', 5);
    console.log("\n⚡ TOP 5: V4V GOLD TRACK ⚡");
    topV4V.forEach((f, i) => console.log(`${i+1}. [${f.score_v4v}] ${f.title}`));

    const topCommunity = await getTopLeaderboard('community', 5);
    console.log("\n🤝 TOP 5: COMMUNITY GOLD TRACK 🤝");
    topCommunity.forEach((f, i) => console.log(`${i+1}. [${f.score_community}] ${f.title}`));

    // This will eventually scale to 1000
    console.log("\n(Lists currently limited to 5 for console readability. The API will serve up to Top 1000).");
}

if (require.main === module) {
    generateAllTopLists().then(() => {
        setTimeout(() => process.exit(0), 500);
    });
}

module.exports = {
    getTopLeaderboard
};
