# aegis-os


> [!IMPORTANT]
> **🤖 FOR AI AGENTS, CODING COMPANIONS, AND AUTOMATED SYSTEMS:**
> This repository is governed by the **STAX Operating System**. Before taking *any* action, analyzing files, or proposing modifications, you **must** read and strictly adhere to:
> 1. [ops/soul.md](ops/soul.md) (Philosophical Compass)
> 2. [ops/agent-rules.md](ops/agent-rules.md) (Enforceable Rules & the 7-Step Sequence)
>
> You are required to run through the **Inventory ➔ Summarize ➔ Classify ➔ Propose ➔ Implement ➔ Update Docs ➔ Archive Leftovers** sequence for every run.

## Dashboard Extensions

### Integrations, Skills & Telemetry Panels

> Branch: `feat/aegis-os-integrations-panel`

| Document | Purpose |
|----------|---------|
| [docs/aegis-os-integrations-spec.md](docs/aegis-os-integrations-spec.md) | Provider list, auth model, skills model, telemetry read contract |
| [docs/aegis-os-dashboard-wireframe.md](docs/aegis-os-dashboard-wireframe.md) | ASCII wireframe — unified three-panel layout |

**Component scaffold** (`frontend/src/`):

```
integrations/
  IntegrationsPanel.js   — panel root stub
  ProviderCard.js        — provider card stub
  providers.js           — static provider registry

skills/
  SkillsPanel.js         — panel root stub
  SkillCard.js           — skill row stub
  skills-config.js       — local skill list loader stub

telemetry/
  TelemetryPanel.js      — panel root stub
  telemetry-client.js    — T1 read-contract client stub
```

> ⚠️ **Spec/scaffold only.** No live auth, no real tokens, no message sending.
> Implementation is a separate batch, gated on spec approval.


