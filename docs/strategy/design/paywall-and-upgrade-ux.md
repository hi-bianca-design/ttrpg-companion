# Paywall and upgrade UX

**Status:** Proposed. Nothing here is built. The only existing paid-adjacent screen is the read-only shop.

## Principles

1. **Ask at the moment of need, not before.** Show an upgrade prompt when someone hits a limit or taps a locked thing, never as a banner on every screen.
2. **Never hold their work hostage.** A lapsed subscription or a full free tier blocks *new* creation. Characters, campaigns and notes they already have stay readable and editable. This is decision D6/D11 in the [decision log](../decisions/decision-log.md).
3. **Say plainly what happens.** "You've reached 3 characters on the free plan. Your existing characters stay yours. DM Pro lifts the limit." No countdown timers, no guilt copy, no fake scarcity.
4. **One clear path out.** Every prompt has a primary action ("See DM Pro") and an equally easy "Not now". Dismissing never penalises.
5. **At the table, stay out of the way.** During an open session, upgrade prompts must not interrupt play. Defer them to after the session or to the DM's own screens.
6. **Players are never asked to pay to join.** Joining a campaign is free for everyone. The DM's tier governs what the *campaign* can do, not what a player can.

## Where prompts appear

| Trigger | Where | What we show |
|---|---|---|
| Free character cap reached | Character list, "New character" | Explains the cap, offers DM Pro, keeps "Not now" |
| Second campaign as DM | "New campaign" | Same pattern |
| Tapping a locked pack | Shop, pack detail | Pack detail with price and what's included |
| Lapsed entitlement, tries to add pack content | The pickers | A plain message: "Your access to *Pack name* ended, so you can't add more from it. What's already on your sheet still works." (Today this surfaces as an unexplained database error, see below.) |
| Subscription about to renew or just lapsed | Account drawer | A short, calm status line |

## States every paid thing must have

| State | Display |
|---|---|
| **Free, no pack** | Normal |
| **Locked** (not owned) | Visible but clearly locked, with the pack's name and a way to read about it. Never hide that it exists. |
| **Owned** | An "Owned" badge. No upsell on it. |
| **Lapsed, already on a sheet** | Works as normal. A small, quiet note that access has ended. |
| **Lapsed, not on a sheet** | Locked again |
| **Error buying** | Plain-language cause and a next step; never a raw error |

## Known gap

When a lapsed user picks pack content they no longer own, the database rejects it with a permission error that the app doesn't translate. **Requirement:** map this to the friendly message above, and hide or flag locked pack items in the pickers instead of letting someone tap into an error. Tracked as a deferred minor on the packs pull request.

## Copy rules

- Plain, specific, calm. Say what they get, not how special it is.
- Always show the price and the billing period before purchase.
- State what happens when the subscription ends.
- Cancellation must be as easy as signing up, and the app should link to where to do it.
- Follow the voice and conventions of the existing app: see the [Night Vigil design system spec](../../superpowers/specs/2026-11-02-night-vigil-design-system-design.md).

## Accessibility

- All prompts and the shop must work with a screen reader: the locked and owned state is announced, not only shown with colour or an icon.
- Touch targets follow the existing 44pt rule.
- No reliance on hover.

## Open questions

- Free trial for DM Pro: length, and whether it needs a payment method up front (store rules differ; verify).
- Do we show the free caps up front ("2 of 3 characters used") or only on hit? Probably up front, to avoid a surprise.
- Whether the table sees that "the DM is on Pro" at all. Probably not: it's the DM's tool, not a status symbol.
