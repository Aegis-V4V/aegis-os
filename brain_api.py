from flask import Flask, jsonify, request
import sqlite3
import subprocess
import os

app = Flask(__name__)
DB_PATH = os.path.expanduser('~/aegis-os/data/aegis_brain.db')
SCOUT_SERVICE = 'aegis-scout'

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        from flask import make_response
        res = make_response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return res, 200

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/api/intelligence', methods=['GET', 'OPTIONS'])
def get_intelligence():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    v4v_only = request.args.get('v4v') == 'true'
    conn = get_db_connection()
    if v4v_only:
        intelligence = conn.execute(
            'SELECT * FROM stream_intelligence WHERE baseline_score > 0 ORDER BY reaped_at DESC LIMIT 50'
        ).fetchall()
    else:
        intelligence = conn.execute(
            'SELECT * FROM stream_intelligence ORDER BY reaped_at DESC LIMIT 50'
        ).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in intelligence])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    total = conn.execute('SELECT COUNT(*) FROM stream_intelligence').fetchone()[0]
    v4v = conn.execute('SELECT COUNT(*) FROM stream_intelligence WHERE baseline_score > 0').fetchone()[0]
    conn.close()
    return jsonify({"reaped_count": total, "v4v_count": v4v})

@app.route('/api/scout/status', methods=['GET'])
def scout_status():
    result = subprocess.run(
        ['systemctl', 'is-active', SCOUT_SERVICE],
        capture_output=True, text=True
    )
    active = result.stdout.strip() == 'active'
    return jsonify({"active": active, "status": result.stdout.strip()})

@app.route('/api/scout/toggle', methods=['POST', 'OPTIONS'])
def scout_toggle():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    result = subprocess.run(
        ['systemctl', 'is-active', SCOUT_SERVICE],
        capture_output=True, text=True
    )
    currently_active = result.stdout.strip() == 'active'
    action = 'stop' if currently_active else 'start'
    subprocess.run(['sudo', 'systemctl', action, SCOUT_SERVICE], timeout=10)
    return jsonify({"active": not currently_active, "action": action})

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
