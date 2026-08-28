# Aegis Console

The unified Podcasting 2.0 operating system, audio console, and Discord streaming suite.

---

## 🏛️ Architecture & Workspace

* **`apps/aegis-os`** (`aegis-os`): Core Podcasting 2.0 harvester, crawler, RSS validator, PostgreSQL/SQLite data pipeline, web server, and web player frontend.
* **`apps/discord-bot`** (`aegis-pod-bot`): TypeScript Discord bot streaming episodes and radio stations into voice channels with live boostagram feeds and listening rooms.
* **`web/portal`** (`aegis-portal`): Public marketing portal and documentation site (`aegis.os.space`).
* **`ops/`**: Systemd unit files (`aegis-brain-api.service`, `aegis-scout.service`, `aegis-pod-bot.service`) and deployment runbooks.

---

## 🚀 Quick Start

### 1. Install Workspace Dependencies
```bash
npm install
```

### 2. Build Workspace
```bash
npm run build
```

### 3. Run Test Suites
```bash
# Run Discord bot integration test suites
cd apps/discord-bot
node scripts/test_agora_commands.js
node scripts/test_agora_state.js
node scripts/test_akroasis_dashboard.js
node scripts/test_asphaleia_health.js
node scripts/test_chapters_comments.js
node scripts/test_choros_rhema.js
node scripts/test_dashboard_hardening.js
node scripts/test_horai_sync.js
node scripts/test_keryx_dedupe.js
```
