# Agent Instructions ? ss-podassay-space

## Repo Identity
- Repo Name: `ss-podassay-space`
- Repo Type: `Static Site Shell`
- Lifecycle State: `Active`
- Active Sub-State: `Planning`
- Security Tier: `Strong`
- Maintainer: `@woodyardae`
- Last Human Touch: `2026-06-19`
- Canonical Rules Source: `stax/ops/agent-rules.md`

horizon:
  active_sub_state: "Planning"
  current_goal: "Exist as a governed staged shell for podassay.space pending content and deployment decision."
  next_milestone: "Owner declares content direction or deployment timeline."
  blocked_by: "Owner content decision"
  last_reviewed: "2026-06-19"
  review_cadence: "quarterly"

## STAGED SHELL ? Read Before Acting

This repo is a staged shell. It represents the domain/brand `podassay.space` and is waiting for
a content and deployment decision from the owner.

## Owner-authorized consolidation exception

On 2026-08-30, the owner explicitly authorized preserving this project inside the Aegis monorepo
at `web/portal` because Pod Assay is the origin of Aegis. This exception permits the consolidation
only. Pod Assay remains a distinct, parked module named **Pod Assay** with the `podassay.space`
identity and its full provenance. It is not a generic Aegis portal, redirect, or redundant site.
The standalone repository must not be archived or otherwise mutated as part of this operation.

**Do NOT**:
- Consolidate or merge this module again without explicit owner instruction
- Archive or deprecate this repo without explicit owner instruction
- Add redirects, canonical tags, or references pointing away from this domain
- Assume this domain is redundant ? each domain is intentional

**You CAN**:
- Add or improve README content describing the domain's purpose
- Set up basic scaffolding if the owner has declared a framework choice
- Update this governance file when instructed
