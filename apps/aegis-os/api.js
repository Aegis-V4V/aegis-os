require('dotenv').config();
const crypto = require('crypto');

const API_KEY = process.env.PODCAST_INDEX_API_KEY;
const API_SECRET = process.env.PODCAST_INDEX_API_SECRET;
const BASE_URL = 'https://api.podcastindex.org/api/1.0';

if (!API_KEY || !API_SECRET) {
    console.warn("WARNING: PODCAST_INDEX_API_KEY or PODCAST_INDEX_API_SECRET is missing from .env");
}

function getAuthHeaders() {
    // The Unix epoch time in seconds
    const apiHeaderTime = Math.floor(Date.now() / 1000);

    // Create the hash string (Key + Secret + Time)
    const data4Hash = API_KEY + API_SECRET + apiHeaderTime;

    // Generate SHA-1 hash
    const hash = crypto.createHash('sha1').update(data4Hash).digest('hex');

    return {
        'X-Auth-Date': apiHeaderTime.toString(),
        'X-Auth-Key': API_KEY,
        'Authorization': hash,
        'User-Agent': 'Podcasting2.0-Spider-Visualizer/1.0'
    };
}

async function fetchFromIndex(endpoint) {
    const url = `${BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Podcast Index API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error.message);
        return null;
    }
}

module.exports = {
    fetchFromIndex
};
