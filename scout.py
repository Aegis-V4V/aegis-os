import time
import sqlite3
import os
import random
from reaper import reap_feed, init_db

# We assume the local metadata spider.db was also moved or we can use a fresh one
INDEX_DB = os.path.expanduser('~/aegis-os/data/spider.db')

def scout_mission():
    print("[SCOUT] Scanning horizons...")
    try:
        conn = sqlite3.connect(INDEX_DB)
        c = conn.cursor()
        c.execute("SELECT url FROM feeds ORDER BY RANDOM() LIMIT 1")
        row = c.fetchone()
        conn.close()
        
        if row:
            url = row[0]
            reap_feed(url)
        else:
            print("[SCOUT] No targets found in index. Waiting for new coordinates.")
    except Exception as e:
        print(f"[SCOUT] Error: {e}")

if __name__ == "__main__":
    init_db()
    print("[SCOUT] Aegis Scout Daemon Active.")
    while True:
        scout_mission()
        time.sleep(60) # 1 mission per minute
