import time
import sqlite3
import os
import random
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from reaper import reap_feed, init_db

script_dir = os.path.dirname(os.path.abspath(__file__))
INDEX_DB = os.environ.get('INDEX_DB', os.path.join(script_dir, 'data', 'podcastindex_feeds.db'))
BRAIN_DB = os.environ.get('BRAIN_DB', os.path.join(script_dir, 'data', 'aegis_brain_sqlite.db'))

# Cache max ID from podcastindex_feeds.db
max_id = None

def get_max_id():
    global max_id
    if max_id is not None:
        return max_id
    try:
        conn = sqlite3.connect(INDEX_DB)
        c = conn.cursor()
        c.execute("SELECT MAX(id) FROM podcasts")
        val = c.fetchone()[0]
        conn.close()
        max_id = val
        return max_id
    except Exception as e:
        print(f"[SCOUT] Error getting max ID: {e}")
        return 4672181 # fallback based on known count

def is_already_harvested_recently(url):
    try:
        conn = sqlite3.connect(BRAIN_DB)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        c = conn.cursor()
        c.execute("SELECT reaped_at FROM stream_intelligence WHERE url = ? ORDER BY reaped_at DESC LIMIT 1", (url,))
        row = c.fetchone()
        conn.close()
        if row:
            reaped_at_str = row[0]
            if 'T' in reaped_at_str:
                reaped_at = datetime.fromisoformat(reaped_at_str)
            else:
                reaped_at = datetime.strptime(reaped_at_str, "%Y-%m-%d %H:%M:%S")
            if datetime.now() - reaped_at < timedelta(days=7):
                return True
        return False
    except Exception:
        # If the table doesn't exist yet or other error, assume not harvested
        return False

def scout_worker():
    max_id_val = get_max_id()
    while True:
        try:
            random_id = random.randint(1, max_id_val)
            conn = sqlite3.connect(INDEX_DB)
            c = conn.cursor()
            c.execute("SELECT url, title FROM podcasts WHERE id >= ? LIMIT 1", (random_id,))
            row = c.fetchone()
            conn.close()
            
            if row:
                url = row[0]
                title = row[1]
                # Check for 7-day deduplication
                if is_already_harvested_recently(url):
                    continue
                
                # Harvest feed!
                reap_feed(url)
                break
            else:
                time.sleep(1)
        except Exception as e:
            print(f"[SCOUT] Worker error: {e}")
            time.sleep(1)
            break

def start_scout_loop():
    print("[SCOUT] Aegis Parallel Scout Daemon Active.")
    # Use ThreadPoolExecutor with 5 threads to run parallel missions
    with ThreadPoolExecutor(max_workers=5) as executor:
        while True:
            executor.submit(scout_worker)
            time.sleep(0.3) # rate-limit submissions to prevent massive spike (~3 requests/sec max)

if __name__ == "__main__":
    init_db()
    # Enable WAL mode on the main brain database
    try:
        conn = sqlite3.connect(BRAIN_DB)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.commit()
        conn.close()
    except Exception:
        pass
    start_scout_loop()
