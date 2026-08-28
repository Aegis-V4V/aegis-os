// Aegis OS | Terminal Feed Controller
// High-performance live stream and audit management

const liveFeed = document.getElementById('liveFeed');
const auditLog = document.getElementById('auditLog');
const headBlockText = document.getElementById('headBlock');
const jackpotPoolText = document.getElementById('jackpotPool');

const FEED_CAP = 100;
let feedItems = [];
let activeChannel = 'AEGIS PRIME';

export function setActiveChannel(channelName) {
  activeChannel = channelName;
  // Filter existing cards: show all on AEGIS PRIME, V4V-only on any other channel
  const showAll = channelName === 'AEGIS PRIME' || channelName === 'ALL';
  document.querySelectorAll('.podcast-card').forEach(card => {
    const isV4V = card.dataset.v4v === 'true';
    card.style.display = (showAll || isV4V) ? '' : 'none';
  });
}

import { triggerPulse, addNodeToMap } from './visualizer.js';

/**
 * Adds a single podcast "drop" to the live feed.
 * @param {Object} drop - Podcast metadata object.
 */
export function addDropToFeed(drop) {
  const feedContainer = document.getElementById('liveFeed');
  if (!feedContainer) return;

  // Trigger Visuals
  triggerPulse(drop.isCompliant);
  addNodeToMap(drop.title, false, drop.isCompliant);

  // 1. Update Audit Log
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> Ingested: "${drop.title}"`;
  auditLog.prepend(logEntry);
  
  // Cap audit log to 50 entries
  if (auditLog.children.length > 50) {
    auditLog.removeChild(auditLog.lastChild);
  }

  // Skip card if current channel filter excludes non-V4V
  const showAll = activeChannel === 'AEGIS PRIME' || activeChannel === 'ALL';
  if (!showAll && !drop.isCompliant) return;

  // 2. Create Feed Card
  const card = document.createElement('div');
  card.className = 'podcast-card';
  card.dataset.v4v = drop.isCompliant ? 'true' : 'false';
  
  // Logic for compliance tags
  const isCompliant = drop.isCompliant || false;
  const baselineScore = drop.baseline ? drop.baseline.omni : '---';
  const tagsHtml = isCompliant ? `<span class="tag accent">Aegis Verified</span> <span class="tag accent">Score: ${baselineScore}</span>` : '<span class="tag">Legacy Node</span>';

  card.innerHTML = `
    <img src="${drop.image || 'https://via.placeholder.com/80?text=Pod'}" class="podcast-art" alt="${drop.title}">
    <div class="podcast-info">
      <div class="podcast-title">${drop.title}</div>
      <div class="podcast-description">
        ${drop.description ? drop.description.substring(0, 85) + '...' : 'Live transmission captured via Aegis Scout.'}
      </div>
      <div class="tag-row">
        ${tagsHtml}
        <span class="tag">Sector: 0x${Math.random().toString(16).slice(2, 6).toUpperCase()}</span>
      </div>
    </div>
    <div class="podcast-actions">
      <button class="nav-item active" style="font-size: 0.7rem; padding: 8px 12px;" onclick="window.zapPodcast('${drop.url}')">ZAP</button>
    </div>
  `;

  // Prepend to feed and manage capacity
  if (liveFeed.firstChild && liveFeed.firstChild.classList.contains('placeholder')) {
    liveFeed.innerHTML = '';
  }
  
  liveFeed.prepend(card);
  feedItems.push(card);

  if (feedItems.length > FEED_CAP) {
    const oldest = feedItems.shift();
    if (oldest && oldest.parentNode === liveFeed) {
      liveFeed.removeChild(oldest);
    }
  }

  // Subtle entry animation handled by CSS transitions if desired, 
  // but for performance we keep it lean.
}

/**
 * Updates the global dashboard stats.
 * @param {Object} stats - Stats object from server.
 */
export function updateStats(stats) {
  if (stats.headBlock) headBlockText.textContent = stats.headBlock;
  if (stats.jackpot) jackpotPoolText.textContent = `${stats.jackpot.toLocaleString()} SATS`;
  
  // Update Sparky Brain stats
  if (stats.sparky) {
    const sparkyCount = document.getElementById('sparkyCount');
    if (sparkyCount) sparkyCount.textContent = stats.sparky.reaped_count;
  }
}

// Global zap handler for the buttons
window.zapPodcast = (url) => {
  console.log(`[V4V] Triggering zap for: ${url}`);
  // This will be linked to WebLN / Alby in Phase 2
  if (window.webln) {
    alert(`WebLN Triggered: Sending zap to ${url}`);
  } else {
    // Open payment modal fallback
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.add('active');
  }
};
