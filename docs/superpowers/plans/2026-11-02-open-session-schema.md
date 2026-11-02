# Open Session — Schema, RPCs and API Implementation Plan (PRD step 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `sessions` table, its RLS and Realtime publication, five role-checked RPCs, and a typed client API, with no UI.

**Architecture:** One `sessions` row per play session. Reads go through a members-only select policy; all writes go through `security definer` RPCs that act on `auth.uid()` and raise `P0001` errors with stable messages, exactly like `create_campaign` / `join_campaign`. Each RPC locks the session row (`for update`) so simultaneous taps resolve to one outcome. The client wraps the RPCs in `src/features/sessions/sessions.api.ts` and reuses `unwrap` / `AppError`.

**Tech Stack:** Postgres + RLS + pgTAP (`supabase/tests`), Supabase Realtime publication, supabase-js, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-02-open-session-prd.md` (read first). Conventions: `docs/superpowers/specs/2026-11-01-foundation-rebuild-design.md` §5.3–5.4.

## Global Constraints

- Conventions (§5.3): snake_case, plural table, `uuid` ids, `created_at`/`updated_at` with `public.set_updated_at()`, explicit `on delete` on every FK, an index on every FK and every RLS column, **check constraints not enums**.
- RPCs: `language plpgsql`, `security definer`, `set search_path = ''`, `revoke execute ... from public, anon`, `grant execute ... to authenticated, service_role`. Errors are `raise exception '<code>' using errcode = 'P0001'`. First check is always `not_authenticated`.
- At most one `status = 'active'` session per campaign (partial unique index).
- Roles (PRD): GM = `campaigns.gm_id`. "Active member" = GM, or a `campaign_members` row with `status = 'active'`. Note the existing `is_campaign_member()` also counts **invited** rows, so it must not be used for session access.
- Any active member: open session, enter combat. GM or the opener: end session. GM or whoever entered combat: end combat. GM only: set/clear turn. Turn holder: end own turn.
- A turn can only exist while `in_combat`; `in_combat` only while `status = 'active'`. A turn target must be an active member with a non-null `character_id`.
- Add `public.sessions` to the `supabase_realtime` publication (empty on the hosted project as of 2026-11-02).
- Do **not** apply migrations to the hosted project, push, or open a PR without the owner's confirmation. Test against the local stack only. Commits are local.
- `npm test` (`lint:tokens` then jest) and `npx supabase test db` must pass at the end of every task.

## Review Focus

1. An **invited** (not yet active) member must neither read sessions nor open one. (Tasks 1, 2)
2. Calling `open_session` twice, or with a session already active, must return the same row, never a second row or a unique-violation error. (Task 2)
3. Ending a session or combat must leave no dangling `in_combat` or `current_turn_user_id`. (Tasks 1, 2)
4. A turn holder who leaves the campaign or detaches their character must lose the turn automatically. (Task 1)
5. Every transition RPC called on an **ended** session must fail with `no_active_session`, not mutate it. (Task 2)

---

## File Structure

- Create `supabase/migrations/20261102000001_sessions.sql` — helper, table, constraints, indexes, RLS, realtime, leave-trigger.
- Create `supabase/migrations/20261102000002_session_rpcs.sql` — the five RPCs and grants.
- Create `supabase/tests/rls_sessions.test.sql`, `supabase/tests/rpc_sessions.test.sql` — pgTAP, same style as `rpc_join.test.sql` / `rls_campaigns.test.sql`.
- Modify `src/types/database.types.ts` — regenerated.
- Modify `src/features/errors.ts` — new codes + copy.
- Create `src/features/sessions/sessions.api.ts`, `__tests__/features/sessions/sessions.api.test.ts`.

### Task 1: `sessions` table, RLS, Realtime, leave-trigger

**Files:**
- Create: `supabase/migrations/20261102000001_sessions.sql`
- Test: `supabase/tests/rls_sessions.test.sql`

**Interfaces:**
- Produces: `public.sessions(id, campaign_id, opened_by, status, in_combat, combat_started_by, current_turn_user_id, started_at, ended_at, created_at, updated_at)`; `public.is_active_campaign_member(p_campaign_id uuid) returns boolean` (security definer, stable, plpgsql).

- [ ] **Step 1: Write the failing pgTAP test** (`rls_sessions.test.sql`). Seed users GM, player (active, with character), invited, outsider, one campaign, one active session inserted as the superuser. Assertions, each with a description:
  - GM sees 1 row; active player sees 1; **invited sees 0**; outsider sees 0.
  - Direct `insert`/`update`/`delete` on `public.sessions` as GM and as player each fail (`42501`).
  - A second `status='active'` insert for the same campaign (as superuser) fails with `23505`.
  - Check constraints reject (as superuser): `in_combat = true` with `status = 'ended'`; `current_turn_user_id` set with `in_combat = false`; `status = 'ended'` with null `ended_at`.
  - Deleting the player's `campaign_members` row clears `current_turn_user_id`; setting their `character_id` to null clears it; promoting nothing else changes it.
  - `sessions` is in `pg_publication_tables` for `supabase_realtime`.
- [ ] **Step 2: Run to verify it fails.** `npx supabase start` (once), then `npx supabase test db` → FAIL (relation `public.sessions` does not exist).
- [ ] **Step 3: Write the migration.** `is_active_campaign_member(uuid)`: true when caller is `campaigns.gm_id` or has a `campaign_members` row with `status='active'`. Table per Global Constraints with FKs `campaign_id → campaigns (cascade)`, `opened_by → profiles (cascade)`, `combat_started_by → profiles (set null)`, `current_turn_user_id → profiles (set null)`; indexes on all four FKs; partial unique `sessions_one_active_per_campaign on (campaign_id) where status = 'active'`; checks `status in ('active','ended')`, `in_combat = false or status = 'active'`, `current_turn_user_id is null or in_combat`, `(status = 'ended') = (ended_at is not null)`; `set_updated_at` trigger. Enable RLS; one select policy `using (public.is_active_campaign_member(campaign_id))`; no write policies. `alter publication supabase_realtime add table public.sessions`. Trigger function `sessions_clear_turn_on_leave()` (security definer) as `after update or delete` on `campaign_members`: when the row is deleted, or `character_id` becomes null, or `status` is no longer `'active'`, `update public.sessions set current_turn_user_id = null where campaign_id = old.campaign_id and current_turn_user_id = old.user_id`.
- [ ] **Step 4: Run to verify it passes.** `npx supabase db reset && npx supabase test db` → all files PASS (existing tests unaffected).
- [ ] **Step 5: Commit** `feat(db): sessions table with RLS, realtime and turn cleanup`.

### Task 2: Session RPCs

**Files:**
- Create: `supabase/migrations/20261102000002_session_rpcs.sql`
- Test: `supabase/tests/rpc_sessions.test.sql`

**Interfaces:**
- Consumes: Task 1 table and `is_active_campaign_member`.
- Produces (all `returns public.sessions`): `open_session(p_campaign_id uuid)`, `end_session(p_session_id uuid)`, `set_combat(p_session_id uuid, p_in_combat boolean)`, `set_turn(p_session_id uuid, p_user_id uuid)` (null clears), `end_turn(p_session_id uuid)`.
- Error codes (message = code): `not_authenticated`, `not_member`, `no_active_session`, `not_allowed`, `not_in_combat`, `invalid_turn_target`, `not_your_turn`.

- [ ] **Step 1: Write the failing pgTAP test** (`rpc_sessions.test.sql`; same seed as Task 1 plus a second player with a character and a GM-less-character case — the GM has no `character_id`). Calls run with `set local request.jwt.claims` per user. Assertions:
  - `open_session`: invited → `not_member`; outsider → `not_member`; player opens → status `active`, `opened_by` = player; second call by GM returns **the same id** and `select count(*) from sessions where campaign_id = …` = 1.
  - `end_session`: other player → `not_allowed`; opener succeeds; GM succeeds on a fresh one; after end, `in_combat = false`, turn null, `ended_at` not null; calling again → `no_active_session`.
  - `set_combat`: any active player enters (`in_combat = true`, `combat_started_by` = caller); entering again is a no-op returning the same row; a *different* player ending → `not_allowed`; the starter ending succeeds; GM ending succeeds; ending clears turn and `combat_started_by`; invited → `not_member`.
  - `set_turn`: player → `not_allowed`; GM when not in combat → `not_in_combat`; GM → player with character succeeds; GM → GM (no character) and → invited user → `invalid_turn_target`; GM with null clears; moving the turn replaces the holder.
  - `end_turn`: holder succeeds and turn becomes null; non-holder (including GM) → `not_your_turn`.
  - Every transition on an ended session → `no_active_session`; unauthenticated (`request.jwt.claims` empty) → `not_authenticated`.
  - Privileges: `anon` cannot execute any of the five (`has_function_privilege` false).
- [ ] **Step 2: Run to verify it fails.** `npx supabase db reset && npx supabase test db` → FAIL (functions do not exist).
- [ ] **Step 3: Implement the five RPCs.** Lock with `select * into v_s from public.sessions where id = p_session_id for update` (for `open_session`, look up the active row by campaign and, on `unique_violation` from the insert, re-select it and return it). Order of checks in each: authenticated → session exists and `status = 'active'` (`no_active_session`) → caller is an active member (`not_member`) → role rule (`not_allowed`) → state rule. Combat end and session end reset `in_combat`, `combat_started_by`, `current_turn_user_id`. `set_turn` validates the target with a `campaign_members` lookup (`status = 'active' and character_id is not null`). Add `revoke`/`grant` lines per Global Constraints.
- [ ] **Step 4: Run to verify it passes.** `npx supabase db reset && npx supabase test db` → PASS.
- [ ] **Step 5: Commit** `feat(db): session RPCs with role checks`.

### Task 3: Types, error codes and client API

**Files:**
- Modify: `src/types/database.types.ts`, `src/features/errors.ts`
- Create: `src/features/sessions/sessions.api.ts`
- Test: `__tests__/features/sessions/sessions.api.test.ts`

**Interfaces:**
- Consumes: Task 2 RPC names, params, error codes.
- Produces: `type Session = Database['public']['Tables']['sessions']['Row']`; `getActiveSession(campaignId: string): Promise<Session | null>`; `openSession(campaignId: string): Promise<Session>`; `endSession(sessionId: string): Promise<Session>`; `setCombat(sessionId: string, inCombat: boolean): Promise<Session>`; `setTurn(sessionId: string, userId: string | null): Promise<Session>`; `endTurn(sessionId: string): Promise<Session>`. New `AppErrorCode`s: `not_member`, `no_active_session`, `not_allowed`, `not_in_combat`, `invalid_turn_target`, `not_your_turn`, each added to `ERROR_COPY` and `RPC_CODES`.

- [ ] **Step 1: Write the failing jest tests**, in the style of `campaigns.api.test.ts` (mock `@/lib/supabase`): each function calls `supabase.rpc` with `open_session {p_campaign_id}`, `end_session {p_session_id}`, `set_combat {p_session_id, p_in_combat}`, `set_turn {p_session_id, p_user_id}`, `end_turn {p_session_id}`; `it.each` over the six new codes maps `{ code: 'P0001', message }` to `AppError` with that `code`; `getActiveSession` selects from `sessions` filtered `campaign_id` and `status = 'active'` and returns `null` when there are no rows.
- [ ] **Step 2: Run to verify it fails.** `npx jest __tests__/features/sessions` → FAIL (module not found).
- [ ] **Step 3: Regenerate types** with `npx supabase gen types typescript --local > src/types/database.types.ts`; confirm the diff only adds `sessions` and the five functions. Add the codes and plain-language copy to `src/features/errors.ts` (e.g. `not_member`: "You're not part of this campaign yet."). Implement `sessions.api.ts` with `unwrap`, mirroring `campaigns.api.ts`.
- [ ] **Step 4: Run the full suite.** `npm test` → PASS; `npx supabase test db` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `feat: sessions api and error codes`.

## Self-Review

- **Spec coverage:** PRD P0 items 1 (open/end), 3 (combat rules incl. starter-ends), 4 server rules (turn target, End Turn), 6 (table, RPCs, RLS, publication) → Tasks 1–3. Items 2 (badges), 4 (banner UI) and 5 (client Realtime + reconnect) are PRD steps 2–4, deliberately out of this plan.
- **Names:** RPC names and params in Task 3 match Task 2's Interfaces; `combat_started_by` is the one column the PRD implies but does not name.
- **Out of scope here:** any UI, the Realtime client subscription, hosted-project migration (needs owner approval), auto-expiry of stale sessions (open question).
