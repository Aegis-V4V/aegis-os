const { fetchFromIndex } = require('./api');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

async function pollLandscape() {
    console.log("Starting Landscape Poller. Fetching 100 recent active feeds for statistical sampling...");

    const data = await fetchFromIndex('/recent/feeds?max=100');
    
    if (!data || !data.feeds) {
        console.error("Failed to fetch feeds for polling.");
        return;
    }

    const feeds = data.feeds;
    console.log(`Successfully fetched ${feeds.length} feeds. Spun up 100 crawler threads...\n`);

    const distribution = {
        omni: { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 },
        v4v: { '0': 0, '1-50': 0, '51-100': 0 },
        tags: { value: 0, person: 0, transcript: 0, locked: 0, integrity: 0 }
    };

    let processed = 0;

    for (let feed of feeds) {
        if (!feed.url) continue;

        try {
            // Add a tiny delay to not overwhelm the network if needed, but 100 parallel/sequential is fine
            const response = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) continue;
            
            const xmlData = await response.text();
            const jsonObj = parser.parse(xmlData);
            
            if (!jsonObj.rss || !jsonObj.rss.channel) continue;
            const channel = jsonObj.rss.channel;

            let sV = 0, sC = 0, sT = 0;

            // Track individual tag implementations for the report
            if (channel['podcast:value']) { distribution.tags.value++; sV += 50; }
            if (channel['podcast:person']) { distribution.tags.person++; sC += 50; }
            if (channel['podcast:transcript']) { distribution.tags.transcript++; sT += 20; }
            if (channel['podcast:locked']) { distribution.tags.locked++; sT += 20; }
            if (channel.item && channel.item.length && channel.item[0]['podcast:integrity']) { distribution.tags.integrity++; sT += 30; }
            if (feed.url.startsWith('https://')) sT += 20;

            sV = Math.min(100, sV);
            sC = Math.min(100, sC);
            sT = Math.min(100, sT);
            
            let omni = Math.floor((sV + sC + sT) / 3);

            // Tally Omni
            if (omni <= 20) distribution.omni['0-20']++;
            else if (omni <= 40) distribution.omni['21-40']++;
            else if (omni <= 60) distribution.omni['41-60']++;
            else if (omni <= 80) distribution.omni['61-80']++;
            else distribution.omni['81-100']++;

            // Tally V4V specifically
            if (sV === 0) distribution.v4v['0']++;
            else if (sV <= 50) distribution.v4v['1-50']++;
            else distribution.v4v['51-100']++;

            processed++;
            process.stdout.write(`\rAnalyzed: ${processed}/100...`);

        } catch (e) {
            // Timeout or parsing error, just skip
        }
    }

    console.log(`\n\n=== LANDSCAPE REPORT (Sample Size: ${processed}) ===`);
    console.log(`\nOMNI-SCORE DISTRIBUTION (The Bell Curve):`);
    for (const [range, count] of Object.entries(distribution.omni)) {
        const bar = '█'.repeat(Math.ceil((count / processed) * 50));
        console.log(`[${range.padStart(6)}] : ${count.toString().padStart(3)} | ${bar}`);
    }

    console.log(`\nV4V TRACK ADOPTION:`);
    console.log(`Zero V4V Tags    : ${distribution.v4v['0']} feeds`);
    console.log(`Partial V4V Tags : ${distribution.v4v['1-50']} feeds`);
    console.log(`Full V4V Tags    : ${distribution.v4v['51-100']} feeds`);

    console.log(`\nSPECIFIC NAMESPACE ADOPTION RATES:`);
    for (const [tag, count] of Object.entries(distribution.tags)) {
        const pct = ((count / processed) * 100).toFixed(1);
        console.log(`<podcast:${tag.padEnd(10)}> : ${count.toString().padStart(3)} feeds (${pct}%)`);
    }

    console.log("\nPoller complete. Weights calibration recommended based on these findings.");
}

pollLandscape();
