# Packs Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let official content rows belong to a "pack" that only users with an entitlement can read, plus a read-only shop screen, so paid content and art packs can be sold later without further schema work.

**Architecture:** Add `packs` (catalog) and `pack_entitlements` (who owns what) tables and a nullable `content.pack_id`. Gating lives in Postgres RLS (`owns_pack()` feeding `content_select` and `can_reference_content`), never in the client. Entitlements are written only by the service role (a later webhook, and for now a dev script). The client only reads the catalog and the caller's own entitlements.

**Tech Stack:** Supabase Postgres + pgTAP (`supabase/tests/*.test.sql`), supabase-js, TanStack Query, Expo Router, NativeWind, Jest + @testing-library/react-native.

**Spec:** none separate. The design was agreed in conversation on 2026-11-02 and is summarised above and in Global Constraints. Related: `docs/superpowers/specs/2026-11-02-night-vigil-design-system-design.md` (the token rules the shop UI must obey).

## Global Constraints

- Packs gate only **official** content: `content.pack_id` may be set only when `owner_id is null` (check constraint).
- An entitlement is active when `expires_at is null or expires_at > now()`.
- **Lapse rule:** content already on a character the caller owns (picks and items) stays readable after an entitlement lapses. The caller can no longer *add* new pack content (`can_reference_content` returns false).
- Campaign rule (existing, must keep working): a campaign GM or active member can read pack content that sits on a visible campaign character's sheet, via `campaign_sheet_content_ids()`.
- Authenticated clients can never insert, update or delete `pack_entitlements` or `packs`. Only the service role writes them.
- `content.pack_id` FK is `on delete restrict`. `pack_entitlements` cascades from `profiles` and restricts from `packs`.
- Client code follows the existing feature layout (`*.api.ts` + `*.queries.ts`, lazy `require` of the api inside query functions) and uses `unwrap` / `AppError` from `src/features/errors.ts`.
- UI uses design tokens only. `npm test` runs `lint:tokens`, so no hex/rgb literals, arbitrary Tailwind values or off-scale spacing in `app/`, `src/features/`, `src/components/game/`.
- Migrations are named `YYYYMMDDNNNNNN_name.sql` and sort after `20261101000008_username_taken.sql`.

## Review Focus

1. Lapsed or expired entitlement: pack content already on the caller's own sheet stays readable; `expires_at` in the past counts as not owned. (Task 1)
2. A client trying to grant itself a pack (insert into `pack_entitlements`) is denied. (Task 1)
3. A campaign member who does not own the pack still sees its content on the owner's visible character. (Task 1)
4. Unpublished packs never appear in the catalog. (Task 1)
5. Shop with no published packs shows an empty state, not a blank screen. (Task 3)

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261102000001_packs.sql` | tables, `owns_pack`, `own_sheet_content_ids`, policy and function changes |
| `supabase/tests/rls_packs.test.sql` | pgTAP coverage of every gating rule |
| `src/types/database.types.ts` | regenerated, adds the two tables and `content.pack_id` |
| `src/features/packs/packs.api.ts` | `listPacks`, `listMyEntitlements` |
| `src/features/packs/packs.queries.ts` | `usePacks`, `useMyPackIds` |
| `src/lib/query-client.ts` | add `qk.packs`, `qk.entitlements` |
| `src/features/packs/PackCard.tsx` | one catalog row: name, blurb, artist credit, Owned / Locked state |
| `app/(app)/shop/index.tsx`, `app/(app)/shop/_layout.tsx` | shop screen and its stack |
| `app/(app)/_layout.tsx` | register hidden `shop` route |
| `src/features/auth/AccountMenu.tsx` | "Packs" entry linking to `/shop` |
| `scripts/packs-dev.ts` + `supabase/seed/dev-pack.sql` | dev-only: create a sample pack, grant a pack to a user (service role) |
| `__tests__/features/packs/*.test.tsx`, `__tests__/app/shop.test.tsx` | client tests |

---

### Task 1: Pack schema and RLS

**Files:**
- Create: `supabase/migrations/20261102000001_packs.sql`
- Test: `supabase/tests/rls_packs.test.sql`

**Interfaces:**
- Produces: tables `public.packs (id uuid pk, slug text unique, name text, description text, kind text check in ('content','theme','art'), system_id text null → game_systems, artist_credit text, cover_url text, store_product_id text, published bool default false, created_at)`, `public.pack_entitlements (user_id → profiles on delete cascade, pack_id → packs on delete restrict, source text check in ('purchase','subscription','grant'), expires_at timestamptz null, granted_at, primary key (user_id, pack_id))`, column `public.content.pack_id uuid null → packs on delete restrict`, functions `public.owns_pack(p_pack_id uuid) returns boolean` and `public.own_sheet_content_ids() returns setof uuid` (both `security definer`, `stable`, `search_path = ''`, execute revoked from `public, anon`, granted to `authenticated, service_role`).
- Changes: policy `content_select` and function `public.can_reference_content(uuid)`.

- [ ] **Step 1: Write the failing pgTAP test** in `supabase/tests/rls_packs.test.sql`, in the style of `rls_content.test.sql` (begin; pgtap; fixtures as superuser; `set local role authenticated` plus `request.jwt.claims` per user). Fixtures: users `owner`, `lapsed`, `stranger`, `gm`, `member`; a published pack `pack-a`, an unpublished pack `pack-b`; one official content row in `pack-a`, one plain official row; entitlements: `owner` active, `lapsed` with `expires_at = now() - interval '1 day'`; `lapsed` owns a character whose pick references the pack-a content row; `gm` owns a character with a pick on that row, and `member` is an active member of `gm`'s campaign. Assertions (test names are the spec):
  - `stranger` does not see the pack-a content row; sees the plain official row.
  - `owner` sees the pack-a content row.
  - `lapsed` does not see an *unreferenced* pack row, but does see the row on their own character's pick.
  - `lapsed` inserting a new pick on pack-a content throws `42501`; `owner` can.
  - `member` (no entitlement) sees the pack-a row through the GM's visible character.
  - any authenticated user: `insert into pack_entitlements` throws `42501`; `update` and `delete` affect 0 rows; each user sees only their own entitlement rows.
  - `stranger` sees `pack-a` in `packs` and does not see `pack-b`.
  - inserting official content with `pack_id` set and `owner_id` set throws `23514`.
  - deleting a pack that has content (as superuser) throws `23503`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `supabase test db`
Expected: FAIL, `relation "public.packs" does not exist` (start the local stack first with `supabase start` if it is not running).

- [ ] **Step 3: Write the migration** `supabase/migrations/20261102000001_packs.sql`: create the tables, add `content.pack_id` with check `pack_id is null or owner_id is null`, enable RLS on both new tables, create `owns_pack` and `own_sheet_content_ids` (own characters' picks and items, mirroring `campaign_sheet_content_ids`). Policies: `packs_select` for `authenticated` using `published`; `pack_entitlements_select` for `authenticated` using `user_id = (select auth.uid())`; no write policies. Replace `content_select` so the first branch becomes `(owner_id is null and (pack_id is null or public.owns_pack(pack_id)))` and add `or id in (select public.own_sheet_content_ids())`; `create or replace` `can_reference_content` so its official branch also requires `c.pack_id is null or public.owns_pack(c.pack_id)`. Keep the existing grants and revoke pattern, and the `(select auth.uid())` scalar-subquery convention from `20261101000005_rls.sql`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `supabase db reset && supabase test db`
Expected: all files PASS, including the existing `rls_content`, `rls_characters` and `rls_campaigns` tests (no regressions).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261102000001_packs.sql supabase/tests/rls_packs.test.sql
git commit -m "feat(db): packs, entitlements and pack-gated content RLS"
```

---

### Task 2: Types and data layer

**Files:**
- Modify: `src/types/database.types.ts` (regenerate), `src/lib/query-client.ts` (add keys)
- Create: `src/features/packs/packs.api.ts`, `src/features/packs/packs.queries.ts`
- Test: `__tests__/features/packs/packs.api.test.ts`

**Interfaces:**
- Consumes: Task 1 tables.
- Produces:
  - `type PackRow = Database['public']['Tables']['packs']['Row']`, `type EntitlementRow = Database['public']['Tables']['pack_entitlements']['Row']`
  - `listPacks(): Promise<PackRow[]>` (ordered by `name`), `listMyEntitlements(): Promise<EntitlementRow[]>`
  - `qk.packs: readonly ['packs']`, `qk.entitlements: readonly ['entitlements']`
  - `usePacks()` (query of `PackRow[]`), `useMyPackIds()` returning a query whose `data` is `Set<string>` of pack ids with an *active* entitlement (client-side check `expires_at == null || new Date(expires_at) > new Date()`).

- [ ] **Step 1: Write the failing test** `packs.api.test.ts`, following how `__tests__/features/content` mocks `@/lib/supabase`: `listPacks` selects from `packs` ordered by `name`; `listMyEntitlements` selects from `pack_entitlements`; both throw an `AppError` through `unwrap` on a Supabase error; `useMyPackIds` excludes an entitlement whose `expires_at` is in the past (pure helper `activePackIds(rows: EntitlementRow[], now = new Date()): Set<string>` exported from `packs.queries.ts` and tested directly).

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/features/packs -v`
Expected: FAIL, modules not found.

- [ ] **Step 3: Regenerate types** with `supabase gen types typescript --local > src/types/database.types.ts`, then check `git diff` only adds the two tables, `content.pack_id` and the two functions.

- [ ] **Step 4: Implement** the api and queries files, copying the structure of `content.api.ts` / `content.queries.ts` (lazy `require('./packs.api')` inside `queryFn`), and add the two keys to `qk`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx jest __tests__/features/packs -v && npx tsc --noEmit`
Expected: PASS and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/database.types.ts src/lib/query-client.ts src/features/packs __tests__/features/packs
git commit -m "feat: packs api and queries"
```

---

### Task 3: Shop screen

**Files:**
- Create: `src/features/packs/PackCard.tsx`, `app/(app)/shop/_layout.tsx`, `app/(app)/shop/index.tsx`
- Modify: `app/(app)/_layout.tsx`, `src/features/auth/AccountMenu.tsx`
- Test: `__tests__/features/packs/PackCard.test.tsx`, `__tests__/app/shop.test.tsx`

**Interfaces:**
- Consumes: `usePacks()`, `useMyPackIds()` from Task 2.
- Produces: `PackCard({ pack, owned }: { pack: PackRow; owned: boolean })`; route `/shop`.

- [ ] **Step 1: Write the failing tests**, following the render and mock pattern in `__tests__/app/characters.test.tsx`:
  - `PackCard`: shows name, description and artist credit; owned shows an "Owned" badge; not owned shows a disabled "Coming soon" button (there is no purchase flow yet, so the button must not call anything).
  - `shop`: renders one card per pack from the mocked hook; an owned pack shows "Owned"; loading shows the existing loading treatment; **zero packs shows `EmptyState`** ("No packs yet" plus one line saying new packs are coming); an error shows the existing error treatment with retry.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/features/packs/PackCard.test.tsx __tests__/app/shop.test.tsx -v`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** `PackCard` and the screen using `ScreenBackground`, `SectionHeader` and `EmptyState` from `src/components/game`, mirroring `app/(app)/content/index.tsx` for layout and loading/error handling. Register `<Tabs.Screen name="shop" options={{ href: null }} />` in `app/(app)/_layout.tsx` so it is routable without a tab. Add a "Packs" row to `AccountMenu` that navigates to `/shop`. Use tokens only.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: `lint:tokens` clean and all Jest suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/packs app/\(app\)/shop app/\(app\)/_layout.tsx src/features/auth/AccountMenu.tsx __tests__
git commit -m "feat: read-only packs shop screen"
```

---

### Task 4: Dev grant script and end-to-end check

**Files:**
- Create: `scripts/packs-dev.ts`, `supabase/seed/dev-pack.sql`
- Modify: `package.json` (script `packs:dev`)

**Interfaces:**
- Consumes: Task 1 schema. Uses the service role key from the environment the same way `scripts/seed/build-seed.ts` does.
- Produces: `npm run packs:dev -- create-sample` and `npm run packs:dev -- grant <username> <pack-slug> [--expires <ISO date>]`.

- [ ] **Step 1: Write `supabase/seed/dev-pack.sql`**: one published sample pack (`slug` `dev-sample`) with two official content rows (one subclass-like, one item) carrying `pack_id`. Not referenced by `supabase/seed.sql`, so it never runs in normal resets.

- [ ] **Step 2: Implement `scripts/packs-dev.ts`** with `create-sample` (applies the SQL above) and `grant` (resolves `username` to `profiles.id`, upserts into `pack_entitlements` with `source = 'grant'`). It must refuse to run unless the Supabase URL is `localhost` or `127.0.0.1`, so it can never grant packs on a real project.

- [ ] **Step 3: Verify end to end** against the local stack: create the sample, sign in as a test user, confirm the shop shows "Coming soon" and the content is absent from the content pickers; run `grant`, refetch, confirm "Owned" and that the content now appears in the pickers; grant with `--expires` in the past and confirm it disappears again. Record the outcome honestly in the PR's Tests section, including anything not checked.

- [ ] **Step 4: Commit**

```bash
git add scripts/packs-dev.ts supabase/seed/dev-pack.sql package.json
git commit -m "chore: dev script to create and grant a sample pack"
```

---

## Out of scope (separate plans)

- **Theme provider.** Not in this plan on purpose. The Night Vigil spec mandates one dark palette and locks it with `single-theme`, `theme-drift` and `contrast` tests, and `THEME_COLORS` is imported at module level in about 57 places. Making themes switchable needs its own spec first.
- Payments: RevenueCat / Stripe webhook edge function, purchase buttons, restore purchases.
- Art storage: private `pack-assets` bucket, signed URLs, portrait and token components.
- Tier limits (character and campaign caps) and the DM-pays subscription.
- The first real pack and the artist contract.
