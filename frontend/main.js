const API_BASE = '/api';

const feedInput = document.getElementById('feedInput');
const scanBtn = document.getElementById('scanBtn');
const searchResults = document.getElementById('searchResults');
const targetName = document.getElementById('targetName');
const targetUrl = document.getElementById('targetUrl');

// Gauges
const omniGauge = document.getElementById('omniGauge');
const omniText = document.getElementById('omniText');
const v4vGauge = document.getElementById('v4vGauge');
const v4vText = document.getElementById('v4vText');
const techGauge = document.getElementById('techGauge');
const techText = document.getElementById('techText');
const comGauge = document.getElementById('comGauge');
const comText = document.getElementById('comText');

// LED bulbs
const ledIds = [
    'value', 'valueRecipient', 'valueTimeSplit', 'person', 
    'transcript', 'chapters', 'locked', 'podping', 
    'integrity', 'podroll', 'socialInteract', 'funding'
];

let debounceTimer;

// Handle Input (Search vs Direct URL)
feedInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.startsWith('http')) {
        searchResults.classList.add('hidden');
        return; // It's a direct URL, wait for SCAN button
    }

    if (query.length > 2) {
        debounceTimer = setTimeout(() => searchPodcast(query), 500);
    } else {
        searchResults.classList.add('hidden');
    }
});

// Phase 6: Auto-Populate from God-Mode DB on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_BASE}/random-top`);
        const data = await res.json();
        if (data.success && data.podcast) {
            feedInput.value = data.podcast.url;
            targetName.textContent = data.podcast.title;
            targetUrl.textContent = data.podcast.url;
            scanFeed(data.podcast.url);
        }
    } catch (e) {
        console.error("Failed to auto-populate:", e);
    }
});

scanBtn.addEventListener('click', () => {
    const url = feedInput.value.trim();
    if (url.startsWith('http')) {
        targetName.textContent = "DIRECT URL";
        targetUrl.textContent = url;
        scanFeed(url);
    }
});

async function searchPodcast(query) {
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        searchResults.innerHTML = '';
        if (data.feeds && data.feeds.length > 0) {
            data.feeds.forEach(feed => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<strong>${feed.title}</strong><br><span style="font-size:0.8em; color:#64748b">${feed.url}</span>`;
                div.addEventListener('click', () => {
                    feedInput.value = feed.url;
                    targetName.textContent = feed.title;
                    targetUrl.textContent = feed.url;
                    searchResults.classList.add('hidden');
                    scanFeed(feed.url);
                });
                searchResults.appendChild(div);
            });
            searchResults.classList.remove('hidden');
        } else {
            searchResults.classList.add('hidden');
        }
    } catch (e) {
        console.error("Search failed", e);
    }
}

async function scanFeed(url) {
    // Reset UI
    targetName.classList.add('neon-text');
    targetName.textContent = targetName.textContent === "AWAITING INPUT" ? "SCANNING..." : targetName.textContent + " (SCANNING...)";
    
    ledIds.forEach(id => {
        const el = document.getElementById(`led-${id}`);
        if(el) el.classList.remove('on');
    });

    try {
        const res = await fetch(`${API_BASE}/scan?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        // Update Gauges
        updateGauge(omniGauge, omniText, data.scores.omni);
        updateGauge(v4vGauge, v4vText, data.scores.v4v);
        updateGauge(techGauge, techText, data.scores.technical);
        updateGauge(comGauge, comText, data.scores.community);

        // Update LEDs
        for (const [tag, exists] of Object.entries(data.tags)) {
            if (exists) {
                const el = document.getElementById(`led-${tag}`);
                if (el) el.classList.add('on');
            }
        }

        // Fix title
        targetName.textContent = targetName.textContent.replace(" (SCANNING...)", "");
        
        // Auto-populate The Atlas
        if (window.generateGravityWell) {
            window.generateGravityWell(data.title || "Target Podcast");
        }

    } catch (e) {
        console.error(e);
        targetName.textContent = "ERROR SCANNING FEED";
        targetUrl.textContent = e.message;
    }
}

function updateGauge(circle, textEl, score) {
    // Circle circumference is 2 * PI * r (40) = 251.2
    const circumference = 251.2;
    const offset = circumference - (score / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // Animate numbers
    let current = 0;
    const step = score > 0 ? Math.ceil(score / 20) : 1;
    const timer = setInterval(() => {
        current += step;
        if (current >= score) {
            current = score;
            clearInterval(timer);
        }
        textEl.textContent = current;
    }, 50);
}

// --- LIGHTNING NETWORK INTEGRATION (WebLN) ---
let currentUser = null;

// --- Phase 4: Assayer Wallet ---
const loginBtn = document.getElementById('loginBtn');
const tokenBalance = document.getElementById('tokenBalance');
const btnAlby = document.querySelector('.btn-alby');
const btnStrike = document.querySelector('.btn-strike');

loginBtn.addEventListener('click', async () => {
    console.log("1. LOGIN BTN CLICKED");
    try {
        if (typeof window.webln === 'undefined') {
            console.log("2. Error: WebLN is undefined");
            throw new Error('WebLN not found! Please install Alby.');
        }
        console.log("2. WebLN found. Calling enable()...");
        await window.webln.enable();
        
        console.log("3. WebLN enabled. Checking for getInfo...");
        if (typeof window.webln.getInfo !== 'function') {
            console.log("Error: getInfo is not a function on this provider.");
            throw new Error('Your Lightning provider does not support getInfo(). We need your pubkey to log you in!');
        }

        const info = await window.webln.getInfo();
        console.log("4. Info received from wallet:", info);
        
        // Use their node pubkey as their unique ID
        if (!info || !info.node || !info.node.pubkey) {
            console.log("Error: Pubkey missing from info object", info);
            throw new Error("Could not retrieve pubkey from your wallet.");
        }
        
        const pubkey = info.node.pubkey;
        console.log("5. Sending pubkey to backend:", pubkey);
        
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pubkey })
        });
        const data = await res.json();
        console.log("6. Backend response:", data);
        
        if (data.success) {
            currentUser = data.user;
            tokenBalance.textContent = currentUser.credit_balance_sats;
            loginBtn.textContent = "CONNECTED";
            loginBtn.style.background = "var(--neon-green)";
            
            // Enable payment buttons
            btnAlby.classList.remove('disabled');
            btnAlby.removeAttribute('disabled');
            btnStrike.classList.remove('disabled');
            btnStrike.removeAttribute('disabled');
        }
    } catch (e) {
        alert("Login failed: " + e.message);
    }
});

btnAlby.addEventListener('click', async () => {
    if (!currentUser) return alert("Login first!");
    try {
        // Real WebLN payment
        const response = await window.webln.keysend({
            destination: "03236a6f1bb9eb41cc6f140683a3721349509df73950bcebb6ebf5d9d7a229ce3d",
            amount: 5000 // Load 5000 SATs
        });

        // Tell backend we deposited
        const res = await fetch(`${API_BASE}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, amount_sats: 5000, provider: 'ALBY' })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.credit_balance_sats += 5000;
            tokenBalance.textContent = currentUser.credit_balance_sats;
            alert("Wallet Loaded with 5000 Tokens!");
        }
    } catch (e) {
        console.error("Deposit failed", e);
    }
});

btnStrike.addEventListener('click', () => {
    alert("Strike API integration coming in next phase. (Would redirect to Strike Checkout here).");
});

// --- LIGHTNING NETWORK INTEGRATION (WebLN) ---
const boostBtn = document.querySelector('.boost-btn');
const premiumBtn = document.querySelector('.btn-ln:not(.boost-btn)'); // The first one

premiumBtn.removeAttribute('disabled');
premiumBtn.title = "Spend 1234 Tokens for Deep File Hash Verification";

premiumBtn.addEventListener('click', async () => {
    const currentUrl = targetUrl.textContent;
    if (!currentUrl || currentUrl === "---") return alert("Please scan a feed first!");
    if (!currentUser) return alert("Please login and load your wallet first!");

    try {
        // 3. Verify on Backend using Ledger Balance
        const verifyRes = await fetch(`${API_BASE}/verify-ledger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                url: currentUrl
            })
        });
        
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
            alert(`PREMIUM VERIFICATION SUCCESS: ${verifyData.message}`);
            // Update Balance UI
            currentUser.credit_balance_sats = verifyData.new_balance;
            tokenBalance.textContent = currentUser.credit_balance_sats;
            
            // Give them a bonus on the tech gauge!
            let currentTech = parseInt(techText.textContent);
            updateGauge(techGauge, techText, Math.min(100, currentTech + verifyData.premium_bonus));
            premiumBtn.textContent = "VERIFIED!";
            premiumBtn.style.color = "#4ade80";
            premiumBtn.style.borderColor = "#4ade80";
            premiumBtn.disabled = true;
        } else {
            throw new Error(verifyData.error);
        }
        
    } catch (e) {
        alert("Verification Failed: " + e.message);
    }
});
boostBtn.addEventListener('click', async () => {
    try {
        if (typeof window.webln === 'undefined') {
            alert('WebLN not found! Please install the Alby browser extension to use the Lightning Network.');
            return;
        }

        await window.webln.enable();
        
        // This prompts the user to send a keysend payment. 
        // We will need your actual Lightning Node pubkey or LNURL here.
        // For now, it prompts the user to enter an amount.
        const response = await window.webln.keysend({
            destination: "03236a6f1bb9eb41cc6f140683a3721349509df73950bcebb6ebf5d9d7a229ce3d", // Placeholder node
            amount: 1000,
            customRecords: {
                // Podcasting 2.0 TLV records could go here
                34349334: "Boost for the Assayer!"
            }
        });

        alert(`Boost successful! Preimage: ${response.preimage}`);
        
    } catch (e) {
        console.error("Lightning payment failed or was cancelled.", e);
    }
});

// --- Phase 5: The Atlas Toggle ---
const toggleAtlasBtn = document.getElementById('toggleAtlasBtn');
const atlasPanel = document.querySelector('.atlas-panel');
const allPanels = document.querySelectorAll('.panel');

toggleAtlasBtn.addEventListener('click', () => {
    const isAtlasHidden = atlasPanel.classList.contains('hidden');
    
    if (isAtlasHidden) {
        // Open Atlas, hide everything else (except terminal)
        allPanels.forEach(p => {
            if (!p.classList.contains('terminal-panel') && !p.classList.contains('atlas-panel')) {
                p.classList.add('hidden');
            }
        });
        atlasPanel.classList.remove('hidden');
        atlasPanel.style.height = '600px';
        toggleAtlasBtn.textContent = "CLOSE ATLAS";
        toggleAtlasBtn.style.background = "#ef4444"; // Red to close
        
        // Auto-generate if we have a target
        if (window.generateGravityWell && targetName.textContent !== "AWAITING INPUT") {
            window.generateGravityWell(targetName.textContent);
        }
    } else {
        // Close Atlas, restore dashboard
        allPanels.forEach(p => p.classList.remove('hidden'));
        atlasPanel.classList.add('hidden');
        toggleAtlasBtn.textContent = "OPEN ATLAS";
        toggleAtlasBtn.style.background = "#6366f1"; // Original indigo
    }
});
