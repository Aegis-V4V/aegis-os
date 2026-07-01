# Aegis OS — Integrations Panel Spec
> Branch: `feat/aegis-os-integrations-panel`  
> Status: SPEC (no live auth, no real tokens)  
> Last Updated: 2026-06-27

---

## 1. Integrations Panel

### 1.1 Provider Registry

Providers are declared statically in `frontend/src/integrations/providers.js`.  
No live credentials, OAuth flows, or message-sending are implemented in this spec.

| Slot | Provider | Status (v1) | Notes |
|------|----------|-------------|-------|
| 0 | **Discord** | Active (UI first) | Bot service-account model |
| 1 | Slack | Placeholder | Reserved |
| 2 | Telegram | Placeholder | Reserved |
| 3 | Matrix | Placeholder | Reserved |
| 4 | Stoat | Placeholder | Internal relay — future |

### 1.2 Connection States

Each provider card carries one of three states:

| State | CSS Class | Indicator |
|-------|-----------|-----------|
| `unbound` | `.state-unbound` | Grey ring — "Not connected" |
| `bound` | `.state-bound` | Green ring — "Connected" |
| `error` | `.state-error` | Red ring — "Auth error / Revoked" |

State is read from a local config object (`integrations.config.js`) — **no live API calls in this spec**.

### 1.3 Provider Card Layout

```
┌─────────────────────────────────────────────┐
│  [LOGO]  Discord                [● BOUND]   │
│          Bot: aegis-prime#0001              │
│          Scopes: read_messages, send_msgs   │
│  ─────────────────────────────────────────  │
│  [Configure]              [Disconnect]      │
└─────────────────────────────────────────────┘
```

- **Placeholder slots** render greyed-out with a "Coming Soon" badge — no configure/disconnect controls.

---

## 2. Auth Model

> **Implementation gate:** Do NOT implement OAuth flows until this spec is approved and a dedicated auth batch is opened.

### 2.1 Operator-Bot Identity (Service Account)

- One bot identity per Aegis OS instance (the "operator bot").
- Bot token is injected via environment variable: `AEGIS_DISCORD_BOT_TOKEN`, etc.
- Scoped to minimum required permissions per provider (read-only for now).
- Token is **never** stored in the frontend or exposed in any log/response.
- Stored reference in backend `.env` only; frontend reads a sanitized status object (connected/disconnected/error) from the local API.

```
Operator Bot model:
  [.env] AEGIS_DISCORD_BOT_TOKEN=...
       ↓
  [backend: integrations.js] reads token, exposes /api/integrations/status
       ↓
  [frontend: IntegrationsPanel.js] reads status only (no token)
```

### 2.2 User-Owned Identity Binding (Per-User Channel Model)

Mirrors the **DeerFlow per-user channel model**:

- Each Aegis OS user may independently bind their own channel identity (e.g., their personal Discord account via a separate OAuth grant).
- User binding is independent from the operator bot — the bot is a service account; user binding is a personal delegation.
- Binding state is stored per user in the local DB: `user_integrations` table (schema TBD in implementation batch).
- **Read contract**: `GET /api/integrations/user-bindings` → `[{ provider, state, bound_at }]`
- UI shows both operator bot state and user binding state independently.

### 2.3 Security Constraints (Spec-Level)

- No secrets in frontend code.
- No secrets in any committed file (use `.env.example` for reference only).
- All provider tokens are backend-only, redacted before any log output.
- `.gitignore` must cover `.env` (already present in repo).

---

## 3. Skills Panel

### 3.1 Skill Model

Skills are portable `.md` files following a model-agnostic descriptor format.

**Skill file format** (`skills/<skill-name>/SKILL.md`):

```yaml
---
name: skill-name
version: 1.0.0
description: One-line human-readable description
license: MIT | proprietary | unknown
requires: []      # other skill names this depends on
tags: [tag1, tag2]
---

# Body: Markdown instructions consumed by the agent runtime.
```

### 3.2 License Enforcement

| License Field | UI Treatment | Executable? |
|---------------|-------------|-------------|
| `MIT` / open | Normal card | ✅ Yes |
| `proprietary` + valid entitlement | Locked badge (unlocked if entitled) | ✅ Yes (with license) |
| `unknown` | ⚠️ "Reference Only" badge | ❌ No — cannot execute |

Skills with `license: unknown` are displayed in a read-only reference shelf — no install/toggle controls.

### 3.3 Panel Controls

```
┌──────────────────────────────────────────────────────┐
│  SKILLS                              [+ Install]     │
│  ──────────────────────────────────────────────────  │
│  [●] web-search       v1.2   MIT        [Toggle]     │
│  [●] pubmed-fetch     v1.0   MIT        [Toggle]     │
│  [○] keygen-lookup    v0.9   proprietary [Locked 🔒] │
│  ──────────────────────────────────────────────────  │
│  REFERENCE ONLY (license: unknown)                   │
│  [📄] legacy-parser   v0.1   unknown    [View Only]  │
└──────────────────────────────────────────────────────┘
```

- Install: opens a file picker for `.md` skill files (no network fetch in v1).
- Toggle: enable/disable a skill without uninstalling.
- Locked: skill present but requires entitlement — shows lock icon.
- Reference: read-only, opens the raw `.md` in a modal viewer.

### 3.4 Read Contract

```
GET /api/skills
→ [{ name, version, license, enabled, description, tags }]

POST /api/skills/toggle
→ { name, enabled: bool }

// No execution endpoint in this spec — skills are invoked by the agent runtime only.
```

---

## 4. Telemetry Panel

### 4.1 Purpose

Read-only surface for LLM usage rollup. **Does NOT duplicate the emitter.** Links to the existing telemetry source.

### 4.2 Read Contract (T1 Telemetry Emitter Interface)

The T1 telemetry emitter (existing, not modified here) must expose:

```
GET /api/telemetry/rollup
→ {
    period: "24h" | "7d" | "30d",
    llm_calls: number,
    total_tokens: { input: number, output: number },
    models: [{ name: string, calls: number, tokens: number }],
    estimated_cost_usd: number   // optional, null if not configured
  }
```

The frontend panel **reads this endpoint only**. It does not write, emit, or transform telemetry data.

### 4.3 Panel Layout

```
┌──────────────────────────────────────────────────────┐
│  TELEMETRY                        [24h ▼]            │
│  ──────────────────────────────────────────────────  │
│  LLM Calls:        142                               │
│  Total Tokens:     84,210  (in: 61k / out: 23k)     │
│  Est. Cost:        $0.12                             │
│  ──────────────────────────────────────────────────  │
│  BY MODEL                                            │
│  gemini-2.5-pro    98 calls    72k tokens            │
│  gemini-flash      44 calls    12k tokens            │
└──────────────────────────────────────────────────────┘
```

- Period selector: 24h / 7d / 30d (query param on read contract).
- If emitter is not available: panel shows "Telemetry unavailable" placeholder — no crash.
- Estimated cost is optional and shows "—" if `estimated_cost_usd` is null.

---

## 5. Out of Scope (This Batch)

- Real OAuth / bot token acquisition
- Sending messages to any integration
- Paywall logic or license enforcement
- Database persistence (read contracts only — no schema migration)
- Skill execution runtime

---

*Spec authored by SPOKE - AG | aegis-os `feat/aegis-os-integrations-panel`*
