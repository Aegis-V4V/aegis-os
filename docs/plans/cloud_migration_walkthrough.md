---
category: software
plane_id: 
profit_likelihood: high
project: None
status: archived
tags: []
title: cloud_migration_walkthrough
type: reference
updated_at: "2026-05-17T19:11:22Z"
---

> [!WARNING]
> Historical pre-monorepo record only. Its checkout paths and systemd examples are superseded by
> `docs/consolidation-provenance.md` and the units under `ops/`. Do not execute these instructions.

# Aegis OS Cloud Migration: Full Server Setup & Architecture Handoff 📜

---
tags: [architecture, sysadmin, systemd, sqlite, digitalocean, security, firewall]
status: active
type: walkthrough
---

This document represents the complete, highly detailed machine-readable log and architectural specification of the Aegis OS backend migration from your local Sparky home server (`192.168.0.176`) to your new DigitalOcean Droplet, **`chantecler-01`** (`67.205.162.200`).

---

## 🖥 Honor Roll: Server Environment Details

* **Hostname**: `chantecler-01`
* **Public IPv4 Address**: `67.205.162.200`
* **Deployment User**: `aewoodyard` (with passwordless administrative `/etc/sudoers.d/aewoodyard` permissions)
* **Codebase Home Directory**: `/home/aewoodyard/aegis-os/`
* **Python Runtime Virtualenv**: `/home/aewoodyard/aegis-os/venv/`
* **Global Node.js Version**: `v18.19.1`

---

## ⚙️ Systemd Service Specifications

Both services reside in `/etc/systemd/system/` and run under the security boundary of the non-root `aewoodyard` user.

### 1. aegis-scout.service
```ini
[Unit]
Description=Aegis OS Scout Daemon
After=network.target

[Service]
ExecStart=/home/aewoodyard/aegis-os/venv/bin/python /home/aewoodyard/aegis-os/scout.py
WorkingDirectory=/home/aewoodyard/aegis-os
StandardOutput=inherit
StandardError=inherit
Restart=always
User=aewoodyard

[Install]
WantedBy=multi-user.target
```

### 2. aegis-brain-api.service
```ini
[Unit]
Description=Aegis Brain API (Sparky)
After=network.target

[Service]
ExecStart=/home/aewoodyard/aegis-os/venv/bin/python /home/aewoodyard/aegis-os/brain_api.py
WorkingDirectory=/home/aewoodyard/aegis-os
StandardOutput=inherit
StandardError=inherit
Restart=always
User=aewoodyard

[Install]
WantedBy=multi-user.target
```

---

## 🛠️ Step-by-Step Server Setup Record

### Step 1: User & Permissions Configuration
```bash
# Executed as root on chantecler-01
useradd -m -s /bin/bash aewoodyard
usermod -aG sudo aewoodyard
echo 'aewoodyard ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/aewoodyard
```

### Step 2: SSH Authorized Keys Import
```bash
# Configured passwordless key authorization
mkdir -p /home/aewoodyard/.ssh
cp /root/.ssh/authorized_keys /home/aewoodyard/.ssh/authorized_keys
chown -R aewoodyard:aewoodyard /home/aewoodyard/.ssh
chmod 700 /home/aewoodyard/.ssh
chmod 600 /home/aewoodyard/.ssh/authorized_keys
```

### Step 3: Server-to-Server High-Speed Transfer
```bash
# Executed directly from Sparky home server to Cloud Droplet bypass workstation
scp -o StrictHostKeyChecking=no ~/aegis-os.tar.gz root@67.205.162.200:~/
# Copied the massive sqlite databases directly
scp -r ~/aegis-os/data root@67.205.162.200:/home/aewoodyard/aegis-os/
```

### Step 4: Python Virtual Environment Installation
```bash
# Rebuilt virtual environment under aewoodyard user
cd /home/aewoodyard/aegis-os
rm -rf venv
python3 -m venv venv
./venv/bin/pip install flask requests python-dotenv duckdb
```

### Step 5: Node native SQLite3 Compilation
```bash
# Built native SQLite C++ bindings directly from source on chantecler-01
npm install --build-from-source sqlite3
```

---

## 🔒 Security Hardening & Firewall Specifications

We executed a comprehensive security audit and lockdown to protect the server from automated hacking attempts.

### 1. SSH Override Rules (`/etc/ssh/sshd_config.d/99-hardened.conf`)
We created a custom override file to block direct root logins and passwords:
```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```
This forces all SSH connections to use public keys and connect strictly via the non-root `aewoodyard` user.

### 2. Network Firewall Configuration (UFW)
A strict, zero-trust incoming firewall policy was deployed:
```bash
# Deployed UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable
```

### UFW Verification Output:
```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                  
3000/tcp                   ALLOW IN    Anywhere                  
22/tcp (v6)                ALLOW IN    Anywhere (v6)             
3000/tcp (v6)              ALLOW IN    Anywhere (v6)             
```

---

## 🔎 Verification & Diagnostics Log

Systemd service outputs confirmed both daemons successfully executing:

```text
● aegis-scout.service - Aegis OS Scout Daemon
     Active: active (running) since Sun 2026-05-17 04:31:50 UTC
   Main PID: 14083 (python)
     CGroup: /system.slice/aegis-scout.service
             └─14083 /home/aewoodyard/aegis-os/venv/bin/python /home/aewoodyard/aegis-os/scout.py

● aegis-brain-api.service - Aegis Brain API (Sparky)
     Active: active (running) since Sun 2026-05-17 04:31:50 UTC
   Main PID: 14131 (python)
     CGroup: /system.slice/aegis-brain-api.service
             └─14131 /home/aewoodyard/aegis-os/venv/bin/python /home/aewoodyard/aegis-os/brain_api.py

May 17 04:31:51 chantecler-01 python[14131]:  * Serving Flask app 'brain_api'
May 17 04:31:51 chantecler-01 python[14131]:  * Running on all addresses (0.0.0.0)
May 17 04:31:51 chantecler-01 python[14131]:  * Running on http://67.205.162.200:3000
May 17 04:31:54 chantecler-01 python[14131]: 108.254.0.232 - - [17/May/2026 04:31:54] "GET /api/intelligence HTTP/1.1" 200 -
```
