# Strategy: freemium and paid subscriptions

How the D&D companion app makes money, and what it takes to get there. These documents are the single place for the monetization strategy, kept together in one folder so the whole picture is in one place.

**Last reviewed:** 2026-11-03. **Owner:** Bianca. Strategy docs are living documents: when a decision changes, edit the doc and add a line to the [decision log](decision-log.md).

## The strategy in one paragraph

The core app (build characters, join campaigns, play a session) stays free, because it is what makes people show up and bring their table. **DMs pay** for the tools that run a table, and **anyone can buy packs**: original content and commissioned art that we have the right to sell. Players are free to join, so each paying DM brings 3 to 5 free players. We never sell Wizards of the Coast's non-SRD material. We never lock people out of characters they already made. Everything we sell is either original, licensed, or entered by the user themselves.

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

All documents live in this one folder. They're grouped by topic here so you can find the part you need.

**The money**
- [Revenue model](revenue-model.md): tiers, what is free vs paid, pricing hypotheses, unit economics
- [Go to market](go-to-market.md): audience, positioning, the DM-brings-the-table loop, launch phases
- [Metrics](metrics.md): the funnel, events to track, the first questions to answer

**The product experience**
- [Paywall and upgrade UX](paywall-and-upgrade-ux.md): when and how we ask for money without being hostile
- [Shop and pack presentation](shop-and-pack-presentation.md): the shop screen, pack detail, owned and locked states
- [Themes and cosmetics](themes-and-cosmetics.md): paid visual themes and why they need their own spec

**The things we sell**
- [Pack pipeline](pack-pipeline.md): from idea to published pack
- [Artist commissioning](artist-commissioning.md): briefs, contracts, rights, revenue share
- [Content policy](content-policy.md): what may go in a pack; AI-art stance; crediting

**How it's built**
- [Entitlements architecture](entitlements-architecture.md): what is built: packs, entitlements, RLS, shop
- [Billing integration](billing-integration.md): webhooks, RevenueCat or Stripe, web vs native
- [Tier limits and subscriptions](tier-limits-and-subscriptions.md): the DM Pro tier and how caps are enforced
- [Art storage and delivery](art-storage-and-delivery.md): private bucket, signed URLs, caching

**Staying legal**
- [Content licensing](content-licensing.md): SRD, what we can and cannot sell, trademark risk
- [Payments, platforms and compliance](payments-and-platforms.md): store fees and rules, tax, refunds, age and privacy

**Plan and decisions**
- [Roadmap](roadmap.md): phases, dependencies, what is blocked on what
- [Risks and open questions](risks-and-open-questions.md): what could go wrong, and what we still don't know
- [Decision log](decision-log.md): every decision, its reason, and its status

## Where the code lives

The first piece is built and open as a pull request: pack-gated content, entitlements, and a read-only shop. Its implementation plan is [docs/superpowers/plans/2026-11-02-packs-foundation.md](../superpowers/plans/2026-11-02-packs-foundation.md). [Entitlements architecture](entitlements-architecture.md) explains it in plain terms.

## Glossary

- **Pack**: a sellable bundle of content, a theme, or art. Has a slug, a kind (`content`, `theme` or `art`) and an optional artist credit.
- **Entitlement**: a record that a user owns a pack, optionally until a date. Only the server writes these.
- **DM Pro**: the proposed paid subscription tier for people who run campaigns. Not built yet.
- **SRD**: the System Reference Document, the part of D&D that Wizards of the Coast released under Creative Commons (CC BY 4.0). It is the only D&D content we may ship.
- **Lapse**: an entitlement that has expired or been cancelled.
