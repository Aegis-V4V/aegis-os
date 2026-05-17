// Aegis OS | Main Terminal Controller
import { updateStats, addDropToFeed } from './dashboard.js';
import { initVisualizers } from './visualizer.js';
import { initNostr, addNostrItem } from './nostr.js';

// --- STATE MANAGEMENT ---
let headBlockHeight = 0;
let globalJackpot = 0;
let currentChannel = "AEGIS PRIME";

// --- DOM ELEMENTS ---
const headBlockText = document.getElementById('headBlock');
const jackpotPoolText = document.getElementById('jackpotPool');
const podcastSearch = document.getElementById('podcastSearch');
const eulaOverlay = document.getElementById('eulaOverlay');
const acceptEulaBtn = document.getElementById('acceptEulaBtn');

const navHome = document.getElementById('nav-home');
const navSettings = document.getElementById('nav-settings');
const liveFeedView = document.getElementById('liveFeed');
const configView = document.getElementById('configView');
const skyhookToggle = document.getElementById('toggleSkyhook');
const skyhookSettings = document.getElementById('skyhookSettings');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log("[SYSTEM] Aegis OS Initializing...");

  // 1. Navigation Flow
  navHome.addEventListener('click', () => {
    liveFeedView.classList.remove('hidden');
    configView.classList.add('hidden');
    navHome.classList.add('active');
    navSettings.classList.remove('active');
  });

  navSettings.addEventListener('click', () => {
    liveFeedView.classList.add('hidden');
    configView.classList.remove('hidden');
    navSettings.classList.add('active');
    navHome.classList.remove('active');
    initVisualizers();

    // VIEW TOGGLES
    const views = {
      terminal: document.getElementById('liveFeed'),
      graph: document.getElementById('graphView'),
      pulse: document.getElementById('pulseView')
    };

    document.getElementById('btn-terminal').onclick = () => switchView('terminal');
    document.getElementById('btn-graph').onclick = () => switchView('graph');
    document.getElementById('btn-pulse').onclick = () => switchView('pulse');

    function switchView(mode) {
      Object.keys(views).forEach(v => views[v].classList.add('hidden'));
      views[mode].classList.remove('hidden');
      
      document.querySelectorAll('.view-toggles .nav-item').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-${mode}`).classList.add('active');
      
      document.getElementById('viewTitle').textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }
    document.getElementById('btn-sync').onclick = async () => {
      const btn = document.getElementById('btn-sync');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span> Syncing...';
      const { syncHistoricalIntelligence } = await import('./brain_sync.js');
      await syncHistoricalIntelligence();
      btn.innerHTML = originalText;
    };
  });

  // 2. Config Toggles
  skyhookToggle.addEventListener('change', () => {
    if (skyhookToggle.checked) {
      skyhookSettings.classList.remove('hidden');
    } else {
      skyhookSettings.classList.add('hidden');
    }
  });

  const scoutToggle = document.getElementById('toggleScout');
  scoutToggle.addEventListener('change', () => {
    console.log(`[SYSTEM] Scout Bot status changed: ${scoutToggle.checked}`);
    // Future: API call to toggle background process
  });

  // 1. EULA Flow
  if (!localStorage.getItem('aegis_eula_accepted')) {
    eulaOverlay.classList.add('active');
  }
  
  acceptEulaBtn.addEventListener('click', () => {
    localStorage.setItem('aegis_eula_accepted', 'true');
    eulaOverlay.classList.remove('active');
  });

  // 2. Initialize Integrations
  initNostr();
  initWebSocket();

  // 3. Listen for Tuning Changes
  window.addEventListener('channelChange', (e) => {
    if (e.detail.name !== currentChannel) {
      currentChannel = e.detail.name;
      console.log(`[TUNER] Synchronized to: ${currentChannel}`);
      // In the future, this would filter the live feed or change layouts
    }
  });
});

// --- WEBSOCKET CONNECTION ---
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.onopen = () => {
    console.log("[SOCKET] Linked to Aegis Stream Core.");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'INITIAL_STREAM':
          console.log(`[SOCKET] Ingesting initial stream sync (${data.stream.length} items).`);
          data.stream.forEach(drop => addDropToFeed(drop));
          updateGlobalStats(data);
          break;
          
        case 'DROP_BLOB':
          data.drops.forEach(drop => {
            addDropToFeed(drop);
            addNostrItem("Aegis_Sentinel", `New stream node verified: "${drop.title}"`);
          });
          updateGlobalStats(data);
          break;
        
        case 'stats':
          updateStats(data.data);
          break;
      }
    } catch (err) {
      console.error("[SOCKET] Stream packet error:", err);
    }
  };

  socket.onclose = () => {
    console.warn("[SOCKET] Connection lost. Re-establishing Aegis link...");
    setTimeout(initWebSocket, 5000);
  };
}

// --- GLOBAL UTILITIES ---
function updateGlobalStats(data) {
  if (data.jackpot !== undefined) globalJackpot = data.jackpot;
  // Note: headBlock logic would come from a specific stat update
  updateStats({
    headBlock: headBlockHeight || '---',
    jackpot: globalJackpot
  });
}

// Global zap bridge
window.zapPodcast = async (url) => {
  if (window.webln) {
    try {
      await window.webln.enable();
      alert(`Aegis OS: Initializing V4V Stream Split for ${url}...`);
    } catch (e) {
      console.error("[V4V] WebLN failed", e);
    }
  } else {
    alert(`Aegis Wallet: Please install Alby or link Strike to zap.`);
  }
};
