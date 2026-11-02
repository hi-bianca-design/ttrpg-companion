# Tier limits and subscriptions

**Status:** Proposed (D11). Not built. This is the "DM Pro" tier and the free-tier caps from the [revenue model](../business/revenue-model.md).

## Two separate things

1. **A tier**: "this user is on DM Pro." It's a property of the user for a period of time.
2. **Limits**: "the free tier can create N characters / run M campaigns." They are enforced by the database and read the tier.

Packs are one-off ownership. A subscription is state over time. They share the entitlement machinery but are not the same table.

## Proposed data model

```
subscriptions
  user_id (primary key), product ('dm_pro'),
  status ('active' | 'grace' | 'lapsed' | 'cancelled'),
  current_period_end, source ('purchase' | 'grant'),
  provider_ref, updated_at
```

Written only by the billing webhook (service role). Clients read their own row. A function `has_pro()` returns true when status is active (or in a short grace period) and the period hasn't ended.

DM Pro can also **include** a season pack: the webhook writes a `pack_entitlements` row with `source = 'subscription'` and `expires_at` set to the period end. The existing `owns_pack()` handles the rest. That's why `source` already has a `subscription` value.

## Enforcing limits

Enforce in the database, not in the screens. A screen can *warn*; only the database can *stop* someone.

| Limit | Where | How |
|---|---|---|
| Max characters on free | `characters` insert | A policy or a trigger counts the caller's characters and rejects an insert when `not has_pro()` and count ≥ limit |
| Max campaigns as DM on free | `create_campaign` RPC | The same check inside the RPC; it raises a typed error the app can map to the upgrade prompt |
| Party size cap | `join_campaign` | Count active members, compare to the campaign DM's tier, not the joiner's |
| Custom content cap | `content` insert for homebrew | Count owned rows |
| Pro-only features | The RPC or table behind them | Check `has_pro()` for the DM |

**Where the limit is read from matters.** A campaign's cap follows the **DM's** tier. A free player joining a Pro DM's campaign is never blocked by their own plan.

**Limits only block creation.** Existing rows are never deleted or hidden because someone dropped below the cap. The same principle as the packs lapse rule (D6): you may be over the limit; you just can't add more. A policy that counts rows must therefore only gate **inserts**, never updates or reads.

## Typed errors

Add error codes to `src/features/errors.ts` (for example `limit_characters`, `limit_campaigns`, `limit_party_size`) with plain copy, so the UI can show the right upgrade prompt rather than a generic failure. See [Paywall and upgrade UX](../design/paywall-and-upgrade-ux.md).

## Caps are hypotheses

The numbers (for example 3 characters, 1 campaign) are in the [revenue model](../business/revenue-model.md) as hypotheses. Keep the limits in **one place** (a database function or config table), so changing a number is a one-line migration, not a hunt through the code. Don't hardcode them into the client.

## Grandfathering

Anyone who already has more than the new cap when it ships keeps everything. Roll caps out only after announcing them, and only to new accounts at first if existing users would lose anything.

## Testing

- pgTAP: free user blocked at the cap on insert; Pro user not blocked; a free player joining a Pro DM's campaign works; a lapsed Pro can still read and edit existing rows over the cap; counts ignore other users' rows.
- Jest: the upgrade prompts and error mapping.
- Boundary tests: exactly at the cap, one over, and after deleting a row.

## Open questions

- The exact caps and what DM Pro includes: decide with real usage data (see [Metrics](../business/metrics.md)).
- Whether to count archived or deleted characters.
- A grace period length after a failed payment.
