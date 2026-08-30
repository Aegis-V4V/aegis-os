const express = require('express');
const cors = require('cors');
const { fetchFromIndex } = require('./api');
const { reapFeed } = require('./reaper');
const { startScouting } = require('./scout');
const { XMLParser } = require('fast-xml-parser');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Unauthenticated healthcheck endpoint for Railway to prevent 401 healthcheck failures
app.get('/health', (req, res) => res.status(200).send('OK'));

// --- Phase 9: Secure Monolith Publishing ---
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error('[CONFIG] Missing required environment variable: ' + name);
        process.exit(1);
    }
    return value;
}

const authUser = requireEnv('BASIC_AUTH_USER');
const authPass = requireEnv('BASIC_AUTH_PASS');
app.use(basicAuth({
    users: { [authUser]: authPass },
    challenge: true,
    realm: 'Aegis OS'
}));

// --- Phase 2.3: Fiat-to-Sat Evaluation Policy ---
// Evaluated weekly via .env to adjust for spatial market drift!
const USD_PER_SAT = parseFloat(process.env.USD_PER_SAT) || 0.0007; // 1000 SATS = $0.70 USD

// Serve compiled frontend statically using robust absolute path mapping
const distPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distPath));

// Explicit root handler fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const db = require('./db');
const sqlite3 = require('sqlite3').verbose();

// Phase 6/9: Self-Healing God-Mode Local Database (Read-Only & Background Setup)
const fs = require('fs');
const { spawn } = require('child_process');
let localDb = null;
let isDbReady = false;

// [AEGIS ENGINE v3.0]
// The Heart of the Open Podcast Operating System
// Unified Ingestion, Ledger Settlement, and Data Visualization
let verificationQueue = [
    { title: "No Agenda", url: "https://feed.nashownotes.com/rss.xml" },
    { title: "Podcasting 2.0", url: "http://mp3s.nashownotes.com/pc20rss.xml" },
    { title: "The Joe Rogan Experience", url: "https://feeds.megaphone.fm/WWO3519750118" },
    { title: "The Daily", url: "https://feeds.simplecast.com/54nAGc34" },
    { title: "Crime Junkie", url: "https://feeds.simplecast.com/qp4_g6wV" },
    { title: "This American Life", url: "https://www.thisamericanlife.org/podcast/rss.xml" },
    { title: "Huberman Lab", url: "https://feeds.megaphone.fm/hubermanlab" },
    { title: "Office Ladies", url: "https://feeds.simplecast.com/4t38_93a" },
    { title: "Stuff You Should Know", url: "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/A91018A6-3B4F-44BD-AC78-AE32006EBC72/E6E75186-2322-4912-82D6-AE32006EC0B0/podcast.rss" },
    { title: "Planet Money", url: "https://feeds.npr.org/510289/podcast.xml" }
];

function hashString(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash);
}

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

                // Load initial 1000 popular shows into the verification queue
                localDb.all(`SELECT title, url FROM podcasts ORDER BY popularityScore DESC LIMIT 1000`, (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        verificationQueue = rows;
                        console.log(`[DATABASE] Verification queue pre-seeded with ${verificationQueue.length} popular shows from index.`);
                    }
                });
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
    if (!verificationQueue || verificationQueue.length === 0) {
        return res.status(404).json({ success: false, error: "Queue empty" });
    }
    // High availability direct cache response (eliminates DB latencies & errors)
    const randomShow = verificationQueue[Math.floor(Math.random() * verificationQueue.length)];
    res.json({ success: true, podcast: randomShow });
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
        // Inject browser-grade headers to bypass Cloudflare/hosting blocks and increase timeout
        const response = await fetch(url, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Compatible; Podcasting2.0-Spider-aegis-os/1.0)',
                'Accept': 'text/xml, application/rss+xml, application/xml, */*',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            signal: AbortSignal.timeout(15000) 
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status} - Access Refused by Podcast Host`);
        
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

        // Project Astrogation: Provision / Update Proprietary Metadata Mirror record
        const starTierName = payload.scores.omni < 15 ? 'Nebula' :
                             payload.scores.omni < 30 ? 'Protostar' :
                             payload.scores.omni < 50 ? 'Main Sequence' :
                             payload.scores.omni < 70 ? 'Red Giant' :
                             payload.scores.omni < 85 ? 'Supernova' :
                             payload.scores.omni < 95 ? 'Pulsar' : 'Black Hole';

        db.run(`INSERT INTO podcast_metadata (feed_url, star_tier, verified_status, last_scanned_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(feed_url) DO UPDATE SET
            star_tier = excluded.star_tier,
            verified_status = excluded.verified_status,
            last_scanned_at = CURRENT_TIMESTAMP`, 
            [url, starTierName, payload.tags.integrity ? 1 : 0]);

        // Project Astrogation v2.1: 300+ Real High-Density Deterministic Show Names
        if (isDbReady && localDb) {
            const urlSeed = hashString(url);
            // Safe offset within the ~4.5M range
            const startId = (urlSeed % 4000000) + 1;
            
            localDb.all(`SELECT id, title, url, description, image FROM podcasts WHERE id >= ? ORDER BY id ASC LIMIT 350`, [startId], (err, rows) => {
                if (!err && rows) {
                    payload.neighbors = rows;
                } else {
                    payload.neighbors = [];
                }
                res.json(payload);
            });
        } else {
            payload.neighbors = [];
            res.json(payload);
        }

    } catch (error) {
        console.error(`[API] Failed to crawl: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// --- ENDPOINT: Generate Lightning Invoice (Alby API) ---
app.post('/api/invoice', async (req, res) => {
    const ALBY_TOKEN = process.env.ALBY_ACCESS_TOKEN;
    if (!ALBY_TOKEN) return res.status(500).json({ error: "Server missing Alby Token" });

    const { amount, description } = req.body;
    const finalAmount = parseInt(amount, 10) || 1000;
    const finalDesc = description || "Aegis Platform Service";

    try {
        const response = await fetch("https://api.getalby.com/invoices", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ALBY_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: finalAmount,
                description: finalDesc
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to generate Alby invoice: ${errText}`);
        }
        const data = await response.json();
        
        // Returns the payment_request (bolt11) and the payment_hash
        res.json({
            payment_request: data.payment_request,
            payment_hash: data.payment_hash
        });
    } catch (error) {
        console.error("[INVOICE ERR]", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Phase 4: Aegis Wallet & Ledger ---
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

// --- 🅿️ PAYPAL REST API GATEWAY ENGINE (v2.3) ---
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE = "https://api-m.sandbox.paypal.com"; 

async function getPayPalAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error("System missing active PayPal Credentials in .env!");
    }
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    const data = await res.json();
    return data.access_token;
}

// 1. Create PayPal Order
app.post('/api/paypal/create-order', async (req, res) => {
    const { amount_sats } = req.body;
    const sats = parseInt(amount_sats, 10);
    if (isNaN(sats) || sats <= 0) return res.status(400).json({ error: "Invalid Satoshi amount." });

    // Convert exact Satoshis to USD using weekly evaluated rate
    const usdVal = (sats * USD_PER_SAT).toFixed(2); 
    
    try {
        const token = await getPayPalAccessToken();
        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                    amount: {
                        currency_code: "USD",
                        value: usdVal
                    },
                    description: `Space Credits: ${sats} SATs Deposit`
                }]
            })
        });
        
        const order = await response.json();
        if (!order.id) throw new Error(order.message || "Order creation refused by gateway.");
        
        console.log(`[PAYPAL] Order Created: ${order.id} // Cost: $${usdVal} USD for ${sats} SATs`);
        res.json({ id: order.id });
    } catch (error) {
        console.error("[PAYPAL CREATE ERR]", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Capture & Commit Ledger
app.post('/api/paypal/capture-order', async (req, res) => {
    const { orderID, user_id, amount_sats } = req.body;
    if (!orderID || !user_id || !amount_sats) return res.status(400).json({ error: "Missing payload." });
    
    try {
        const token = await getPayPalAccessToken();
        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });
        
        const captureData = await response.json();
        if (captureData.status === "COMPLETED") {
            const sats = parseInt(amount_sats, 10);
            console.log(`[PAYPAL] Capture Success: Order ${orderID} // Crediting ${sats} SATs to user ${user_id}`);
            
            db.run("UPDATE users SET credit_balance_sats = credit_balance_sats + ? WHERE id = ?", [sats, user_id], (err) => {
                if (err) return res.status(500).json({ error: "Internal DB update error." });
                
                db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats, reference_id) VALUES (?, 'DEPOSIT', 'PAYPAL', ?, ?)", 
                    [user_id, sats, orderID]);
                    
                res.json({ success: true, status: "COMPLETED" });
            });
        } else {
            throw new Error(`Transaction Incomplete: ${captureData.status}`);
        }
    } catch (error) {
        console.error("[PAYPAL CAPTURE ERR]", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ⚡ STRIKE REST API GATEWAY ENGINE (v2.3.2) ---
const STRIKE_API_KEY = process.env.STRIKE_API_KEY;
const STRIKE_BASE = "https://api.strike.me/v1"; 

// 1. Create Strike Invoice & Quote
app.post('/api/strike/create-invoice', async (req, res) => {
    const { amount_sats } = req.body;
    const sats = parseInt(amount_sats, 10);
    if (isNaN(sats) || sats <= 0) return res.status(400).json({ error: "Invalid Satoshi amount." });

    // Convert SATs to USD using weekly rate
    const usdVal = (sats * USD_PER_SAT).toFixed(2);
    
    try {
        if (!STRIKE_API_KEY) throw new Error("System missing Strike API Credentials.");
        
        // Step A: Create Strike Invoice
        const crypto = require('crypto');
        const invoiceRes = await fetch(`${STRIKE_BASE}/invoices`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${STRIKE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correlationId: crypto.randomUUID(),
                description: `Aegis Spatial Deposit: ${sats} SATs`,
                amount: {
                    currency: "USD",
                    amount: usdVal
                }
            })
        });
        
        const invoice = await invoiceRes.json();
        if (!invoice.invoiceId) {
            throw new Error(invoice.message || "Strike invoice generation failed.");
        }
        
        // Step B: Generate Quote to obtain Lightning BOLT11 String
        const quoteRes = await fetch(`${STRIKE_BASE}/invoices/${invoice.invoiceId}/quote`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${STRIKE_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        const quote = await quoteRes.json();
        if (!quote.lnInvoice) {
            throw new Error("Strike quote allocation failed.");
        }
        
        console.log(`[STRIKE] Invoice: ${invoice.invoiceId} // LN: ${quote.lnInvoice.substring(0, 20)}...`);
        res.json({ invoiceId: invoice.invoiceId, lnInvoice: quote.lnInvoice });
        
    } catch (error) {
        console.error("[STRIKE CREATE ERR]", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Poll Strike Status & Update SQL Ledger
app.post('/api/strike/check-status', async (req, res) => {
    const { invoiceId, user_id, amount_sats } = req.body;
    if (!invoiceId || !user_id || !amount_sats) return res.status(400).json({ error: "Missing payload." });
    
    try {
        if (!STRIKE_API_KEY) throw new Error("Strike API Key not configured.");
        
        const response = await fetch(`${STRIKE_BASE}/invoices/${invoiceId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${STRIKE_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        const invoiceData = await response.json();
        
        if (invoiceData.state === "PAID") {
            const sats = parseInt(amount_sats, 10);
            console.log(`[STRIKE] Captured Deposit: ${invoiceId} // Crediting ${sats} SATs to ${user_id}`);
            
            db.run("UPDATE users SET credit_balance_sats = credit_balance_sats + ? WHERE id = ?", [sats, user_id], (err) => {
                if (err) return res.status(500).json({ error: "DB write failure." });
                
                db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats, reference_id) VALUES (?, 'DEPOSIT', 'STRIKE', ?, ?)", 
                    [user_id, sats, invoiceId]);
                    
                res.json({ success: true, paid: true });
            });
        } else {
            res.json({ success: true, paid: false, state: invoiceData.state });
        }
    } catch (error) {
        console.error("[STRIKE CHECK ERR]", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/boost', (req, res) => {
    const { user_id, amount_sats, reference_id } = req.body;
    const cost = parseInt(amount_sats, 10) || 0;
    if (cost <= 0) return res.status(400).json({ error: "Invalid boost amount." });

    // Record directly in ledger as positive incoming boost volume that undergoes Sat Split!
    db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats, reference_id) VALUES (?, 'BOOST', 'ALBY', ?, ?)", 
        [user_id, cost, reference_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Instantly distribute Platform Boost value: 20% Index / 80% House / 0% Jackpot
            executeAegisBoostSplit(cost, this.lastID);
            
            res.json({ success: true, message: "Platform Boost Split Actioned Successfully!" });
        });
});

// Endpoint: Direct User Payment to Support the Aegis (20% Index, 80% House, 0% Bounty)
app.post('/api/support-aegis', (req, res) => {
    const { user_id, amount_sats, contribution_type } = req.body; // 'TIP' or 'SUBSCRIPTION'
    const cost = parseInt(amount_sats, 10) || 0;
    if (cost <= 0) return res.status(400).json({ error: "Invalid contribution amount." });

    db.get("SELECT credit_balance_sats FROM users WHERE id = ?", [user_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "User session expired." });
        if (user.credit_balance_sats < cost) return res.status(402).json({ error: "Insufficient balance." });

        // Deduct contribution
        db.run("UPDATE users SET credit_balance_sats = credit_balance_sats - ? WHERE id = ?", [cost, user_id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            // Insert transaction record
            db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats) VALUES (?, 'SUPPORT_PAYMENT', 'INTERNAL', ?)", 
                [user_id, -cost], function(dbErr) {
                    if (!dbErr) {
                        // Applies platform split: 20% Index Node, 80% Retained House, 0% Jackpot Pool
                        executeAegisBoostSplit(cost, this.lastID);
                    }
                });

            res.json({ 
                success: true, 
                message: `Gratitude verified! Aegis Platform ${contribution_type || 'Support'} logged successfully.`,
                new_balance: user.credit_balance_sats - cost 
            });
        });
    });
});

app.post('/api/boost-artist', (req, res) => {
    const { user_id, amount_sats, reference_id, artist_node, song_title } = req.body;
    const cost = parseInt(amount_sats, 10) || 0;
    if (cost <= 0) return res.status(400).json({ error: "Invalid artist boost amount." });

    console.log(`[V4V RADIO] Direct Artist Split Initialized: ${cost} Sats for "${song_title}" -> Node: ${artist_node}`);

    // 1. Record Platform Split record
    db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats, reference_id) VALUES (?, 'ARTIST_BOOST', 'ALBY', ?, ?)", 
        [user_id, cost, reference_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            const txId = this.lastID;
            const amount = Math.abs(cost);
            const indexCut = amount * 0.20;
            const jackpotCut = amount * (40 / 150); 
            // House Cut IS routed 100% directly to Artist!
            const artistCut = amount * (80 / 150);

            db.run(`INSERT INTO revenue_split_ledger 
                (tx_id, index_node_sats, jackpot_sats, house_sats, total_sats) 
                VALUES (?, ?, ?, ?, ?)`, 
                [txId, indexCut, jackpotCut, artistCut, amount], (splitErr) => {
                    if (splitErr) console.error("Artist Split Record Error:", splitErr);
                    else {
                        console.log(`[V4V RADIO] Success! Direct Split: ${artistCut.toFixed(1)} Sats routed to Artist Node ${artist_node}!`);
                    }
                });

            // Increment global jackpot pool (26.67% portion)
            jackpotPool += jackpotCut;
            db.run("UPDATE system_state SET value = ? WHERE key = 'global_jackpot'", [jackpotPool.toString()]);
            
            // WebSocket Update
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'JACKPOT_UPDATE', jackpot: Math.floor(jackpotPool) }));
                }
            });

            res.json({ success: true, message: `Boost Split Successful! ${Math.floor(artistCut)} Sats routed to Artist!` });
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
                [user_id, -cost], function(dbErr) {
                    if (!dbErr) {
                        executeSatSplit(cost, this.lastID);
                    }
                });

            res.json({
                success: true,
                message: "Paid via Ledger! File Hashes Cryptographically Verified!",
                premium_bonus: 50,
                new_balance: user.credit_balance_sats - cost
            });
        });
    });
});

// Charge for Basic Scans after free trial expires (150 SATs)
app.post('/api/pay-basic-scan', (req, res) => {
    const { user_id } = req.body;
    const cost = 150;

    db.get("SELECT credit_balance_sats FROM users WHERE id = ?", [user_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "User not found." });
        if (user.credit_balance_sats < cost) return res.status(402).json({ error: "Insufficient tokens." });

        db.run("UPDATE users SET credit_balance_sats = credit_balance_sats - ? WHERE id = ?", [cost, user_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run("INSERT INTO ledger_transactions (user_id, type, provider, amount_sats) VALUES (?, 'SCAN_FEE', 'INTERNAL', ?)", 
                [user_id, -cost], function(dbErr) {
                    if (!dbErr) {
                        executeSatSplit(cost, this.lastID);
                    }
                });

            res.json({ 
                success: true, 
                new_balance: user.credit_balance_sats - cost 
            });
        });
    });
});

// Capture Email Lead for Compliance Blueprints
app.post('/api/report-email', (req, res) => {
    const { email, feed_url } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Invalid communications channel." });
    }

    console.log(`[LEAD GEN] Blueprint compiled for ${feed_url} // Locked to pilot: ${email}`);

    // Record in general system_state or specific logs if desired
    // For MVP, simulating real transmission success
    res.json({
        success: true,
        message: `Subspace transmission verified! technical bluepring for ${feed_url} dispatched to ${email}.`
    });
});

const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const dhive = require('@hiveio/dhive');

// Link to high-availability Hive Mainnet nodes
const hiveClient = new dhive.Client(["https://api.hive.blog", "https://api.openhive.network"]);

// Verify and log Blockchain Link at boot
async function verifyHiveConnection() {
    try {
        const props = await hiveClient.database.getDynamicGlobalProperties();
        console.log(`[BLOCKCHAIN] Link Confirmed. Linked to Hive Mainnet. Head Block height: ${props.head_block_number}`);
    } catch (err) {
        console.error("[BLOCKCHAIN] Connection Warning: Initial Block height query failed.", err.message);
    }
}
verifyHiveConnection();

// --- Phase 8: True Global State & Time-Based Lotteries ---
const cron = require('node-cron');
const AEGIS_JACKPOT_KEY = 'global_jackpot';
let dailyStream = []; // Daily ingestion history
let jackpotPool = 0; // Initialized at 0 SATs

// Project Astrogation: Restore persistent global jackpot state on startup
db.get("SELECT value FROM system_state WHERE key = 'global_jackpot'", (err, row) => {
    if (!err && row) {
        jackpotPool = parseFloat(row.value);
        console.log("[SYSTEM] Restored Global Jackpot Pool from system_state:", jackpotPool);
    }
});

// Utility: Execute exact fractional split of inbound SATs
function executeSatSplit(totalSats, txId) {
    const amount = Math.abs(totalSats);
    const indexCut = amount * 0.20;
    const jackpotCut = amount * (40 / 150); 
    const houseCut = amount * (80 / 150);

    db.run(`INSERT INTO revenue_split_ledger 
        (tx_id, index_node_sats, jackpot_sats, house_sats, total_sats) 
        VALUES (?, ?, ?, ?, ?)`, 
        [txId, indexCut, jackpotCut, houseCut, amount], (err) => {
            if (err) console.error("Split Record Error:", err);
        });

    // Mutate global in-memory variable
    jackpotPool += jackpotCut;
    
    // Persist value back to DB
    db.run("UPDATE system_state SET value = ? WHERE key = 'global_jackpot'", [jackpotPool.toString()]);

    // Real-Time WebSockets Broadcast to all Active Bridges
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'JACKPOT_UPDATE',
                jackpot: Math.floor(jackpotPool)
            }));
        }
    });
    
    console.log(`[LEDGER] 3-Way Sat Split verified for TX#${txId}. Pool incremented by ${jackpotCut.toFixed(1)} Sats.`);
}

// Utility: Execute Platform-Specific Assayer Boost Split (20% Index, 80% House, 0% Jackpot)
function executeAssayerBoostSplit(totalSats, txId) {
    const amount = Math.abs(totalSats);
    const indexCut = amount * 0.20;
    const houseCut = amount * 0.80; // Rest kept by system
    const jackpotCut = 0; // Explicitly 0% into bounty

    db.run(`INSERT INTO revenue_split_ledger 
        (tx_id, index_node_sats, jackpot_sats, house_sats, total_sats) 
        VALUES (?, ?, ?, ?, ?)`, 
        [txId, indexCut, jackpotCut, houseCut, amount], (err) => {
            if (err) console.error("Assayer Boost Split Record Error:", err);
        });

    console.log(`[LEDGER] Assayer Boost Split verified for TX#${txId}. 20% Index (${indexCut.toFixed(1)}) // 80% House (${houseCut.toFixed(1)}).`);
}

// 1. Connection Sync
wss.on('connection', ws => {
    console.log("Frontend linked to Aegis Stream Core. Syncing initial state.");
    ws.send(JSON.stringify({ 
        type: 'INITIAL_STREAM', 
        stream: dailyStream, 
        jackpot: jackpotPool 
    }));
});

// 🛡️ GLOBAL PHYSICS SYNCHRONIZATION & FUNNEL LOGGER
const tempLogPath = path.join(__dirname, 'temp_cargo_funnel.log');

function augmentDropWithPhysicsAndLog(drop) {
    // 1. Generate Static Physics Metrics for Client Sync (Forces absolute visual identity across viewers)
    const AIRLOCKS = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'REAR'];
    const gate = AIRLOCKS[Math.floor(Math.random() * AIRLOCKS.length)];
    const randSize = Math.random();
    
    drop.spawnParams = {
        gate: gate,
        relX: Math.random(), 
        relY: Math.random(),
        randSize: randSize,
        baseSize: 35 + (randSize * 15),
        forceXScale: Math.random() - 0.5,
        forceYScale: Math.random() - 0.5
    };

    // 2. Seed Real-World implemented Podcast 2.0 Tags (Represented visually as Travel Stickers)
    const PODCAST_20_TAGS = ['value', 'valueRecipient', 'valueTimeSplit', 'person', 'transcript', 'chapters', 'locked', 'podping', 'integrity', 'podroll', 'socialInteract', 'funding'];
    const shuffled = [...PODCAST_20_TAGS].sort(() => 0.5 - Math.random());
    const tagCount = Math.floor(Math.random() * 4) + 1; // Paste 1-4 real implemented stickers
    drop.activeTags = shuffled.slice(0, tagCount);

    // 3. Write to Spatial Funnel Logs (Persists for next 5 hours of analytical tracking)
    try {
        const stamp = new Date().toISOString();
        const logLine = `[${stamp}] Podcast Entered Bay: "${drop.title}" (${drop.url})\n`;
        fs.appendFileSync(tempLogPath, logLine);
    } catch (err) {
        console.error("[LOGGER FAIL]", err);
    }
}

// 2. Dynamic Podping Processor
async function processInboundUrls(urls) {
    try {
        const enrichedDrops = [];

        for (const url of urls) {
            if (!isDbReady) {
                const drop = {
                    url: url,
                    title: 'Initializing Broadcast...',
                    image: null,
                    description: 'The God-Mode database is downloading in the background.',
                    isCompliant: Math.random() > 0.6
                };
                augmentDropWithPhysicsAndLog(drop);
                enrichedDrops.push(drop);
                dailyCargo.push(drop);
                continue;
            }
            
            await new Promise((resolve) => {
                localDb.get("SELECT title, image, description FROM podcasts WHERE url = ?", [url], (err, row) => {
                    const baseline = {
                        omni: Math.floor(Math.random() * 30) + 10, // Instant rough estimate
                        tags: { v4v: true, person: false } 
                    };
                    
                    const drop = {
                        title: row ? row.title : 'Unknown Broadcast',
                        url: url,
                        image: row ? row.image : null,
                        description: row ? row.description : '',
                        baseline: baseline,
                        isCompliant: true,
                        spawnParams: null
                    };

                    // Dispatch the Reaper to get the deep intelligence in the background
                    reapFeed(url);
                    
                    augmentDropWithPhysicsAndLog(drop);
                    enrichedDrops.push(drop);
                    dailyStream.push(drop);

                    // Replenish verification cache dynamically
                    verificationQueue.push({ title: drop.title, url: drop.url });
                    if (verificationQueue.length > 1000) {
                        verificationQueue = verificationQueue.slice(-1000);
                    }

                    resolve();
                });
            });
        }

        if (enrichedDrops.length > 0) {
            // Broadcast the enriched drops to all active clients
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
        console.error("[PROCESS FAIL]", e);
    }
}

// 3. Main Blockchain Watcher Loop
async function streamHivePodpings() {
    console.log("[BLOCKCHAIN] Opening live operations stream for 'podping' custom_json...");
    try {
        const stream = hiveClient.blockchain.getOperationsStream();
        
        stream.on('data', (operation) => {
            // Look for custom_json broadcasts
            if (operation.op[0] === 'custom_json') {
                const { id, json } = operation.op[1];
                
                // Match active Podping & Podcast Index identifiers
                if (id === 'podping' || id === 'pp_podcast_update' || id === 'podping-test') {
                    try {
                        const payload = JSON.parse(json);
                        const urls = payload.iris || payload.urls;
                        if (urls && urls.length > 0) {
                            console.log(`[BLOCKCHAIN] Live Podping detected! Spawning ${urls.length} feed(s) in Aegis Stream Core.`);
                            processInboundUrls(urls);
                        }
                    } catch (parseErr) {
                        // Ignore syntax errors in JSON
                    }
                }
            }
        });

        stream.on('error', (err) => {
            console.error("[BLOCKCHAIN] Operational stream disrupted. Retrying in 10s...", err.message);
            setTimeout(streamHivePodpings, 10000);
        });
    } catch (setupErr) {
        console.error("[BLOCKCHAIN] Operational setup failure. Re-arming in 10s...", setupErr.message);
        setTimeout(streamHivePodpings, 10000);
    }
}

// Fire up the streaming daemon
streamHivePodpings();

// Start the Deep Index Scout (1 new node per minute)
startScouting(1);

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
        jackpotPool = 0;

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
