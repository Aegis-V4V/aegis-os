import sqlite3
import requests
import xml.etree.ElementTree as ET
import time
import random
import os
import json
from datetime import datetime

DB_PATH = os.path.expanduser('~/aegis-os/data/aegis_brain.db')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS stream_intelligence (
        id TEXT PRIMARY KEY,
        url TEXT,
        title TEXT,
        baseline_score INTEGER,
        reaped_at TEXT,
        weirdness INTEGER,
        connections TEXT
    )''')
    conn.commit()
    conn.close()

def reap_feed(url):
    print(f"[REAPER] Harvesting: {url}")
    try:
        response = requests.get(url, timeout=15)
        root = ET.fromstring(response.content)
        
        # Simple extraction logic
        channel = root.find('channel')
        title = channel.find('title').text if channel.find('title') is not None else "Unknown"
        
        # Baseline Scoring (simplified for Python)
        score = 0
        namespaces = {'podcast': 'https://podcastindex.org/namespace/1.0'}
        if root.find('.//podcast:value', namespaces) is not None:
            score += 50 # V4V detected
        
        connections = []
        # Find people/guests
        for person in root.findall('.//podcast:person', namespaces):
            connections.append({
                "name": person.text,
                "role": person.attrib.get('role', 'guest'),
                "type": "PERSON"
            })

        weirdness = len(connections) * 2 # Simple heuristic
        
        save_intelligence(url, title, score, weirdness, connections)
        
    except Exception as e:
        print(f"[REAPER] Failed to reap {url}: {e}")

def save_intelligence(url, title, score, weirdness, connections):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    c = conn.cursor()
    import uuid
    uid = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    c.execute("INSERT INTO stream_intelligence VALUES (?, ?, ?, ?, ?, ?, ?)",
              (uid, url, title, score, now, weirdness, json.dumps(connections)))
    conn.commit()
    conn.close()
    print(f"[REAPER] Intelligence committed. Score: {score}% | Weirdness: {weirdness}")

if __name__ == "__main__":
    init_db()
