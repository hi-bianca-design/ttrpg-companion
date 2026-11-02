# Billing integration

**Status:** Proposed (D10). Nothing is built. The entitlement tables it writes to exist.

## Goal

A purchase, renewal, cancellation or refund, on **any** platform, results in the right row in `pack_entitlements` (and later in a subscription record). The app reads entitlements from our database only. It never trusts a client-side claim that "I paid".

## Architecture

```
Store / web checkout ──► Billing provider ──► Webhook ──► Edge function (verifies + maps) ──► Postgres (service role)
                                                                                                   │
App ◄── reads own entitlements (RLS) ◄──────────────────────────────────────────────────────────┘
```

1. A purchase happens in the store, or in web checkout.
2. The provider sends a signed webhook to a Supabase **edge function**.
3. The function verifies the signature, ignores duplicates, maps the product to a pack or tier, and writes with the service role.
4. The app refetches entitlements. Row level security does the rest.

## Provider options

| Option | Good | Watch out for |
|---|---|---|
| **RevenueCat** for store purchases (iOS/Android) + **Stripe** for web | One SDK for store IAP, subscription state handled for you; widely used with Expo | Two systems to reconcile; check current pricing and terms |
| **A merchant of record** (a service that sells on our behalf and handles tax) | Takes on sales tax and VAT filing, which a solo builder otherwise must handle | Higher fee; may not cover native store purchases. **Verify** |
| **Stripe only** | One system, web first | Store rules generally require in-app purchase for digital goods on native. **Verify** |

**Recommendation to evaluate:** RevenueCat with `app_user_id` set to the Supabase user id (so entitlements map to our `user_id`), Stripe for web, and the edge function as the single writer. Decide after the web-vs-native launch question (see [Risks and open questions](../strategy/risks-and-open-questions.md)). Don't commit to a provider until current fees and terms have been checked.

## Product mapping

`packs.store_product_id` stores the store or checkout product identifier for each pack. A subscription product maps to a tier, not a pack. The function keeps a small mapping table (or config) of product id → `{ type: 'pack' | 'tier', pack_id | tier }`.

## The webhook function

Requirements:

- **Verify the signature** of every request; reject anything else.
- **Idempotent**: store the provider's event id and ignore repeats. Providers retry.
- **Order-safe**: events can arrive out of order. Use the provider's event timestamp or current-state API to resolve conflicts rather than assuming order.
- **Map events to state:**

| Event | Effect |
|---|---|
| Initial purchase (one-time pack) | Upsert entitlement: `source = 'purchase'`, `expires_at = null` |
| Subscription started or renewed | Upsert subscription state; upsert included-pack entitlements with `source = 'subscription'` and `expires_at = period end` (plus a short grace) |
| Subscription cancelled | Keep access to period end, then it lapses naturally |
| Billing failure | Optional grace period; then lapse |
| Refund or chargeback | Remove or expire the entitlement; follow the lapse rule for existing sheets |
| Restore purchases | Re-derive entitlements from the provider's current state |

- **Never throw away the audit trail.** Log each event (id, user, product, outcome) in a table.
- **Fail loudly.** An unmapped product or unknown user should alert, not silently drop.

## Client flow

- Shop shows the store's **own** localised price string; we don't hardcode prices.
- Purchase button calls the provider SDK or opens checkout. On success, the app **polls or subscribes to** its entitlements and invalidates content queries (`['content']`, `qk.entitlements`) so unlocked content appears.
- A "Restore purchases" action is required by the stores for non-consumables and subscriptions.
- A purchase that succeeds before the webhook lands needs a clear "finishing up" state, not a failure message.

## Accounts

Entitlements belong to a signed-in account, not to a device. Anonymous purchases aren't supported (the app requires accounts). Handle sign-out: don't leave purchases attached to the wrong user in the provider SDK; log out of the SDK with the app.

## Security

- The webhook secret and service-role key live only in edge function secrets, never in the client or the repo. No `EXPO_PUBLIC_` variable ever holds them.
- Rate-limit the endpoint.
- The existing guard in `scripts/packs-dev.ts` (refuse non-local URLs) stays: the dev grant script must never reach a real project.

## Testing

- Use each provider's **sandbox** and test mode, and the stores' test accounts.
- Unit-test the event→state mapping as a pure function with recorded sample payloads.
- Test the failure cases: duplicate event, out-of-order event, unknown product, refund.
- pgTAP tests for any new tables, in the style of `rls_packs.test.sql`.

## Open questions

- Provider choice and the web-vs-native launch order.
- Trial and intro-offer rules per store.
- How to handle family sharing or multiple devices on one account (the account model makes this simpler than device-based licences).
- Refund policy, as a product decision: see [Payments, platforms and compliance](../legal/payments-and-platforms.md).
