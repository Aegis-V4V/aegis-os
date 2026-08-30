// AEGIS REAPER | The Intelligence Harvest Engine
// Slices through RSS feeds to extract the "Tangled Web" and discard the bulk.

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { Client } = require('pg');
require('dotenv').config();

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// --- POSTGRES CONNECTION ---
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aegis_os'
});

/**
 * The Reaper's Blade: Slices a feed to extract semantic connections.
 * @param {string} feedUrl - The RSS URL to harvest.
 */
async function reapFeed(feedUrl) {
  console.log(`[REAPER] Harvesting: ${feedUrl}`);
  
  try {
    const response = await axios.get(feedUrl, { timeout: 10000 });
    const xml = response.data;
    const jsonObj = parser.parse(xml);
    const channel = jsonObj.rss.channel;

    // 1. Calculate Baseline Compliance Score (The "Instant" Score)
    const baseline = calculateBaseline(channel);
    console.log(`[REAPER] Baseline Score: ${baseline.omni}%`);

    // 2. Extract The Tangled Web (Cross-Pollination)
    const connections = extractConnections(channel);
    console.log(`[REAPER] Extracted ${connections.length} cross-links.`);

    // 3. Save to Postgres (Intelligence only, discard the rest)
    await saveIntelligence(feedUrl, baseline, connections);

  } catch (err) {
    console.error(`[REAPER] Harvest Failed for ${feedUrl}:`, err.message);
  }
}

/**
 * Calculates a quick "Predicted Score" based on tag presence.
 */
function calculateBaseline(channel) {
  const tags = {
    v4v: !!(channel['podcast:value'] || channel.value),
    locked: !!channel['podcast:locked'],
    person: !!channel['podcast:person'],
    transcript: !!channel['podcast:transcript'],
    funding: !!channel['podcast:funding']
  };

  let score = 0;
  if (tags.v4v) score += 40;
  if (tags.locked) score += 10;
  if (tags.person) score += 10;
  if (tags.transcript) score += 20;
  if (tags.funding) score += 20;

  return { omni: score, tags };
}

/**
 * Maps the "Invisible Web" of shared identifiers.
 */
function extractConnections(channel) {
  const links = [];

  // Person/Guest Overlaps
  const persons = Array.isArray(channel['podcast:person']) ? channel['podcast:person'] : [channel['podcast:person']];
  persons.filter(p => p).forEach(p => {
    links.push({ type: 'PERSON', value: p['#text'] || p, role: p['@_role'] });
  });

  // Economic Overlaps (Value Nodes)
  const value = channel['podcast:value'];
  if (value && value['podcast:valueRecipient']) {
    const recipients = Array.isArray(value['podcast:valueRecipient']) ? value['podcast:valueRecipient'] : [value['podcast:valueRecipient']];
    recipients.forEach(r => {
      links.push({ type: 'VALUE_NODE', value: r['@_address'], label: r['@_name'] });
    });
  }

  // Recommendation Overlaps (Podroll)
  // (Future implementation: parsing podcast:podroll tags)

  return links;
}

const { db, con } = require('./init_brain');
const { MODULE_STATE } = require('./module_manager');

/**
 * Commits the intelligence to the Brain.
 */
async function saveIntelligence(url, baseline, connections) {
  if (!MODULE_STATE.ARCHIVE_LOCAL) {
    console.log(`[REAPER] Lite-Mode: Intelligence logged but not cached.`);
    return;
  }

  const id = require('crypto').randomUUID();
  const timestamp = new Date().toISOString();
  
  // Calculate "Weirdness" (Entropy) for the Scout's nightly report
  const weirdness = calculateWeirdness(connections);

  con.run(`
    INSERT INTO stream_intelligence (id, url, title, baseline_score, reaped_at, connections)
    VALUES (?, ?, ?, ?, ?, ?)
  `, id, url, baseline.title || "Unknown", baseline.omni, timestamp, JSON.stringify(connections), (err) => {
    if (err) console.error("[REAPER] Brain Commit Failed:", err);
    else console.log(`[REAPER] Intelligence committed to Brain. Weirdness: ${weirdness}`);
  });
}

function calculateWeirdness(connections) {
  // Simple heuristic: unusual roles or many distinct connections = high weirdness
  let score = 0;
  connections.forEach(c => {
    if (c.type === 'PERSON' && c.role && c.role.length > 15) score += 5; // Long/strange roles
    if (c.type === 'VALUE_NODE') score += 2;
  });
  return score;
}

module.exports = { reapFeed };
