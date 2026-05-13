const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const DB_FILE = path.join(dataDir, 'podcastindex_feeds.db');
const TGZ_FILE = path.join(dataDir, 'podcastindex_feeds.db.tgz');
const DOWNLOAD_URL = 'https://public.podcastindex.org/podcastindex_feeds.db.tgz';

async function run() {
    console.log('[SETUP] Checking Podcast Index database...');
    
    if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        if (stats.size > 1000000000) { // > 1GB
            console.log('[SETUP] Database already exists and is intact. Skipping download.');
            return;
        }
        console.log('[SETUP] Database exists but seems corrupted or too small. Redownloading...');
    }

    console.log(`[SETUP] Downloading 1.7GB tarball from ${DOWNLOAD_URL}...`);
    console.log(`[SETUP] This may take a few minutes depending on network speed.`);

    const file = fs.createWriteStream(TGZ_FILE);
    
    await new Promise((resolve, reject) => {
        https.get(DOWNLOAD_URL, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${DOWNLOAD_URL}' (${response.statusCode})`));
                return;
            }

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;
            let lastLoggedPct = 0;

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const pct = Math.floor((downloadedBytes / totalBytes) * 100);
                if (pct % 10 === 0 && pct !== lastLoggedPct) {
                    console.log(`[SETUP] Downloading... ${pct}%`);
                    lastLoggedPct = pct;
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('[SETUP] Download finished.');
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(TGZ_FILE, () => {});
            reject(err);
        });
    });

    console.log('[SETUP] Extracting database using system tar...');
    try {
        // Execute extraction inside the data/ directory
        console.log(`[SETUP] Extracting inside ${dataDir}...`);
        execSync(`tar -xzvf podcastindex_feeds.db.tgz`, { cwd: dataDir });
        console.log('[SETUP] Extraction complete! Cleaning up archive...');
        
        if (fs.existsSync(TGZ_FILE)) {
            fs.unlinkSync(TGZ_FILE);
        }
        console.log('[SETUP] Database setup successfully.');
    } catch (err) {
        console.error('[SETUP] Extraction failed!', err);
        throw err;
    }
}

run().catch(err => {
    console.error('[SETUP] Setup encountered an error:', err);
    process.exit(1);
});
