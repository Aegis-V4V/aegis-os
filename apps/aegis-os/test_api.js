const { fetchFromIndex } = require('./api');

async function testAuth() {
    console.log("Testing Podcast Index API Authentication...");
    
    // Fetch recent episodes
    const data = await fetchFromIndex('/recent/episodes?max=5');
    
    if (data && data.status === 'true') {
        console.log("SUCCESS! Authenticated properly.");
        console.log(`Fetched ${data.items.length} recent episodes.`);
        data.items.forEach(item => {
            console.log(`- ${item.feedTitle} | ${item.title}`);
        });
    } else {
        console.log("FAILED to authenticate or fetch data.", data);
    }
}

testAuth();
