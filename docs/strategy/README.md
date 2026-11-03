# Strategy: freemium and paid subscriptions

How Session Zero, the tabletop companion app, makes money, and what it takes to get there. These documents are the single place for the monetization strategy, spread across the department folders so each department finds its part where it expects it. This folder holds the company-level pieces; see the [docs index](../README.md) for all departments.

**Last reviewed:** 2026-11-03. **Owner:** Bianca. Strategy docs are living documents: when a decision changes, edit the doc and add a line to the [decision log](decision-log.md).

## The strategy in one paragraph

The core app (build characters, join campaigns, play a session) stays free, because it is what makes people show up and bring their table. **DMs pay** for the tools that run a table, and **anyone can buy packs**: original content and commissioned art that we have the right to sell. Players are free to join, so each paying DM brings 3 to 5 free players. We never sell content from outside the SRD, and there is no "full rulebook" tier. We never lock people out of characters they already made. What we charge for is our own work: sync, storage and session tools for DMs, plus original packs and commissioned art. Everything we sell is either original, licensed, or entered by the user themselves. Research on 2026-11-03 backs the shape of this: the market's main complaints are paywalled core tools and distrust of subscription pricing, so a free core with a clear promise ("your content is never gated") is the wedge.

## How to read these docs

Every doc starts with a **Status** line:

| Status | Meaning |
|---|---|
| **Built** | Exists in the code today. File references are given. |
| **Decided** | Agreed, not built yet. |
| **Proposed** | A recommendation that still needs a yes or no. |
| **Open question** | Needs research or a decision before anyone builds on it. |

Numbers in these docs (prices, costs, targets) are **hypotheses to test**, not facts about the market. Anything that depends on a third party's current terms (App Store fees, licence terms, tax rules) is marked **verify** and must be checked at the source before we rely on it.

## Index

The strategy touches every department, so its documents live with the department that owns them. This is the map. Company-level documents (this folder) are listed under **Plan and decisions**.

**The money**
- [Revenue model](../business/revenue-model.md): tiers, what is free vs paid, pricing hypotheses, unit economics
- [Go to market](../business/go-to-market.md): audience, positioning, the DM-brings-the-table loop, launch phases
- [Metrics](../business/metrics.md): the funnel, events to track, the first questions to answer

**The product experience**
- [Paywall and upgrade UX](../design/paywall-and-upgrade-ux.md): when and how we ask for money without being hostile
- [Shop and pack presentation](../design/shop-and-pack-presentation.md): the shop screen, pack detail, owned and locked states
- [Themes and cosmetics](../design/themes-and-cosmetics.md): paid visual themes and why they need their own spec

**The things we sell**
- [Pack pipeline](../content/pack-pipeline.md): from idea to published pack
- [Artist commissioning](../content/artist-commissioning.md): briefs, contracts, rights, revenue share
- [Content policy](../content/content-policy.md): what may go in a pack; AI-art stance; crediting

**How it's built**
- [Entitlements architecture](../engineering/entitlements-architecture.md): what is built: packs, entitlements, RLS, shop
- [Billing integration](../engineering/billing-integration.md): webhooks, RevenueCat or Stripe, web vs native
- [Tier limits and subscriptions](../engineering/tier-limits-and-subscriptions.md): the DM Pro tier and how caps are enforced
- [Art storage and delivery](../engineering/art-storage-and-delivery.md): private bucket, signed URLs, caching

**Staying legal**
- [Content licensing](../legal/content-licensing.md): SRD, what we can and cannot sell, trademark risk
- [Payments, platforms and compliance](../legal/payments-and-platforms.md): store fees and rules, tax, refunds, age and privacy

**Plan and decisions**
- [Roadmap](roadmap.md): phases, dependencies, what is blocked on what
- [Risks and open questions](risks-and-open-questions.md): what could go wrong, and what we still don't know
- [Decision log](decision-log.md): every decision, its reason, and its status

## Where the code lives

The first piece is built and open as a pull request: pack-gated content, entitlements, and a read-only shop. Its implementation plan is [docs/superpowers/plans/2026-11-02-packs-foundation.md](../superpowers/plans/2026-11-02-packs-foundation.md). [Entitlements architecture](../engineering/entitlements-architecture.md) explains it in plain terms.

## Glossary

- **Pack**: a sellable bundle of content, a theme, or art. Has a slug, a kind (`content`, `theme` or `art`) and an optional artist credit.
- **Entitlement**: a record that a user owns a pack, optionally until a date. Only the server writes these.
- **DM Pro**: the proposed paid subscription tier for people who run campaigns. Not built yet.
- **SRD**: the System Reference Document, the part of the fifth-edition rules that its publisher released under Creative Commons (CC BY 4.0). It is the only rules content we may ship.
- **Lapse**: an entitlement that has expired or been cancelled.
