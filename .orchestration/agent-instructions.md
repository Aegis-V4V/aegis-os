---
repo_name: aegis-os
repo_alias: aegis-os
repo_type: Podcast Infrastructure / Compliance Engine
security_tier: 2
lifecycle: Active
cluster: V4V
updated: '2026-06-20'
horizon:
  current_goal: Podcasting 2.0 verification scope, inputs/outputs, and deployment
    model layouts.
  next_milestone: Document verification inputs/outputs and deployment layout.
  blocked_by: null
  review_cadence: weekly
---


# Agent Instructions â€” aegis-os (aegis-os)

## Security Tier: Strong (2)
Standard agent autonomy. All work via PR â€” never push directly to main. No secrets in code or commit messages.

## What this repo does
Aegis OS is a headless podcast intelligence harvester, compliance evaluator, and Value4Value (V4V) verification engine. It:
- Indexes Podcasting 2.0 RSS feeds and evaluates compliance with the podcast namespace and V4V standards
- Includes service definitions historically intended for **chantecler-01** (DigitalOcean, `67.205.162.200`): `aegis-scout` (harvesting) and `aegis-brain-api` (Flask API on port 3000). Current production runtime status is not verified by this repository.
- Feeds the local **Antigravity aegis-os** dashboard (front-end visualizer)
- Provides leaderboards, neural guest connections, and V4V statistics

The name "aegis-os" refers to compliance assaying (evaluating RSS feeds against Podcasting 2.0 standards). The project is being renamed to **aegis-os** to reflect its expanded scope beyond evaluation.

## Cluster
V4V

## Consolidated modules and boundaries
- `apps/aegis-os` — Aegis Podcasting 2.0 compliance engine.
- `apps/discord-bot` — Aegis Pod Bot/Aether Discord audio and V4V integration.
- `web/portal` — Pod Assay (`podassay.space`), a distinct parked module whose identity and history must be preserved. Owner authorization on 2026-08-30 explicitly permits this consolidation as an exception to its earlier standalone rule; do not relabel it as a generic Aegis portal, redirect its domain, or imply it is redundant.
- `naag-pod` is not owned by this repository. The final fleet ownership decision assigns its canonical implementation to STAX Creative; do not import or duplicate it here.

## Deployment
- **Remote brain target**: chantecler-01 (`67.205.162.200`) â€” systemd services `aegis-brain-api` and `aegis-scout`; current runtime status is not verified
- **Local dashboard**: `C:\Users\aewoo\Desktop\Antigravity Workspace\` (workstation, to be migrated to `C:\dev\repos\`)
- **Deploy path on host**: `/home/aewoodyard/repos/aegis-console/`

## Upstream dependencies
- Podcast Index API, RSS feeds (Podcasting 2.0 namespace)
- PostgreSQL + DuckDB + SQLite (on chantecler-01)

## Downstream consumers
- Antigravity aegis-os dashboard (local)
- aegis-os.space (public site shell)

## Active horizon
```yaml
horizon:
  goal: "Complete aegis-os rename, consolidate workstation repo to C:\\dev\\repos\\, establish full governance"
  active_sub_state: "Consolidated; production deployment not verified"
  next_milestone: "Repo renamed to aegis-os, workstation clone moved to C:\\dev\\repos\\"
  blockers: []
```

## Agent rules
1. Read this file before any action in this repo.
2. All changes via PR to main. No direct pushes.
3. No credentials, tokens, or secrets in any file tracked by git. `.env` is gitignored â€” keep it that way.
4. Daemons target chantecler-01 â€” do not modify systemd service files without noting deployment steps in the PR. Do not claim they are running without live verification.
5. Preserve the module and provenance boundaries in `docs/consolidation-provenance.md`.
6. Portfolio-wide rules: `stax/ops/stax-format.md`
7. If uncertain about scope, check `stax/handoffs/handoff-current.md` for orchestration context.
