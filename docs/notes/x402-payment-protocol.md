---
title: x402 Payment Protocol — Crypto Efforts Note
type: note
status: tracking
tags: [crypto, v4v, payments, stablecoins]
updated_at: "2026-07-06"
---

# x402 Payment Protocol

## Summary
Open USB will use **x402** to enable stablecoin transactions.

x402 is an open, internet-native payment protocol that brings the HTTP `402
Payment Required` status code to life. It lets machines, AI agents, and
humans autonomously pay for web resources, compute, or APIs on a per-request
basis — no accounts or subscriptions required — settling instantly via
stablecoins.

## Ecosystem status
- **Stripe**: already supports x402 and stablecoins.
- **TrueFans**: already supports L402 (sats/Lightning) and F402 (fiat);
  x402 support is next on their roadmap.

## Relevance to aegis-os / V4V cluster
- x402 is a potential complementary rail alongside existing V4V (Lightning
  Network / sats via L402) value-splitting infrastructure.
- Worth tracking for future Podcasting 2.0 `value` tag / funding integrations
  as stablecoin-based micropayments gain adoption alongside sats.
- No implementation work has been scoped yet — this is a watch-list item for
  future crypto/payments efforts.

## Open questions / next steps
- Determine whether x402 support would be added to aegis-os directly or to
  a downstream consumer (e.g., aegis-os.space).
- Evaluate compatibility with existing `value`/`valueRecipient` tag handling.
- Revisit when Stripe/TrueFans x402 support matures further.
