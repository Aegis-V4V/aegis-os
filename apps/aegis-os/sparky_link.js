// AEGIS SPARKY LINK | The Remote Intelligence Bridge
// Connects the local Terminal to Chantecler-01's Brain (67.205.162.200).

const axios = require('axios');

const SPARKY_IP = '67.205.162.200'; // chantecler-01
const SPARKY_PORT = 3000;

/**
 * Fetches the latest intelligence reaped by the Scout on Sparky.
 */
async function getSparkyIntelligence() {
  try {
    const response = await axios.get(`http://${SPARKY_IP}:${SPARKY_PORT}/api/intelligence`);
    return response.data;
  } catch (error) {
    console.error("[SPARKY] Bridge Offline. Ensure Aegis is running on Sparky.");
    return null;
  }
}

/**
 * Sends a manual "Reap" command to Sparky.
 */
async function triggerRemoteReap(url) {
  try {
    await axios.post(`http://${SPARKY_IP}:${SPARKY_PORT}/api/reap`, { url });
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { getSparkyIntelligence, triggerRemoteReap };
