# Strategy: freemium and paid subscriptions

How the D&D companion app makes money, and what it takes to get there. These documents are the single place for the monetization strategy, split by discipline so each reader can find their part.

**Last reviewed:** 2026-11-03. **Owner:** Bianca. Strategy docs are living documents: when a decision changes, edit the doc and add a line to the [decision log](decisions/decision-log.md).

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

| Folder | Document | Covers |
|---|---|---|
| [business/](business/) | [Revenue model](business/revenue-model.md) | Tiers, what is free vs paid, pricing hypotheses, unit economics |
| | [Go to market](business/go-to-market.md) | Audience, positioning, the DM-brings-the-table loop, launch phases |
| | [Metrics](business/metrics.md) | The funnel, events to track, the first questions to answer |
| [design/](design/) | [Paywall and upgrade UX](design/paywall-and-upgrade-ux.md) | When and how we ask for money without being hostile |
| | [Shop and pack presentation](design/shop-and-pack-presentation.md) | The shop screen, pack detail, owned and locked states |
| | [Themes and cosmetics](design/themes-and-cosmetics.md) | Paid visual themes and why they need their own spec |
| [content/](content/) | [Pack pipeline](content/pack-pipeline.md) | From idea to published pack |
| | [Artist commissioning](content/artist-commissioning.md) | Briefs, contracts, rights, revenue share |
| | [Content policy](content/content-policy.md) | What may go in a pack; AI-art stance; crediting |
| [engineering/](engineering/) | [Entitlements architecture](engineering/entitlements-architecture.md) | What is built: packs, entitlements, RLS, shop |
| | [Billing integration](engineering/billing-integration.md) | Webhooks, RevenueCat or Stripe, web vs native |
| | [Tier limits and subscriptions](engineering/tier-limits-and-subscriptions.md) | The DM Pro tier and how caps are enforced |
| | [Art storage and delivery](engineering/art-storage-and-delivery.md) | Private bucket, signed URLs, caching |
| [legal/](legal/) | [Content licensing](legal/content-licensing.md) | SRD, what we can and cannot sell, trademark risk |
| | [Payments, platforms and compliance](legal/payments-and-platforms.md) | Store fees and rules, tax, refunds, age and privacy |
| [roadmap/](roadmap/) | [Roadmap](roadmap/roadmap.md) | Phases, dependencies, what is blocked on what |
| | [Risks and open questions](roadmap/risks-and-open-questions.md) | What could go wrong, and what we still don't know |
| [decisions/](decisions/) | [Decision log](decisions/decision-log.md) | Every decision, its reason, and its status |

## Where the code lives

The first piece is built and open as a pull request: pack-gated content, entitlements, and a read-only shop. Its implementation plan is [docs/superpowers/plans/2026-11-02-packs-foundation.md](../superpowers/plans/2026-11-02-packs-foundation.md). [Entitlements architecture](engineering/entitlements-architecture.md) explains it in plain terms.

## Glossary

- **Pack**: a sellable bundle of content, a theme, or art. Has a slug, a kind (`content`, `theme` or `art`) and an optional artist credit.
- **Entitlement**: a record that a user owns a pack, optionally until a date. Only the server writes these.
- **DM Pro**: the proposed paid subscription tier for people who run campaigns. Not built yet.
- **SRD**: the System Reference Document, the part of D&D that Wizards of the Coast released under Creative Commons (CC BY 4.0). It is the only D&D content we may ship.
- **Lapse**: an entitlement that has expired or been cancelled.
