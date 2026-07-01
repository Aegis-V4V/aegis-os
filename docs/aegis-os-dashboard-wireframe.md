# Aegis OS — Dashboard Wireframe
> Branch: `feat/aegis-os-integrations-panel`  
> Status: SPEC (ASCII wireframe — implementation separate batch)

---

## Layout Overview

Three-panel dashboard appended to the existing Aegis OS UI shell.  
The existing live feed / audit log / visualizer panels are **unchanged**.

```
╔══════════════════════════════════════════════════════════════════════╗
║  AEGIS OS                                    [Live] [Pods] [Admin]  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─── INTEGRATIONS ──────────────┐  ┌─── SKILLS ─────────────────┐  ║
║  │                               │  │                             │  ║
║  │  [●] Discord  ▌BOUND          │  │  [●] web-search    MIT      │  ║
║  │      aegis-prime#0001         │  │  [●] pubmed-fetch  MIT      │  ║
║  │      [Configure] [Disconnect] │  │  [○] keygen-lookup 🔒       │  ║
║  │  ─────────────────────────── │  │  ─────────────────────────  │  ║
║  │  [○] Slack      PLACEHOLDER   │  │  REFERENCE ONLY             │  ║
║  │  [○] Telegram   PLACEHOLDER   │  │  [📄] legacy-parser ⚠️     │  ║
║  │  [○] Matrix     PLACEHOLDER   │  │                             │  ║
║  │  [○] Stoat      PLACEHOLDER   │  │             [+ Install]     │  ║
║  │                               │  │                             │  ║
║  └───────────────────────────────┘  └─────────────────────────────┘  ║
║                                                                      ║
║  ┌─── TELEMETRY ─────────────────────────────────────────────────┐   ║
║  │                                              [24h ▼]          │   ║
║  │  LLM Calls: 142    Tokens: 84,210    Est. Cost: $0.12         │   ║
║  │  ─────────────────────────────────────────────────────────    │   ║
║  │  gemini-2.5-pro   98 calls   72k tokens                       │   ║
║  │  gemini-flash     44 calls   12k tokens                       │   ║
║  └────────────────────────────────────────────────────────────── ┘   ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  [EXISTING: Live Feed] [EXISTING: Audit Log] [EXISTING: Visualizer]  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Panel Placement

| Panel | Position | HTML container ID |
|-------|----------|-------------------|
| Integrations | Top-left | `#integrations-panel` |
| Skills | Top-right | `#skills-panel` |
| Telemetry | Full-width below top row | `#telemetry-panel` |
| Existing feed/audit/viz | Unchanged — below telemetry | (existing IDs) |

---

## Integrations Panel — State Indicators

```
[●]  Green dot  = BOUND
[○]  Grey dot   = UNBOUND / PLACEHOLDER
[!]  Red dot    = ERROR
```

Provider card hover state shows tooltip with last-connected timestamp and scope list.  
Placeholder cards are non-interactive (cursor: not-allowed, opacity: 0.4).

---

## Skills Panel — Control Matrix

```
Active skill row:
  [●] skill-name   version   license   [Toggle ON/OFF]

Locked skill row:
  [○] skill-name   version   proprietary   [🔒 Locked]
  → Click opens "Unlock requires entitlement" modal

Reference-only row:
  [📄] skill-name   version   ⚠️ unknown   [View Only]
  → Click opens read-only markdown modal viewer
```

---

## Telemetry Panel — Period Selector

```
[24h]  [7d]  [30d]   ← tab strip, default 24h
```

- Tabs swap the period query param on the read contract endpoint.
- Data refreshes on tab change (single fetch, no polling in v1).
- Empty state: "No telemetry data for this period."
- Unavailable state: "Telemetry service unavailable." (emitter offline).

---

## Component File Map

```
frontend/src/
├── integrations/
│   ├── IntegrationsPanel.js      ← panel root stub
│   ├── ProviderCard.js           ← individual provider card stub
│   └── providers.js              ← static provider registry
├── skills/
│   ├── SkillsPanel.js            ← panel root stub
│   ├── SkillCard.js              ← individual skill row stub
│   └── skills-config.js          ← local skill list loader stub
└── telemetry/
    ├── TelemetryPanel.js         ← panel root stub
    └── telemetry-client.js       ← read-contract client stub
```

---

*Wireframe authored by SPOKE - AG | aegis-os `feat/aegis-os-integrations-panel`*
