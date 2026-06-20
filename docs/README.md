---
category: software
plane_id: 
profit_likelihood: high
project: None
status: archived
tags: []
title: README
type: reference
updated_at: "2026-05-17T19:11:22Z"
---

# Project: Aegis OS 🛡️

---
tags: [flagship, podcasting, backend]
status: active
type: project
---

Aegis OS is a high-performance headless podcast intelligence harvester, scout, and analyzer. It operates as the decentralized "Brain" of your podcast application, indexing millions of episodes, scraping metadata, querying Value4Value RSS feeds, and feeding a local graphical dashboard.

## 📁 Project Directory Structure

* **Main Workstation Repository**: `C:\Users\aewoo\Desktop\Antigravity Workspace\adventures-of-sparky-and-claw`
* **Headless Deployment Host**: DigitalOcean Droplet **`chantecler-01`** (`67.205.162.200`)
* **Local Plans & Prelims**:
  * [plans/cloud_migration_walkthrough.md](plans/cloud_migration_walkthrough.md) — Detailed machine-readable migration logs and systemd service scripts.
  * [plans/cloud_migration_summary.md](plans/cloud_migration_summary.md) — Condensed, bulleted history of all chat work completed across Aegis OS and Access Paralegal projects.

## 🛠️ System Overview

Aegis OS is split into two components:
1. **The local dashboard (`Antigravity aegis-os`)**: Front-end visualizer which displays neural guest connections, Value4Value statistics, and system telemetry.
2. **The remote brain (`chantecler-01`)**: Running dual background systemd daemons:
   * **`aegis-scout`**: The harvesting engine (`scout.py` and `reaper.py`) that queries RSS streams.
   * **`aegis-brain-api`**: A lightweight Python Flask micro-server (`brain_api.py`) exposing processed data on port `3000` to the local dashboard.
