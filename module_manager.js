// AEGIS MODULE MANAGER | The Swiss Army Knife of Podcasting
// Orchestrates Local (DuckDB), Remote (S3), and API-only modes.

const fs = require('fs');
const path = require('path');

const MODULE_STATE = {
  CORE: true,
  ARCHIVE_LOCAL: false,
  ARCHIVE_REMOTE: false,
  SCOUT: true, // The Active Explorer
  GHOST: false    // IPFS/Distributed
};

/**
 * Detects available modules on the local filesystem.
 */
function probeModules() {
  const archivePath = path.join(__dirname, 'data', 'aegis_brain.db');
  if (fs.existsSync(archivePath)) {
    console.log("[MODULE] Archive (Local) detected.");
    MODULE_STATE.ARCHIVE_LOCAL = true;
  }
  
  if (process.env.S3_ENDPOINT) {
    console.log("[MODULE] Skyhook (S3 Remote) detected.");
    MODULE_STATE.ARCHIVE_REMOTE = true;
  }
}

/**
 * Routes a search query based on the active module.
 */
async function performEverythingSearch(query) {
  if (MODULE_STATE.ARCHIVE_LOCAL) {
    return queryLocalDuckDB(query);
  } else if (MODULE_STATE.ARCHIVE_REMOTE) {
    return queryRemoteS3(query);
  } else {
    return queryPodcastIndexAPI(query);
  }
}

// Initial probe
probeModules();

module.exports = { MODULE_STATE, performEverythingSearch };
