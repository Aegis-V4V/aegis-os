// aegis-os.io | Nostr Integration Module
// Handles NIP-07 extension and Relay connections

const nostrFeed = document.getElementById('nostrFeed');

/**
 * Initializes Nostr connectivity.
 */
export async function initNostr() {
  console.log("[NOSTR] Initializing relay connections...");
  
  // Simulated initial intelligence
  addNostrItem("Podcasting2.0_Bot", "New V4V activity detected in the US Northeast sector.");
  addNostrItem("Satoshi_Quotes", "The root problem with conventional currency is all the trust that's required to make it work.");
}

/**
 * Appends a live intelligence item to the Nostr panel.
 * @param {string} user - Nostr pubkey or handle.
 * @param {string} comment - The content of the note/zap.
 */
export function addNostrItem(user, comment) {
  const item = document.createElement('div');
  item.className = 'nostr-item';
  item.innerHTML = `
    <div class="nostr-user">${user}</div>
    <div class="nostr-comment">${comment}</div>
  `;
  
  nostrFeed.prepend(item);
  
  // Cap to 20 items for performance
  if (nostrFeed.children.length > 20) {
    nostrFeed.removeChild(nostrFeed.lastChild);
  }
}

// Logic for Nostr login (NIP-07) will go here in Phase 2
export async function nostrLogin() {
  if (window.nostr) {
    try {
      const pubkey = await window.nostr.getPublicKey();
      console.log("[NOSTR] Logged in with pubkey:", pubkey);
      return pubkey;
    } catch (e) {
      console.error("[NOSTR] Login failed", e);
    }
  } else {
    console.warn("[NOSTR] No Nostr extension detected.");
  }
}
