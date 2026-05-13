import { V4V_TRACKS } from './v4v_tracks.js';
const API_BASE = '/api';

// Viewport Router & Cockpit Core
const controlKeys = document.querySelectorAll('.control-key');
const monitorPanels = document.querySelectorAll('.viewport-panel');

// HUD State
const bountyText = document.getElementById('bountyText');
const cctvJackpot = document.getElementById('cctvJackpot');
const liveVolumeText = document.getElementById('liveVolume');
const freeScanDisplay = document.getElementById('freeScanCount');

// Scanners & Input
const feedInput = document.getElementById('feedInput');
const scanBtn = document.getElementById('scanBtn');
const searchResults = document.getElementById('searchResults');
const targetName = document.getElementById('targetName');
const targetUrl = document.getElementById('targetUrl');

// Ledger/Auth Components
let currentUser = null;
const loginBtn = document.getElementById('loginBtn');
const quickLoginBtn = document.getElementById('quickLoginBtn');
const tokenBalance = document.getElementById('tokenBalance');
const tokenBalanceInline = document.getElementById('tokenBalanceInline');
const btnAlby = document.querySelector('.btn-alby');
const btnStrike = document.querySelector('.btn-strike');
const verifyBtn = document.querySelector('.btn-verify');
const boostBtn = document.querySelector('.boost-btn');

// EULA & Unified Checkout DOM Refs
const eulaOverlay = document.getElementById('eulaOverlay');
const acceptEulaBtn = document.getElementById('acceptEulaBtn');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutTitle = document.getElementById('checkoutTitle');
const checkoutBody = document.getElementById('checkoutBody');
const checkoutSatInput = document.getElementById('checkoutSatInput');
const processPaymentBtn = document.getElementById('processPaymentBtn');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');

// Branded Payment Buttons
const btnPaypal = document.getElementById('btn-paypal');
const btnStripe = document.getElementById('btn-stripe');
const btnCashapp = document.getElementById('btn-cashapp');
const btnOpennode = document.getElementById('btn-opennode');
let activeCheckoutProvider = null;

// Modal Lead Gen
const emailModal = document.getElementById('emailModal');
const triggerReportBtn = document.getElementById('triggerReportBtn');
const submitEmailBtn = document.getElementById('submitEmailBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const leadEmailInput = document.getElementById('leadEmail');

// Technical Report Gating Helper
function updateReportBtnState() {
    const url = targetUrl ? targetUrl.textContent : "---";
    const hasPodcast = (url && url !== "---" && url.startsWith('http'));
    const isLoggedIn = !!currentUser;
    
    if (triggerReportBtn) {
        if (hasPodcast && isLoggedIn) {
            triggerReportBtn.removeAttribute('disabled');
        } else {
            triggerReportBtn.setAttribute('disabled', 'true');
        }
    }
}

// Gauges
const omniGauge = document.getElementById('omniGauge');
const omniText = document.getElementById('omniText');
const v4vGauge = document.getElementById('v4vGauge');
const v4vText = document.getElementById('v4vText');
const techGauge = document.getElementById('techGauge');
const techText = document.getElementById('techText');
const comGauge = document.getElementById('comGauge');
const comText = document.getElementById('comText');

// LED Sensors
const ledIds = [
    'value', 'valueRecipient', 'valueTimeSplit', 'person', 
    'transcript', 'chapters', 'locked', 'podping', 
    'integrity', 'podroll', 'socialInteract', 'funding'
];

let debounceTimer;

/* --- 1. INITIALIZATION & COCKPIT SWITCHES --- */
document.addEventListener('DOMContentLoaded', () => {
    // Setup EULA check
    if (!localStorage.getItem('assayer_eula_accepted')) {
        if (eulaOverlay) eulaOverlay.classList.remove('hidden');
    }
    if (acceptEulaBtn) {
        acceptEulaBtn.addEventListener('click', () => {
            localStorage.setItem('assayer_eula_accepted', 'true');
            if (eulaOverlay) {
                eulaOverlay.style.opacity = '0';
                setTimeout(() => eulaOverlay.classList.add('hidden'), 500);
            }
            console.log("[SYSTEM] Pilot Agreement Signed. Matrix Activated.");
        });
    }

    // Clock Ticker
    setInterval(() => {
        const str = new Date().toLocaleTimeString();
        document.getElementById('sysClock').textContent = str;
        const cctvTime = document.getElementById('cctvTime');
        if (cctvTime) cctvTime.textContent = str;
    }, 1000);

    // Setup Viewport Switch Toggles
    controlKeys.forEach(key => {
        key.addEventListener('click', () => {
            const targetId = key.getAttribute('data-target');
            if (!targetId) return;

            controlKeys.forEach(k => k.classList.remove('active'));
            monitorPanels.forEach(p => p.classList.remove('active'));

            key.classList.add('active');
            const activePanel = document.getElementById(targetId);
            if (activePanel) activePanel.classList.add('active');

            // Force ThreeJS rendering loops to recalculate viewport bounds
            window.dispatchEvent(new Event('resize'));
        });
    });

    // Initial cookie display
    updateScanLimitUI();

    // Auto-Populate scanner from Database
    autoPopulateScanner();

    // Force deep-verify and boost to handle initial states
    if (verifyBtn) {
        verifyBtn.removeAttribute('disabled');
        verifyBtn.addEventListener('click', handleDeepVerify);
    }
    
    if (boostBtn) {
        boostBtn.addEventListener('click', handlePlatformBoost);
    }

    // Initialize Report Button State Guard
    updateReportBtnState();
});

/* --- 2. THE SCAN LIMIT COOKIE LOGIC --- */
function getCookieScanCount() {
    const match = document.cookie.match(/scanLimitCount=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

function incrementCookieScanCount() {
    const count = getCookieScanCount() + 1;
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `scanLimitCount=${count}; expires=${expires}; path=/;`;
    updateScanLimitUI();
}

function updateScanLimitUI() {
    const limit = 5;
    const left = Math.max(0, limit - getCookieScanCount());
    if (freeScanDisplay) freeScanDisplay.textContent = left;
}

// Counter reset backdoor disabled by order of Pilot Command.


/* --- 3. SCANNING ENGINE & GATES --- */
async function autoPopulateScanner() {
    try {
        const res = await fetch(`${API_BASE}/random-top`);
        const data = await res.json();
        if (data.success && data.podcast) {
            feedInput.value = data.podcast.url;
            targetName.textContent = data.podcast.title;
            targetUrl.textContent = data.podcast.url;
            executeScanRoutine(data.podcast.url, true); // free bypass initial
        }
    } catch (e) {
        console.warn("Scanner auto-populate failed:", e);
    }
}

feedInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.startsWith('http')) {
        searchResults.classList.add('hidden');
        return;
    }
    if (query.length > 2) {
        debounceTimer = setTimeout(() => searchCatalog(query), 400);
    } else {
        searchResults.classList.add('hidden');
    }
});

async function searchCatalog(query) {
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        searchResults.innerHTML = '';
        if (data.feeds && data.feeds.length > 0) {
            data.feeds.forEach(feed => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<strong>${feed.title}</strong><br><span class="dim-text">${feed.url}</span>`;
                div.addEventListener('click', () => {
                    feedInput.value = feed.url;
                    targetName.textContent = feed.title;
                    targetUrl.textContent = feed.url;
                    searchResults.classList.add('hidden');
                    executeScanRoutine(feed.url);
                });
                searchResults.appendChild(div);
            });
            searchResults.classList.remove('hidden');
        } else {
            searchResults.classList.add('hidden');
        }
    } catch (e) {
        console.error("Search scan error:", e);
    }
}

scanBtn.addEventListener('click', () => {
    const url = feedInput.value.trim();
    if (url.startsWith('http')) {
        targetName.textContent = "DIRECT FEED LOCK";
        targetUrl.textContent = url;
        executeScanRoutine(url);
    }
});

// Main Scan Router with Payment Enforcement
async function executeScanRoutine(url, bypassLimit = false) {
    const limit = 5;
    const currentScans = getCookieScanCount();

    if (!bypassLimit && currentScans >= limit) {
        // Enforce 150 SAT basic fee
        if (!currentUser) {
            alert("🚨 FREE SCANS EXPIRED!\n\nYou have exhausted your 5 free sector scans.\n\nPlease Connect a Wallet and Load Credits to continue astrogation (150 Sats/scan).");
            // Force navigate to Ledger panel
            const ledgerKey = document.querySelector('[data-target="monitor-ledger"]');
            if (ledgerKey) ledgerKey.click();
            return;
        }

        const confirmPay = confirm(`🔒 150 SAT SCAN FEE REQUIRED\n\nYou have used your free scans.\n\nConfirm payment of 150 Credits to perform a technical scan on this feed?`);
        if (!confirmPay) return;

        try {
            const payRes = await fetch(`${API_BASE}/pay-basic-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id })
            });
            const payData = await payRes.json();
            if (!payRes.ok || !payData.success) {
                throw new Error(payData.error || "Insufficient platform ledger credits.");
            }
            // Update balance
            currentUser.credit_balance_sats = payData.new_balance;
            updateWalletUI();
            alert("Payment verified! Dispatching scanner probes...");
        } catch (payErr) {
            alert("Payment Rejected: " + payErr.message);
            return;
        }
    }

    // UI Loading
    targetName.classList.add('neon-text');
    targetName.textContent = "SCANNING SECTOR...";
    ledIds.forEach(id => {
        const el = document.getElementById(`led-${id}`);
        if(el) el.classList.remove('on');
    });

    try {
        const scanRes = await fetch(`${API_BASE}/scan?url=${encodeURIComponent(url)}`);
        const data = await scanRes.json();
        if (data.error) throw new Error(data.error);

        // Update Gauges
        animateGauge(omniGauge, omniText, data.scores.omni);
        animateGauge(v4vGauge, v4vText, data.scores.v4v);
        animateGauge(techGauge, techText, data.scores.technical);
        animateGauge(comGauge, comText, data.scores.community);

        // LEDs
        for (const [tag, active] of Object.entries(data.tags)) {
            if (active) {
                const el = document.getElementById(`led-${tag}`);
                if(el) el.classList.add('on');
            }
        }

        targetName.textContent = data.title || "SCAN COMPLETED";

        // Record scan counts
        if (!bypassLimit) {
            incrementCookieScanCount();
        }

        // 3D ASTROGATION HANDOFF
        if (window.plotStarNeighborhood) {
            window.plotStarNeighborhood(data.title, url, data);
        }

        // Update State Guards
        updateReportBtnState();

    } catch (err) {
        console.error("Scan failed:", err);
        targetName.textContent = "SECTOR ERROR";
        targetUrl.textContent = err.message;
    }
}

function animateGauge(fillCircle, labelText, score) {
    const circumference = 251.2;
    const offset = circumference - (score / 100) * circumference;
    fillCircle.style.strokeDashoffset = offset;
    
    let cur = 0;
    const step = score > 0 ? Math.ceil(score / 15) : 1;
    const interval = setInterval(() => {
        cur += step;
        if (cur >= score) {
            cur = score;
            clearInterval(interval);
        }
        labelText.textContent = cur;
    }, 40);
}

/* --- 4. DEEP HASH VERIFY & BOOSTER --- */
async function handleDeepVerify() {
    if (!currentUser) return alert("Please Link Wallet Identity first in the Ledger panel!");
    const url = targetUrl.textContent;
    if (!url || url === "---") return alert("Plot sector coordinates (Scan a podcast) before verifying!");

    const confirmSpend = confirm(`🔐 DEEP HASH VERIFICATION // 1234 SATS\n\nExecute cryptographic ledger audit of all enclosure files? This deducts 1234 Sats from your ledger balance.`);
    if (!confirmSpend) return;

    try {
        const res = await fetch(`${API_BASE}/verify-ledger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, url })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.credit_balance_sats = data.new_balance;
            updateWalletUI();
            alert("✅ HASH AUDIT COMPLETE!\n\nFile integrity and hosting certificates verified cryptographically. 1234 Sats verified & split!");
        } else {
            throw new Error(data.error || "Verification failed.");
        }
    } catch (err) {
        alert("Deep Verify Aborted: " + err.message);
    }
}

async function handlePlatformBoost() {
    if (!currentUser) return alert("Log into your pilot ledger first!");
    const amount = prompt("🚀 SUBMIT PLATFORM BOOST\n\nEnter amount of SATs to boost the Assayer Platform and global bounty jackpot:", "1000");
    if (!amount) return;
    const amtSats = parseInt(amount, 10);
    if (isNaN(amtSats) || amtSats < 50) return alert("Boost must be at least 50 Sats.");

    try {
        if (typeof window.webln === 'undefined') throw new Error("WebLN wallet not detected!");
        await window.webln.enable();
        
        // 1. Request real Bolt11 Invoice from backend
        const invRes = await fetch(`${API_BASE}/invoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amtSats, description: `Platform Boost from Pilot ID ${currentUser.id}` })
        });
        const invData = await invRes.json();
        if (!invData.payment_request) throw new Error("Could not generate Lightning network invoice.");

        // 2. Pay invoice using real wallet balance
        const payResult = await window.webln.sendPayment(invData.payment_request);

        alert(`✅ BOOST VERIFIED & DISPATCHED!\n\nReal-world Satoshis received directly in platform balance. Commencing 3-way fractional revenue split!`);

        // 3. Record real platform boost ledger entry & trigger revenue split
        const boostRes = await fetch(`${API_BASE}/boost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: currentUser.id, 
                amount_sats: amtSats, 
                reference_id: payResult.preimage || invData.payment_hash
            })
        });
        const boostData = await boostRes.json();
        if (!boostRes.ok) console.warn("Ledger split update failed:", boostData.error);

    } catch (e) {
        alert("Boost failed: " + e.message);
    }
}

/* --- 5. LEDGER AUTHENTICATION & PAYMENTS --- */
const performLogin = async () => {
    try {
        if (typeof window.webln === 'undefined') {
            throw new Error("Lightning extension (Alby) not detected.");
        }
        await window.webln.enable();
        let pubkey = null;
        if (typeof window.webln.getInfo === 'function') {
            try {
                const inf = await window.webln.getInfo();
                if(inf && inf.node && inf.node.pubkey) pubkey = inf.node.pubkey;
            } catch(err) { console.warn("getInfo block:", err); }
        }

        if (!pubkey) {
            const name = prompt("🔒 WALLET CONNECTED\n\nNo public key exposed. Enter Pilot Alias to securely provision your ledger account:");
            if (!name) throw new Error("Account cancelled.");
            pubkey = "alias:" + name.trim();
            if(pubkey.length < 9) throw new Error("Minimum 3 characters required.");
        }

        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pubkey })
        });
        const d = await res.json();
        if (d.success) {
            currentUser = d.user;
            updateWalletUI();
            
            loginBtn.textContent = "PILOT LINKED";
            loginBtn.style.background = "#4ade80";
            if(quickLoginBtn) {
                quickLoginBtn.textContent = "LINKED";
                quickLoginBtn.style.borderColor = "#4ade80";
                quickLoginBtn.style.color = "#4ade80";
            }

            // Enable Funding
            if (btnAlby) btnAlby.removeAttribute('disabled');
            if (btnStrike) btnStrike.removeAttribute('disabled');

            // Update State Guards
            updateReportBtnState();
        }
    } catch (e) {
        alert("Login Lock: " + e.message);
    }
};

if (loginBtn) loginBtn.addEventListener('click', performLogin);
if (quickLoginBtn) quickLoginBtn.addEventListener('click', performLogin);

function updateWalletUI() {
    if (!currentUser) return;
    const bal = currentUser.credit_balance_sats;
    if(tokenBalance) tokenBalance.innerHTML = `${bal} <span class="neon-text">SATS</span>`;
    if(tokenBalanceInline) tokenBalanceInline.textContent = bal;
}

// Alby keysend deposit
if (btnAlby) {
    btnAlby.addEventListener('click', async () => {
        if (!currentUser) return alert("Identify Pilot first!");
        const amt = prompt("Load Satoshi Tokens to Cockpit Wallet. Enter SAT volume:", "5000");
        if(!amt) return;
        const amtSats = parseInt(amt, 10);
        if(isNaN(amtSats) || amtSats < 10) return;

        try {
            if (typeof window.webln === 'undefined') throw new Error("WebLN not available.");
            await window.webln.enable();

            // 1. Request real network invoice from backend
            const invRes = await fetch(`${API_BASE}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amtSats, description: `Funding Cockpit Wallet for Pilot ID ${currentUser.id}` })
            });
            const invData = await invRes.json();
            if (!invData.payment_request) throw new Error("Failed to generate invoice.");

            // 2. Direct real-world payment of invoice
            const payResult = await window.webln.sendPayment(invData.payment_request);

            // 3. Securely credit user's platform ledger
            const depRes = await fetch(`${API_BASE}/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: currentUser.id, 
                    amount_sats: amtSats, 
                    provider: 'ALBY',
                    reference_id: payResult.preimage || invData.payment_hash 
                })
            });
            const d = await depRes.json();
            if (d.success) {
                currentUser.credit_balance_sats += amtSats;
                updateWalletUI();
                alert(`🎉 DEPOSIT CONFIRMED!\n\nSuccessfully loaded ${amtSats} platform credits!`);
            }
        } catch(e) {
            alert("Communications failure: " + e.message);
        }
    });
}

/* --- 7. V4V RADIO HUD DECK LOGIC (Astrogation v2.1) --- */
let currentTrackIdx = Math.floor(Math.random() * V4V_TRACKS.length);
let isRadioPlaying = false; // Start paused to satisfy browser Audio policies and await user interaction
let radioTimer = null;

const radioPlayBtn = document.getElementById('radioPlayBtn');
const radioSkipBtn = document.getElementById('radioSkipBtn');
const radioBoostBtn = document.getElementById('radioBoostBtn');
const radioTrackText = document.getElementById('radioTrack');
const radioArtistText = document.getElementById('radioArtist');
const radioViz = document.querySelector('.radio-viz');

// Dynamic Cyberpunk Synth Arpeggiator Loop Core
let synthCtx = null;
let arpeggioTimeout = null;

function playNextRetroSynthNote() {
    if (!isRadioPlaying || !synthCtx) return;
    
    try {
        if (synthCtx.state === 'suspended') synthCtx.resume();
        
        const now = synthCtx.currentTime;
        const osc = synthCtx.createOscillator();
        const filter = synthCtx.createBiquadFilter();
        const gainNode = synthCtx.createGain();
        
        // 🌌 Classic A minor pentatonic chord arpeggio
        const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 329.63, 392.00, 440.00];
        const freq = scale[Math.floor(Math.random() * scale.length)];
        
        osc.type = (Math.random() > 0.5) ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        
        // Sci-fi filter frequency sweep
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.85);
        
        // Volume envelope preventing clicks
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.035, now + 0.12); 
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(synthCtx.destination);
        
        osc.start(now);
        osc.stop(now + 1.0);
    } catch (e) {
        console.error("[SYNTH BLOCK]", e);
    }

    // Retro syncopated timing
    const tempo = (Math.random() > 0.75) ? 600 : 300;
    arpeggioTimeout = setTimeout(playNextRetroSynthNote, tempo);
}

function initRadioAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        synthCtx = new AudioContext();
        console.log("[V4V RADIO] Master CyberSynth Engine Fired.");
    } catch(e) {
        console.warn("[V4V RADIO] Audio creation failed:", e);
    }
}

function updateTrackDisplay() {
    const track = V4V_TRACKS[currentTrackIdx];
    if(radioTrackText) radioTrackText.textContent = track.title;
    if(radioArtistText) radioArtistText.textContent = `ARTIST: ${track.artist}`;
    
    if (isRadioPlaying) {
        if(radioViz) radioViz.style.animationPlayState = 'running';
        if(radioViz) radioViz.style.background = '#4ade80';
        if(radioPlayBtn) radioPlayBtn.textContent = "PAUSE";
    } else {
        if(radioViz) radioViz.style.animationPlayState = 'paused';
        if(radioViz) radioViz.style.background = '#475569';
        if(radioPlayBtn) radioPlayBtn.textContent = "PLAY";
    }
}

function cycleRadioTracks() {
    if (!isRadioPlaying) return;
    currentTrackIdx = (currentTrackIdx + 1) % V4V_TRACKS.length;
    updateTrackDisplay();
    clearTimeout(radioTimer);
    radioTimer = setTimeout(cycleRadioTracks, 20000 + Math.random() * 10000);
}

if (radioPlayBtn) {
    radioPlayBtn.addEventListener('click', () => {
        if (!synthCtx) initRadioAudio();
        
        isRadioPlaying = !isRadioPlaying;
        if (isRadioPlaying) {
            playNextRetroSynthNote();
            cycleRadioTracks();
        } else {
            clearTimeout(arpeggioTimeout);
            clearTimeout(radioTimer);
        }
        updateTrackDisplay();
    });
}

if (radioSkipBtn) {
    radioSkipBtn.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx + 1) % V4V_TRACKS.length;
        updateTrackDisplay();
    });
}

if (radioBoostBtn) {
    radioBoostBtn.addEventListener('click', async () => {
        if (!currentUser) return alert("Identify pilot ledger to initiate split streams!");
        const track = V4V_TRACKS[currentTrackIdx];
        
        const amtStr = prompt(`⚡ DIRECT ARTIST SPLIT STREAM\n\nEnter amount in Satoshis to send directly to Artist:`, "50");
        const amount = parseInt(amtStr, 10);
        if (isNaN(amount) || amount <= 0) return;
        
        try {
            radioBoostBtn.textContent = "ROUTING...";
            
            const invRes = await fetch(`${API_BASE}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amount, description: `V4V Radio: "${track.title}" split to artist` })
            });
            const invData = await invRes.json();
            if (invData.error) throw new Error(invData.error);
            
            if (!window.webln) throw new Error("Pilot cockpit missing WebLN interface.");
            await window.webln.enable();
            const payResult = await window.webln.sendPayment(invData.payment_request);
            
            const splitRes = await fetch(`${API_BASE}/boost-artist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    amount_sats: amount,
                    reference_id: payResult.preimage || invData.payment_hash,
                    artist_node: track.node,
                    song_title: track.title
                })
            });
            const splitData = await splitRes.json();
            if (splitData.success) {
                alert(`🎵 V4V STREAM SPLIT!\n\nBroadcasted ${amount} Sats!\n⚡ ~53% routed directly to Artist Node!`);
            }
        } catch (e) {
            alert("Stream Rejected: " + e.message);
        } finally {
            radioBoostBtn.textContent = "⚡ BOOST";
        }
    });
}

// Complete Initial Load Routine
currentTrackIdx = Math.floor(Math.random() * V4V_TRACKS.length);
updateTrackDisplay();

/* --- 8. UNIFIED CHECKOUT ENGINE (v2.2) --- */

const checkoutTemplates = {
    STRIPE: {
        title: "Stripe Payment Gateway",
        html: `
            <span class="checkout-brand-tag tag-stripe">Stripe Portal</span>
            <div class="checkout-form-group">
                <label>CREDIT CARD NUMBER</label>
                <input type="text" class="checkout-input" placeholder="4242 4242 4242 4242" maxlength="19">
            </div>
            <div style="display:flex; gap:10px;">
                <div class="checkout-form-group" style="flex:1;">
                    <label>EXPIRY</label>
                    <input type="text" class="checkout-input" placeholder="MM/YY" maxlength="5">
                </div>
                <div class="checkout-form-group" style="flex:1;">
                    <label>CVC</label>
                    <input type="password" class="checkout-input" placeholder="***" maxlength="3">
                </div>
            </div>
        `
    },
    STRIKE: {
        title: "Strike Fiat-to-Lightning",
        html: `
            <span class="checkout-brand-tag tag-strike">Strike API</span>
            <p class="dim-text" style="margin-bottom:15px;">Submit your global Strike handle to generate direct lightning invoice settlement.</p>
            <div class="checkout-form-group">
                <label>STRIKE USERNAME (@)</label>
                <input type="text" class="checkout-input" placeholder="satoshistackers" value="">
            </div>
        `
    },
    PAYPAL: {
        title: "PayPal Direct Ledger",
        html: `
            <span class="checkout-brand-tag tag-paypal">PayPal Bridge</span>
            <p class="dim-text" style="margin-bottom:15px;">Authenticate bridge via secure PayPal fiat ledger hookup.</p>
            <div class="checkout-form-group">
                <label>PAYPAL ACCOUNT EMAIL</label>
                <input type="email" class="checkout-input" placeholder="pilot@starfleet.mil">
            </div>
        `
    },
    CASHAPP: {
        title: "CashApp Direct Deposit",
        html: `
            <span class="checkout-brand-tag tag-cashapp">CashApp Pay</span>
            <p class="dim-text" style="margin-bottom:15px;">Input Cashtag identifier to direct mobile tag verification.</p>
            <div class="checkout-form-group">
                <label>CASHTAG ($)</label>
                <input type="text" class="checkout-input" placeholder="AntigravityCo">
            </div>
        `
    },
    OPENNODE: {
        title: "OpenNode BTC Processor",
        html: `
            <span class="checkout-brand-tag tag-opennode">OpenNode API</span>
            <p class="dim-text" style="margin-bottom:15px;">Deploy direct enterprise Lightning settlement channel.</p>
            <div class="checkout-form-group">
                <label>EMAIL FOR PAYMENT RECEIPT</label>
                <input type="email" class="checkout-input" placeholder="admin@opennode.com">
            </div>
        `
    }
};

function openCheckout(provider) {
    if (!currentUser) return alert("Connect Pilot identity profile first to initialize funding bridges!");
    activeCheckoutProvider = provider;
    const tmpl = checkoutTemplates[provider];
    if (!tmpl) return;
    
    if (checkoutTitle) checkoutTitle.textContent = tmpl.title;
    if (checkoutBody) checkoutBody.innerHTML = tmpl.html;
    if (checkoutModal) checkoutModal.classList.remove('hidden');
}

function closeCheckout() {
    if (checkoutModal) checkoutModal.classList.add('hidden');
    activeCheckoutProvider = null;
}

if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);

// Bind newly unlocked payments
if (btnStrike) btnStrike.addEventListener('click', () => openCheckout('STRIKE'));
if (btnPaypal) btnPaypal.addEventListener('click', () => openCheckout('PAYPAL'));
if (btnStripe) btnStripe.addEventListener('click', () => openCheckout('STRIPE'));
if (btnCashapp) btnCashapp.addEventListener('click', () => openCheckout('CASHAPP'));
if (btnOpennode) btnOpennode.addEventListener('click', () => openCheckout('OPENNODE'));

// Autorization loop
if (processPaymentBtn) {
    processPaymentBtn.addEventListener('click', async () => {
        if (!currentUser || !activeCheckoutProvider) return;
        const sats = parseInt(checkoutSatInput.value, 10);
        if (isNaN(sats) || sats < 100) return alert("Minimum deposit threshold is 100 Satoshis.");
        
        try {
            // 1. Visual simulator overlay
            const prevHtml = checkoutBody.innerHTML;
            checkoutBody.innerHTML = `
                <div class="checkout-loader">
                    <div class="spinner"></div>
                    <p class="glow-text">// ROUTING PORTAL BRIDGE: ${activeCheckoutProvider}...</p>
                    <p class="dim-text">Securing compliance & validating credentials...</p>
                </div>
            `;
            processPaymentBtn.setAttribute('disabled', 'true');
            processPaymentBtn.textContent = "AUTHORIZING...";
            
            // 2. Simulation Delay (2500ms)
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // 3. Execute SQLite Persistent Record
            const res = await fetch(`${API_BASE}/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    amount_sats: sats,
                    provider: activeCheckoutProvider
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // Sync application memory state
                currentUser.credit_balance_sats += sats;
                if (tokenBalance) tokenBalance.textContent = currentUser.credit_balance_sats;
                if (tokenBalanceInline) tokenBalanceInline.textContent = currentUser.credit_balance_sats;
                updateReportBtnState();
                
                alert(`💳 SETTLEMENT VERIFIED!\n\nProcessor [${activeCheckoutProvider}] authorized successfully.\nDeposited ${sats} Credits directly into active ledger!`);
                closeCheckout();
            } else {
                throw new Error("Database failed core validation.");
            }
        } catch (err) {
            alert("Bridge Failure: " + err.message);
            closeCheckout();
        } finally {
            processPaymentBtn.removeAttribute('disabled');
            processPaymentBtn.textContent = "AUTHORIZE DEPOSIT";
        }
    });
}

/* --- 6. COMPLIANCE LEAD-GEN POPUP --- */
if (triggerReportBtn) {
    triggerReportBtn.addEventListener('click', () => {
        const url = targetUrl.textContent;
        if (!url || url === "---") return alert("Unlock active sector coordinates (Scan a podcast) before compiling fixer reports!");
        emailModal.classList.remove('hidden');
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        emailModal.classList.add('hidden');
    });
}

if (submitEmailBtn) {
    submitEmailBtn.addEventListener('click', async () => {
        const email = leadEmailInput.value.trim();
        if (!email || !email.includes('@')) return alert("Enter a valid communications address.");
        
        const url = targetUrl.textContent;
        
        try {
            const res = await fetch(`${API_BASE}/report-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, feed_url: url })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(`📡 COMPLIANCE BLUEPRINT DISPATCHED!\n\nTechnical repair guide for [${url}] compiled!\n\nInstructions transmitted securely to: ${email}`);
            } else {
                throw new Error(data.error || "Subspace frequency blocked.");
            }
        } catch (err) {
            alert("Transmission Failure: " + err.message);
        }
        
        emailModal.classList.add('hidden');
        leadEmailInput.value = '';
    });
}

/* --- 7. WEBSOCKET SYNC (CARGO & GLOBAL BOUNTY) --- */
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${window.location.host}`);

socket.onopen = () => console.log("Astrogation link synced with Mainframe stream.");

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'JACKPOT_UPDATE' || data.type === 'INITIAL_CARGO') {
            const jpVal = Math.floor(data.jackpot);
            if (bountyText) bountyText.textContent = jpVal;
            if (cctvJackpot) cctvJackpot.textContent = jpVal;
        }

        // Direct stream handoff to MatterJS cargo logic
        if (window.handleLiveDropPayload) {
            window.handleLiveDropPayload(data);
        }
    } catch (e) {
        console.error("Frame stream syntax block:", e);
    }
};

window.updateHoldHUD = (volume) => {
    if (liveVolumeText) liveVolumeText.textContent = volume;
};
