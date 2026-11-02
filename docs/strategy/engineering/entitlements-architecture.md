# Entitlements architecture

**Status:** **Built** (pull request on branch `claude/freemium-monetization-6fa45d`). Not yet run against a hosted database or in a live app; see "Not verified" below.

This is the plain-language version of what the packs foundation does. The step-by-step build is in [docs/superpowers/plans/2026-11-02-packs-foundation.md](../../superpowers/plans/2026-11-02-packs-foundation.md).

## The idea

Some official content belongs to a **pack**. A user can read that content only if they have an **entitlement** for the pack. The rule is enforced by the database, so a modified client can't get around it.

## Data model

Migration: `supabase/migrations/20261102000003_packs.sql`

```
packs                 catalog (clients see published rows only)
  id, slug (unique), name, description,
  kind ('content' | 'theme' | 'art'), system_id, artist_credit,
  cover_url, store_product_id, published, created_at

pack_entitlements     who owns what (clients read their own rows only)
  user_id, pack_id (primary key together),
  source ('purchase' | 'subscription' | 'grant'),
  expires_at (null = permanent), granted_at

content.pack_id       nullable; set only on official content (owner_id is null), enforced by a check
```

Foreign keys: `content.pack_id` and `pack_entitlements.pack_id` are `on delete restrict`, so a pack with content can't be deleted by accident. `pack_entitlements.user_id` cascades from `profiles`.

## Access rules (row level security)

| Rule | How |
|---|---|
| Content with no pack: as before | `pack_id is null` branch |
| Pack content readable only with an active entitlement | `owns_pack(pack_id)`: an entitlement exists with `expires_at` null or in the future |
| Content already on **your own** characters stays readable after a lapse | `own_sheet_content_ids()` is ORed into `content_select` |
| Campaign members see pack content on a visible character's sheet without owning the pack | existing `campaign_sheet_content_ids()`, unchanged |
| You can **add** pack content to a sheet only while you own the pack | `can_reference_content` now requires `owns_pack` for pack rows |
| You can **edit** a pack item already on your sheet after a lapse (equip, quantity, notes) | update policies on `character_items` and `character_picks` also pass if `has_sheet_content(character_id, content_id)` |
| You can't repoint an existing row at other pack content after a lapse | the same update policies, since the new content isn't already on the sheet |
| Clients can't write `packs` or `pack_entitlements` | no insert/update/delete policies exist; only the service role writes |
| Unpublished packs are invisible | `packs_select` uses `published` |

All helper functions are `security definer` with `search_path = ''`, with execute revoked from public and anon, matching the rest of the schema.

## The lapse rule, and why

When a subscription ends, nothing already created is taken away. A player who stops paying keeps their characters, and can still equip, change quantities and edit notes on pack items already on the sheet. They just can't add more pack content. This is decision D6. It was verified with database tests and fixed once during review: the first version blocked edits on owned items after a lapse.

## Client code

| File | Role |
|---|---|
| `src/features/packs/packs.api.ts` | `listPacks()`, `listMyEntitlements()` |
| `src/features/packs/packs.queries.ts` | `usePacks()`, `useMyPackIds()`, and `activePackIds()` (mirrors the database expiry rule for the "Owned" display only; the database is the real gate) |
| `src/features/packs/PackCard.tsx` | One catalog row |
| `app/(app)/shop/` | The shop screen and its stack |
| `src/features/auth/AccountDrawer.tsx` | "Packs" button that opens the shop |
| `src/lib/query-client.ts` | `qk.packs`, `qk.entitlements` keys |
| `scripts/packs-dev.ts` | Dev-only: `create-sample` and `grant <username> <pack-slug> [--expires <date>]`. Refuses to run unless the Supabase URL is local |

The content listing needs no change: row level security already hides unowned pack rows from `listContent`.

## Tests

- `supabase/tests/rls_packs.test.sql`: 23 assertions covering gating, expiry, lapse reads and edits, campaign visibility, unpublished packs, and denied client writes.
- Jest: `__tests__/features/packs/`, `__tests__/app/shop.test.tsx`, `__tests__/scripts/packs-dev.test.ts`, and the drawer test.

## Not verified

- The migration was run in a rolled-back transaction on the local stack, not through `supabase db reset` / `supabase test db` (the CLI wasn't installed). Run those once.
- `src/types/database.types.ts` was edited by hand. Regenerate it.
- The shop wasn't run in a live app, and the dev script wasn't run against a real database.

## Known gaps (deferred)

- A lapsed user still sees pack content they own in pickers, and re-picking it fails with an unexplained error. See [Paywall and upgrade UX](../design/paywall-and-upgrade-ux.md).
- A user who owns a pack that is later unpublished keeps access, but the pack disappears from the shop.
- Content lists aren't invalidated when entitlements change; needed once purchases exist.
- `own_sheet_content_ids` also keeps campaign-scoped content visible after leaving a campaign if a sheet still references it; either document this or limit it to pack rows.

## What needs to be built next

[Billing integration](billing-integration.md) writes entitlements. [Tier limits and subscriptions](tier-limits-and-subscriptions.md) adds the DM Pro tier. [Art storage and delivery](art-storage-and-delivery.md) serves art to entitled users.
