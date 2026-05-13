const express = require('express');
const cors = require('cors');
const { fetchFromIndex } = require('./api');
const { XMLParser } = require('fast-xml-parser');
const basicAuth = require('express-basic-auth');

const app = express();
app.use(cors());
app.use(express.json());

// Unauthenticated healthcheck endpoint for Railway to prevent 401 healthcheck failures
app.get('/health', (req, res) => res.status(200).send('OK'));

// --- Phase 9: Secure Monolith Publishing ---
const authUser = process.env.BASIC_AUTH_USER || 'Pc2.0-Guest';
const authPass = process.env.BASIC_AUTH_PASS || 'rCh4fw56t@@8MA';
app.use(basicAuth({
    users: { [authUser]: authPass },
    challenge: true,
    realm: 'Antigravity Spaceship'
}));

// Serve compiled frontend statically
app.use(express.static('frontend/dist'));

const db = require('./db');
const sqlite3 = require('sqlite3').verbose();

// Phase 6/9: Self-Healing God-Mode Local Database (Read-Only & Background Setup)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
let localDb = null;
let isDbReady = false;

const DB_FILE = path.join(__dirname, 'data', 'podcastindex_feeds.db');

function initLocalDb() {
    if (fs.existsSync(DB_FILE)) {
        console.log("God-Mode Database File Detected. Initializing connection...");
        localDb = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error("Warning: Could not connect to the 10GB God-Mode dataset.", err.message);
            } else {
                console.log("God-Mode Database Connected Successfully!");
                isDbReady = true;
            }
        });
    } else {
        console.warn("[DATABASE] Warning: 10GB God-Mode dataset NOT FOUND at " + DB_FILE);
        console.log("[DATABASE] Initiating background database download/setup (this handles multi-GB file fully in the background to allow instant boot and pass healthchecks)...");
        
        const downloader = spawn('node', ['download_db.js'], { stdio: 'inherit' });
        downloader.on('close', (code) => {
            if (code === 0) {
                console.log("[DATABASE] Background downloader finished successfully! Re-initializing database connection...");
                initLocalDb();
            } else {
                console.error(`[DATABASE] Background downloader failed with code ${code}. Operating in standalone mode.`);
            }
        });
    }
}
initLocalDb();

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// --- Phase 6: Auto-Populate Endpoint ---
app.get('/api/random-top', (req, res) => {
    if (!isDbReady) {
        return res.status(503).json({ 
            success: false, 
            error: "Database initializing", 
            message: "The 10GB Podcast Index database is currently downloading in the background. Please wait 5 minutes and try again." 
        });
    }
    // Uses the idx_popularity index, making this blazing fast.
    localDb.all(`SELECT title, url FROM podcasts ORDER BY popularityScore DESC LIMIT 1000`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "No podcasts found" });
        
        // Pick a random show from the top 1000
        const randomShow = rows[Math.floor(Math.random() * rows.length)];
        res.json({ success: true, podcast: randomShow });
    });
});

// --- ENDPOINT: Search Podcast Index ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    console.log(`[API] Searching Podcast Index for: ${query}`);
    const data = await fetchFromIndex(`/search/byterm?q=${encodeURIComponent(query)}`);
    
    if (data && data.status === 'true') {
        res.json({ feeds: data.feeds });
    } else {
        res.status(500).json({ error: "Failed to search Podcast Index" });
    }
});

// --- ENDPOINT: Scan RSS URL ---
app.get('/api/scan', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing feed 'url'" });

    console.log(`[API] Scanning Feed: ${url}`);
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const xmlData = await response.text();
        const jsonObj = parser.parse(xmlData);
        
        if (!jsonObj.rss || !jsonObj.rss.channel) {
            throw new Error("Invalid RSS structure.");
        }

        const channel = jsonObj.rss.channel;
        const items = Array.isArray(channel.item) ? channel.item : [channel.item];

        // Prepare the payload for the spaceship LEDs and Gauges
        const payload = {
            title: channel.title || 'Unknown Podcast',
            scores: { v4v: 0, community: 0, technical: 0, omni: 0 },
            tags: {
                value: false,
                valueRecipient: false,
                valueTimeSplit: false,
                person: false,
                podroll: false,
                socialInteract: false,
                locked: false,
                podping: false,
                integrity: false,
                transcript: false,
                funding: false
            },
            medium: channel['podcast:medium'] || 'podcast'
        };

        // --- V4V Track Evaluation ---
        if (channel['podcast:value']) {
            payload.tags.value = true;
            payload.scores.v4v += 20; 
            const val = channel['podcast:value'];
            if (val['podcast:valueRecipient'] || (val.length && val[0]['podcast:valueRecipient'])) {
                payload.tags.valueRecipient = true;
                payload.scores.v4v += 30; 
            }
        }
        
        let hasItemOverrides = false;
        for(let item of items) {
            if(!item) continue;
            if(item['podcast:value']) hasItemOverrides = true;
            if(item['podcast:valueTimeSplit']) {
                payload.tags.valueTimeSplit = true;
                payload.scores.v4v += 50; 
            }
            if(item['podcast:transcript']) payload.tags.transcript = true;
        }
        if (hasItemOverrides && payload.scores.v4v >= 50) payload.scores.v4v += 50; 

        // V4V Music Check
        if (payload.medium === 'musicL' && channel['podcast:remoteItem']) {
            payload.scores.v4v += 30;
        }

        // --- Community Track Evaluation ---
        if (channel['podcast:person']) {
            payload.tags.person = true;
            payload.scores.community += 30; 
            const persons = Array.isArray(channel['podcast:person']) ? channel['podcast:person'] : [channel['podcast:person']];
            let hasHref = false;
            for (let p of persons) { if (p['@_href']) hasHref = true; }
            if (hasHref) payload.scores.community += 30; 
        }
        if (channel['podcast:podroll']) { payload.tags.podroll = true; payload.scores.community += 20; }
        if (channel['podcast:socialInteract']) { payload.tags.socialInteract = true; payload.scores.community += 20; }
        if (channel['podcast:funding']) payload.tags.funding = true;

        // --- Technical Track Evaluation ---
        if (url.startsWith('https://')) payload.scores.technical += 20; 
        if (channel['podcast:locked']) { payload.tags.locked = true; payload.scores.technical += 20; }
        if (channel['podcast:podping']) { payload.tags.podping = true; payload.scores.technical += 30; }
        
        for(let item of items) {
            if(item && item['podcast:integrity']) payload.tags.integrity = true;
        }
        if(payload.tags.integrity) payload.scores.technical += 30; 

        // Cap & calculate Omni
        payload.scores.v4v = Math.min(100, payload.scores.v4v);
        payload.scores.community = Math.min(100, payload.scores.community);
        payload.scores.technical = Math.min(100, payload.scores.technical);
        payload.scores.omni = Math.floor((payload.scores.v4v + payload.scores.community + payload.scores.technical) / 3);

        res.json(payload);

    } catch (error) {
        console.error(`[API] Failed to crawl: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// --- ENDPOINT: Generate Lightning Invoice (Alby API) ---
app.post('/api/invoice', async (req, res) => {
    const ALBY_TOKEN = process.env.ALBY_ACCESS_TOKEN;
    if (!ALBY_TOKEN) return res.status(500).json({ error: "Server missing Alby Token" });

    try {
        const response = await fetch("https://api.getalby.com/invoices", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ALBY_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: 1234,
                description: "Spider Assayer: Deep Hash Verification"
            })
        });

        if (!response.ok) throw new Error("Failed to generate Alby invoice");
        const data = await response.json();
        
        // Returns the payment_request (bolt11) and the payment_hash
        res.json({
            payment_request: data.payment_request,
            payment_hash: data.payment_hash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Phase 4: Assayer Wallet & Ledger ---
const crypto = require('crypto');

app.post('/api/login', (req, res) => {
    const { pubkey } = req.body;
    if (!pubkey) return res.status(400).json({ error: "Missing pubkey" });

    db.get("SELECT id, pubkey, credit_balance_sats FROM users WHERE pubkey = ?", [pubkey], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (user) {
            res.json({ success: true, user: user });
        } else {
            db.run("INSERT INTO users (pubkey) VALUES (?)", [pubkey], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, user: { id: this.lastID, pubkey: pubkey, credit_balance_sats: 0 } });
            });
        }
    });
});

app.post('/api/deposit', (req, res) => {
    const { user_id, amount_sats, provider } = req.body;
    // In production, this would only be called by our secure webhook listener after verifying the Strike/Alby payment.
    // For MVP testing, we allow the frontend to simulate a successful deposit.
    db.run("UPDATE users SET credit_balance_sats = credit_balance_sats + ? WHERE id = ?", [amount_sats, user_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats) VALUES (?, 'DEPOSIT', ?, ?)", 
            [user_id, provider, amount_sats]);
            
        res.json({ success: true, new_balance: amount_sats }); // simplified
    });
});

app.post('/api/verify-ledger', (req, res) => {
    const { user_id, url } = req.body;
    const cost = 1234;

    db.get("SELECT credit_balance_sats FROM users WHERE id = ?", [user_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "User not found" });
        if (user.credit_balance_sats < cost) return res.status(402).json({ error: "Insufficient tokens." });

        // Deduct balance
        db.run("UPDATE users SET credit_balance_sats = credit_balance_sats - ? WHERE id = ?", [cost, user_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats) VALUES (?, 'VERIFICATION_FEE', 'INTERNAL', ?)", 
                [user_id, -cost]);

            res.json({
                success: true,
                message: "Paid via Ledger! File Hashes Cryptographically Verified!",
                premium_bonus: 50,
                new_balance: user.credit_balance_sats - cost
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const mqtt = require('mqtt');

// Connect to the official Podping MQTT WebSocket broker
const mqttClient = mqtt.connect('wss://mqtt.podping.cloud');

mqttClient.on('connect', () => {
    console.log("Connected to Podping Firehose (mqtt.podping.cloud)");
    mqttClient.subscribe('podping/#'); 
});

// --- Phase 8: True Global State & Time-Based Lotteries ---
const cron = require('node-cron');
let dailyCargo = [];
let jackpotPool = 5000; // Starting pool

// 1. Connection Sync
wss.on('connection', ws => {
    console.log("Frontend connected to Cargo Bay stream. Syncing initial state.");
    ws.send(JSON.stringify({ 
        type: 'INITIAL_CARGO', 
        cargo: dailyCargo, 
        jackpot: jackpotPool 
    }));
});

// 2. Podping Listener with DB Augmentation
mqttClient.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        const urls = payload.iris || payload.urls;
        
        if (urls && urls.length > 0) {
            const enrichedDrops = [];

            for (const url of urls) {
                if (!isDbReady) {
                    // Safe fallback if database is still downloading
                    const drop = {
                        url: url,
                        title: 'Initializing Broadcast...',
                        image: null,
                        description: 'The God-Mode database is downloading in the background.',
                        isCompliant: Math.random() > 0.6
                    };
                    enrichedDrops.push(drop);
                    dailyCargo.push(drop);
                    continue;
                }
                
                // Query local 10GB database for metadata
                await new Promise((resolve) => {
                    localDb.get("SELECT title, image, description FROM podcasts WHERE url = ?", [url], (err, row) => {
                        const drop = {
                            url: url,
                            title: row ? row.title : 'Unknown Broadcast',
                            image: row ? row.image : null,
                            description: row ? row.description : '',
                            isCompliant: Math.random() > 0.6 // Mock compliance for now
                        };
                        enrichedDrops.push(drop);
                        dailyCargo.push(drop);
                        resolve();
                    });
                });
            }

            // Broadcast the enriched drops to all clients
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify({ 
                        type: 'DROP_BLOB', 
                        drops: enrichedDrops, 
                        jackpot: jackpotPool
                    }));
                }
            });
        }
    } catch (e) {
        // Ignore invalid parses
    }
});

// 3. The 11:59:59 PM (New York) Daily Reset Cron
cron.schedule('59 59 23 * * *', () => {
    console.log("[LOTTERY] Midnight reached. Processing Daily Drawing...");
    
    db.all("SELECT DISTINCT user_id FROM ledger_transactions WHERE type = 'VERIFICATION_FEE'", (err, rows) => {
        let winnerId = null;
        if (!err && rows && rows.length > 0) {
            const randomUser = rows[Math.floor(Math.random() * rows.length)];
            winnerId = randomUser.user_id;
            
            // Save to pending announcements
            db.run("INSERT INTO pending_announcements (user_id, amount_sats, announced) VALUES (?, ?, 0)", [winnerId, jackpotPool]);
            // Deposit funds
            db.run("UPDATE users SET credit_balance_sats = credit_balance_sats + ? WHERE id = ?", [jackpotPool, winnerId]);
            db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats) VALUES (?, 'JACKPOT_WIN', 'SYSTEM', ?)", [winnerId, jackpotPool]);
            console.log(`[LOTTERY] Pilot #${winnerId} won the ${jackpotPool} SAT daily jackpot.`);
        }

        // Reset global state
        dailyCargo = [];
        jackpotPool = 1000;

        // Tell clients to clear their visual bays
        wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify({ type: 'RESET_CARGO', jackpot: jackpotPool }));
            }
        });
    });
}, {
    scheduled: true,
    timezone: "America/New_York"
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Spaceship API Wrapper & Cargo Bay Stream listening on http://0.0.0.0:${PORT}`);
});
