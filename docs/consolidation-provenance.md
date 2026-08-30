# Consolidation provenance and boundaries

## Canonical modules

| Path | Source | Imported source tip | Role |
| --- | --- | --- | --- |
| `apps/aegis-os` | `woodyardae/aegis-os` | `b562f8aa410f090235f3bb9151e2b362dd6dd4ea` | Podcasting 2.0 harvesting, compliance, data, API, and player |
| `apps/discord-bot` | `woodyardae/aegis-pod-bot` | `bcba00878e2e47d45166d8c278048ae40ebca590` | Discord audio, listening rooms, Podcast Index, and V4V integration |
| `web/portal` | `woodyardae/ss-aegis-os-space` | `21a68de9f8ac6e8c22ddb98ee7eb6f75fd8a5dd3` | Pod Assay, the distinct parked `podassay.space` module and origin of Aegis |

At import time, the filtered Discord bot and Pod Assay trees matched those source tips exactly.
Subsequent monorepo changes intentionally removed generated/untrusted artifacts, updated the
Discord systemd unit, and recorded the Pod Assay owner exception in its local governance file.
Their later standalone default-branch commits
(`e96b6c25ccf4b8da3df924081e7e1a3f9d1cbcae` and
`9e190d8e4a6db98de708daabaceb3dc0206a2a7f`) only add deprecation banners; those banners are
not source deltas and are not imported here. This operation does not mutate or archive either
standalone repository.

## Pod Assay exception

Pod Assay's imported governance originally prohibited consolidation without explicit owner
instruction. On 2026-08-30, the owner authorized this consolidation because Pod Assay is the
origin of Aegis. This authorization is limited to retaining Pod Assay as a distinct module in
this monorepo. Its name, `podassay.space` domain identity, full Git provenance, parked status,
and module boundary must remain intact. It must not be described as a generic Aegis portal,
redirected, or treated as redundant.

## Excluded ownership

`naag-pod` is not part of this monorepo. Older fleet material classifies it in the functional
Podcasting/V4V domain, but the final fleet ownership decision assigns its canonical
implementation to STAX Creative. Functional overlap does not transfer ownership: no
`naag-pod` tree or history may be imported here without a new explicit fleet decision.

The generic upstream `Podcastindex-org/podcast-namespace` tree that had existed at
`podcast-namespace-main` was removed rather than vendored. Aegis may reference the upstream
specification but does not claim ownership of it.

## Deployment boundary

No deployment is performed by consolidation. The checked-in systemd units assume the
monorepo checkout is `/home/aewoodyard/repos/aegis-console` and must be installed manually:

1. Build and validate the exact reviewed commit in a fresh checkout.
2. Create `/home/aewoodyard/repos/aegis-console/.venv` from the root Python workspace and
   install its locked runtime dependencies. The units intentionally fail closed if that
   deployment environment does not exist.
3. Copy `ops/aegis-brain-api.service`, `ops/aegis-scout.service`, and
   `apps/discord-bot/ops/aegis-pod-bot.service` to `/etc/systemd/system/`.
4. Before the first bot start, copy any existing standalone bot database to
   `/var/lib/aegis-pod-bot/bot.db` with ownership matching the service user. The bot unit uses
   `StateDirectory=aegis-pod-bot` so fresh deployments create this writable directory safely.
5. Run `systemctl daemon-reload`.
6. Restart each service individually and verify its journal and health endpoint.

Do not perform these steps as part of repository consolidation or PR merge.
