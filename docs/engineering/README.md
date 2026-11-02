# Engineering

How the app is built, run, tested and shipped.

## The stack

Expo (React Native with Expo Router, web first and iOS/Android from the same code), Supabase (auth, Postgres with row level security, realtime, edge functions), TanStack Query for data, NativeWind for styling, Jest and pgTAP for tests. Web build config is in `vercel.json`.

## What's here

- [Entitlements architecture](entitlements-architecture.md): packs, entitlements, access rules, shop (built)
- [Billing integration](billing-integration.md): webhooks and providers (proposed)
- [Tier limits and subscriptions](tier-limits-and-subscriptions.md): DM Pro and caps (proposed)
- [Art storage and delivery](art-storage-and-delivery.md): private bucket and signed URLs (proposed)

Implementation plans for built features are under `docs/superpowers/plans/`, for example [packs foundation](../superpowers/plans/2026-11-02-packs-foundation.md).

## Conventions already in the code

- **Database:** migrations in `supabase/migrations/` named `YYYYMMDDNNNNNN_name.sql`; RLS on every table; helper functions are `security definer` with `set search_path = ''`; policies wrap `auth.uid()` as `(select auth.uid())`; tests in `supabase/tests/*.test.sql` (pgTAP).
- **Client:** features in `src/features/<name>/` with `*.api.ts` and `*.queries.ts`; errors mapped through `src/features/errors.ts`.
- **Styling:** tokens only. `npm test` runs `lint:tokens` before Jest.

## Still to write

- [ ] **Architecture overview**: modules, data flow, how a screen reads and writes data, with one diagram
- [ ] **Local setup**: install the Supabase CLI, start the local stack, set `.env.local` (see `.env.local.example`), seed the database, run the app
- [ ] **Testing guide**: `npm test`, `supabase test db`, what to test at which layer. Note that Jest's config ignores `.claude/worktrees/`, so tests need command-line overrides inside a worktree
- [ ] **Database and RLS guide**: the conventions above with examples, plus how to avoid policy recursion
- [ ] **Types**: how `src/types/database.types.ts` is generated and when to regenerate it
- [ ] **Deploy and release**: web hosting, store builds, environment variables per environment, rollback
- [ ] **Realtime and sessions**: how the live session state works (see the [open session PRD](../superpowers/specs/2026-11-02-open-session-prd.md))
- [ ] **Dependencies and upgrades**: Expo SDK upgrade notes, pinned versions, known issues
- [ ] **Secrets**: where each secret lives and who can rotate it (names only, never values)
