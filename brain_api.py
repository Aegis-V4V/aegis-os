from flask import Flask, jsonify, request
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.expanduser('~/aegis-os/data/aegis_brain.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/intelligence', methods=['GET'])
def get_intelligence():
    conn = get_db_connection()
    intelligence = conn.execute('SELECT * FROM stream_intelligence ORDER BY reaped_at DESC LIMIT 50').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in intelligence])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    count = conn.execute('SELECT COUNT(*) FROM stream_intelligence').fetchone()[0]
    conn.close()
    return jsonify({"reaped_count": count})

if __name__ == '__main__':
    # Flask is more robust than the built-in server for this
    app.run(host='0.0.0.0', port=3000)
