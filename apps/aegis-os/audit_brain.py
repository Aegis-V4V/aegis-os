import sqlite3
import json
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get('BRAIN_DB', os.path.join(script_dir, 'data', 'aegis_brain_sqlite.db'))

def audit():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    total = c.execute('SELECT COUNT(*) FROM stream_intelligence').fetchone()[0]
    v4v_count = c.execute('SELECT COUNT(*) FROM stream_intelligence WHERE baseline_score > 0').fetchone()[0]
    
    # Analyze connections
    all_connections = []
    rows = c.execute('SELECT connections FROM stream_intelligence').fetchall()
    for row in rows:
        if row['connections']:
            all_connections.extend(json.loads(row['connections']))
            
    # Find top guests
    guest_counts = {}
    for conn_obj in all_connections:
        if conn_obj['type'] == 'PERSON':
            name = conn_obj['name']
            guest_counts[name] = guest_counts.get(name, 0) + 1
            
    top_guests = sorted(guest_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    report = {
        "total_nodes": total,
        "v4v_percentage": (v4v_count / total * 100) if total > 0 else 0,
        "top_connectors": top_guests
    }
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    audit()
