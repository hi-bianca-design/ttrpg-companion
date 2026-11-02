# Roadmap

**Status:** Proposed, except Phase 0 which is built. Phases are ordered by dependency, not by dates: there are no dates because the biggest inputs (users, price, billing choice) aren't known yet.

## Phase 0: Foundation (**done**, in review)

Pack-gated content, entitlements, a read-only shop, a dev grant script, and the tests. See [Entitlements architecture](../engineering/entitlements-architecture.md).

**Still owed from this phase:** run the migration through the Supabase CLI, regenerate the types, try the shop and script locally.

## Phase 1: Before any public launch

Not monetization, but **must be done first** because it's a legal prerequisite:

- Show SRD attribution in the app ([Content licensing](../legal/content-licensing.md)).
- Decide the app name with legal advice.
- Privacy policy, terms, account deletion, and data export basics ([Payments, platforms and compliance](../legal/payments-and-platforms.md)).
- Basic analytics ([Metrics](../business/metrics.md)) so we can see the funnel.

## Phase 2: Learn who plays

Run Phases 0 and 1 of [Go to market](../business/go-to-market.md): own table, then 5 to 10 friendly tables. Aim: find out what DMs do and don't use, and whether tables form. **Exit:** a baseline for the first questions in [Metrics](../business/metrics.md), and a clear view of which feature DMs would pay for.

## Phase 3: DM Pro and tier limits

Depends on: Phase 2 data, a price decision, a billing provider.

1. Decide the free caps and DM Pro contents from real usage.
2. Build `subscriptions` and `has_pro()`, enforce limits at the database ([Tier limits and subscriptions](../engineering/tier-limits-and-subscriptions.md)).
3. Build the upgrade prompts and error mapping ([Paywall and upgrade UX](../design/paywall-and-upgrade-ux.md)).
4. Build the billing webhook and purchase flow for web first ([Billing integration](../engineering/billing-integration.md)).
5. Soft launch to a handful of DMs. Watch conversion, refunds, and complaints.

## Phase 4: First pack

Depends on: Phase 3's billing (or free grants for a first test), a decision on the art-storage option.

1. Pick one small pack with one audience (D12).
2. Commission art ([Artist commissioning](../content/artist-commissioning.md)); write and integrate the content ([Pack pipeline](../content/pack-pipeline.md)).
3. Build art storage ([Art storage and delivery](../engineering/art-storage-and-delivery.md)) and pack detail in the shop ([Shop and pack presentation](../design/shop-and-pack-presentation.md)).
4. Release. Compare sales with production cost.

## Phase 5: Themes

Depends on a separate theme spec and a design-system refactor ([Themes and cosmetics](../design/themes-and-cosmetics.md)). Do it when there is enough audience to justify a cosmetic product.

## Phase 6: Native stores

Same Expo codebase. Adds store billing, store listings, review, and store fees. Wait until web is working: stores are slower to change and cost a share of revenue. See [Payments, platforms and compliance](../legal/payments-and-platforms.md).

## Phase 7: Seasons and growth

A regular pack cadence only if the previous packs paid for themselves. Creator partnerships and community. Possibly a second game system's packs.

## Dependencies at a glance

```
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3 ─► Phase 4 ─► Phase 7
                                    │          │
                                    │          └──► Phase 5 (also needs theme spec)
                                    └──► Phase 6 (needs web working)
```

## Rules for changing this plan

- Don't start Phase N+1 work that spends money (artist commissions, paid tools) before Phase N's exit signal.
- If a phase's exit signal is bad, change the plan rather than push on.
- Update the [decision log](../decisions/decision-log.md) when order or scope changes.
