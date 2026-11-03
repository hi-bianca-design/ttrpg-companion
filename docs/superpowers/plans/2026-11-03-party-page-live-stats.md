# Party Page with Live Stats Implementation Plan (PRD Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every party member's hit points, conditions and key out-of-combat stats on one page, read-only for everyone but the owner, updating live.

**Architecture:** A `src/features/party/` module. One query loads the party's characters (reusing `getCharacter`'s row-to-record mapping, extracted so it is shared). A Supabase Realtime subscription on `characters` (filtered to the party's ids; RLS decides what each subscriber receives) merges changed rows into that query's cache and recomputes derived values from the cached picks and items. A per-system `partySummary` hook on the game system supplies the card's chips and its expanded details, so non-D&D systems fall back cleanly. `PartyList` replaces the member list on the sheet's Campaign tab and on the campaign screen (the GM's view).

**Tech Stack:** Expo Router, React Query, supabase-js Realtime, NativeWind, jest-expo, pgTAP.

**Spec:** `docs/superpowers/specs/2026-11-03-party-and-combat-design.md` (Phase 1, plus "Calls made while writing this"). Read it first.

## Global Constraints

- **Read-only for non-owners.** No control on the party page edits another member's hit points, conditions or any stat. Players edit their own numbers on the Character tab only.
- **Live scope (PRD call):** live (about 2 s) = hit points, temporary hit points, conditions, inspiration, level and name, which all come from the `characters` row. Derived values (AC, passive scores, speed, darkvision) are computed on the phone from picks and items and refresh when the page opens, on pull-to-refresh and on a 60 s interval; they are not pushed.
- **Card, always visible:** name, class and level, hit-point bar with `current/max`, conditions, chips for `AC`, `Passive` (perception) and `Speed`. **Expanded on tap:** passive insight, passive investigation, darkvision range when the species has it, inspiration when set. **Not in Phase 1** (no data in the app today): languages and spell save DC; record that in the PRD as deferred.
- Systems without a `partySummary` hook show name, class and level, a hit-point bar if the character has an `hp` pool, and conditions: never a crash.
- **States:** loading (skeleton cards), empty copy `No one has joined with a character yet`, a member without a character listed by name with `No character yet`, error with `Try again` (existing `ERROR_COPY.load_failed`), a quiet `Reconnecting…` marker while the Realtime channel is down, and a refetch when it recovers. Works for 1 to about 8 members and long names (single-line truncation).
- Invited (not yet active) members see no party stats and no error: the query simply returns nothing for them. The page works with no session open.
- Design system: tokens only (`npm run lint:tokens`), no `rounded-full`, red only for destructive/error, 44pt touch targets, hit points as text as well as a bar, conditions as text chips.
- GM = `campaigns.gm_id`; a GM has no character and so no card; the campaign screen shows the party's cards.
- `npm test` equivalent must pass at the end of every task. In a `.claude/worktrees` checkout run jest through a CLI override of the ignore lists (the config ignores that path), with a longer timeout when the machine is loaded; `npm run lint:tokens` currently fails on `main` at `app/(app)/characters/index.tsx:33` (`pr-10`), so use a wrapper that tolerates only that line.
- Do not push, open a PR, or apply migrations to a shared database without the owner's confirmation.

## Review Focus

1. No path edits another member's numbers: no handler on the party page writes a character. (Task 5)
2. An invited member, or anyone outside the campaign, sees no stats and no error; a Realtime event for a character outside the current party is ignored. (Tasks 1, 4, 5)
3. After the channel drops and recovers the page refetches and shows the true values; while it is down the marker shows and the numbers are never presented as current without it. (Task 4)
4. A member who leaves, or detaches their character, disappears from the page and the subscription is rebuilt for the new id list. (Task 4)
5. A system without `partySummary`, a member with no character, a 40-character name and eight members render without crashing or overflow. (Tasks 2, 5)

---

## File Structure

- Create `supabase/migrations/20261103000001_characters_realtime.sql`, `supabase/tests/rls_characters_realtime.test.sql`.
- Modify `src/systems/types.ts` (optional `partySummary`), `src/systems/dnd5e-2024/rules.ts` and `definition.ts` (insight, investigation, darkvision, summary), tests in `__tests__/systems/dnd5e-2024/`.
- Modify `src/features/characters/characters.api.ts` (extract `toCharacterFull`).
- Create `src/features/party/party.api.ts`, `party.queries.ts`, `usePartyRealtime.ts`, `PartyCard.tsx`, `PartyList.tsx`; modify `src/lib/query-client.ts` (`qk.party`), `app/(app)/characters/[id]/campaign.tsx`, `app/(app)/campaigns/[id].tsx`; tests under `__tests__/features/party/`.

### Task 1: Publish `characters` to Realtime

**Files:** Create `supabase/migrations/20261103000001_characters_realtime.sql`; Test `supabase/tests/rls_characters_realtime.test.sql`.

**Interfaces:** Produces: `public.characters` in the `supabase_realtime` publication. Existing select policy `characters_select` (owner, or `campaign_visible_character_ids()`) decides who receives events.

- [ ] **Step 1: Write the failing pgTAP test** (same style as `rls_sessions.test.sql`; run each file inside a rolled-back transaction with the migration applied, never resetting a shared stack): `characters` is in `pg_publication_tables` for `supabase_realtime`; an active member of a campaign sees a teammate's character, an invited member and an outsider see none (documents the policy Realtime relies on).
- [ ] **Step 2: Run to verify it fails** (not published).
- [ ] **Step 3: Write the migration:** `alter publication supabase_realtime add table public.characters;`.
- [ ] **Step 4: Run to verify it passes**, plus every existing pgTAP file.
- [ ] **Step 5: Commit** `feat(db): publish characters to realtime`.

### Task 2: Per-system party summary

**Files:** Modify `src/systems/types.ts`, `src/systems/dnd5e-2024/rules.ts`, `src/systems/dnd5e-2024/definition.ts`; Test `__tests__/systems/dnd5e-2024/party-summary.test.ts`, `__tests__/systems/dnd5e-2024/rules.test.ts`.

**Interfaces:**
- Produces: `type SummaryItem = { key: string; label: string; value: string }`; `type PartySummary = { glance: SummaryItem[]; more: SummaryItem[] }`; optional `GameSystem.rules.partySummary?(c: CharacterRecord, picks: PickRecord[]): PartySummary`. D&D 2024: `glance` = `ac`, `passive_perception`, `speed`; `more` = `passive_insight`, `passive_investigation`, `darkvision` (only when a species trait names Darkvision, value like `60 ft`), `inspiration` (`Inspired`, only when `details.inspiration` is true). `derived()` gains `passive_insight` and `passive_investigation` (10 + ability mod + skill bonus, like passive perception).

- [ ] **Step 1: Write failing tests:** `derived()` returns `passive_insight` and `passive_investigation` with the right values for a character with and without the skill proficiency; `partySummary` returns the three glance items, omits `darkvision` for a species without it, includes `60 ft` for a species whose trait text says "Darkvision with a range of 60 feet" and `120 ft` for "Superior Darkvision" with 120, includes `Inspired` only when set; a system module without `partySummary` is allowed by the type.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the types, the two derived values (reuse the existing `skillBonus` helper), a small `darkvisionRange(picks): number | null` reading the species pick's trait text with a regex, and `partySummary`.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: party summary for the D&D system`.

### Task 3: Load the party's characters

**Files:** Modify `src/features/characters/characters.api.ts`, `src/lib/query-client.ts`; Create `src/features/party/party.api.ts`; Test `__tests__/features/party/party.api.test.ts`, existing `characters.api` tests.

**Interfaces:**
- Produces: `toCharacterFull(row): CharacterFull` (the mapping now inside `getCharacter`, extracted and exported from `characters.api.ts`; `getCharacter` calls it, behaviour unchanged); `getPartyCharacters(characterIds: string[]): Promise<CharacterFull[]>` (one `.in('id', ids)` query with the same select as `getCharacter`; returns `[]` for an empty list without calling the API); `qk.party(campaignId: string)`.

- [ ] **Step 1: Write failing tests:** `getPartyCharacters([])` returns `[]` and makes no request; with ids it requests `characters` filtered `in('id', ids)` and returns mapped `CharacterFull`s with `derived` computed; an error maps through `unwrap`; existing `getCharacter` tests pass unchanged.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the extraction and `getPartyCharacters`.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: party characters api`.

### Task 4: Party query and live updates

**Files:** Create `src/features/party/party.queries.ts`, `src/features/party/usePartyRealtime.ts`; Test `__tests__/features/party/party.queries.test.tsx`, `__tests__/features/party/usePartyRealtime.test.tsx`.

**Interfaces:**
- Consumes: `CampaignFull` (members with `character_id`), `getPartyCharacters`, supabase-js `channel()`.
- Produces: `usePartyCharacters(campaign: CampaignFull | undefined)` — React Query over `qk.party(campaign.id)`, ids = active members' `character_id`s, `refetchInterval: 60_000`; `usePartyRealtime(campaign: CampaignFull | undefined): { connected: boolean }` — subscribes to `postgres_changes` `UPDATE` on `characters` with filter `id=in.(…ids)`, merges `payload.new` (`name`, `level`, `resources`, `conditions`, `details`, `stats`) into the cached `CharacterFull` and recomputes `derived`, ignores ids not in the cache, resubscribes when the id list changes, tears down on unmount, reports `connected` from the channel status and invalidates `qk.party` when the status returns to `SUBSCRIBED` after a drop.

- [ ] **Step 1: Write failing tests** (supabase mocked with a fake channel exposing `.on`, `.subscribe(cb)`, `.unsubscribe`/`removeChannel`): the query is disabled with no campaign and has no ids for invited-only; an event for a cached character updates hit points and conditions in the cache; an event for an unknown id changes nothing; a changed id list tears down the old channel and builds a new filter; unmount removes the channel; status `CHANNEL_ERROR`/`CLOSED` → `connected` false, then `SUBSCRIBED` → `connected` true and the party query is invalidated.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** both hooks.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: party query and live updates`.

### Task 5: Party card, list and mounts

**Files:** Create `src/features/party/PartyCard.tsx`, `src/features/party/PartyList.tsx`; Modify `app/(app)/characters/[id]/campaign.tsx`, `app/(app)/campaigns/[id].tsx`, the tests that render them; Test `__tests__/features/party/PartyCard.test.tsx`, `PartyList.test.tsx`.

**Interfaces:**
- Consumes: Task 4 hooks, `getSystem(...).rules.partySummary`, `ERROR_COPY`.
- Produces: `PartyCard({ character }: { character: CharacterFull })` (read-only; tap toggles the expanded details, `accessibilityState.expanded`); `PartyList({ campaign }: { campaign: CampaignFull })` — owns the states (loading skeletons, empty copy, no-character rows, error with retry, `Reconnecting…` marker) and renders cards in a stable order (GM-excluded, characters by name). It replaces `<MemberList …/>` inside the existing `SectionHeader` titled `Party` on both screens.

- [ ] **Step 1: Write failing tests:** card shows name, class and level, `current/max` text, a conditions chip per condition and the three glance chips; tapping reveals the `more` items and tapping again hides them; no control on the card or the list invokes any write (assert no mutation hooks are imported or called); a system without `partySummary` renders the fallback; list shows skeletons while loading, the empty copy for no characters, `No character yet` for a member without one, the error with `Try again` that refetches, and `Reconnecting…` only while `connected` is false; a 40-character name is single-line truncated; eight members render; an invited viewer (no party rows returned) shows the empty copy, not an error.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the card and list and mount them on both screens; keep the campaign card and the session controls where they are; delete `MemberList.tsx` and its test only if nothing else imports it.
- [ ] **Step 4: Run to verify they pass**, then the full suite and the lint wrapper.
- [ ] **Step 5: Commit** `feat: party page with live stats`.

### Task 6: Verify in the app

- [ ] **Step 1:** With the owner's go-ahead, apply the new migration to the hosted project through the CLI (`db push`), then with two accounts: the GM's campaign screen and a player's Party tab show the other member's hit points and conditions; the player changes hit points on their Character tab and the GM's screen updates within about 2 s; airplane mode on the GM's phone shows `Reconnecting…` and recovers with the true values; an invited account sees no stats.
- [ ] **Step 2:** Note in the PR what was and was not checked (iOS/Android not covered; derived stats refresh on open and every 60 s, not instantly).

## Self-Review

- **Spec coverage:** PRD Phase 1 → Tasks 1-5: live values (1, 4), card contents (2, 5), read-only (5), states (5), outside-a-session (5), invited sees nothing (1, 5). Languages and spell save DC are deferred because the app has no data for them; Task 6's PR note and a PRD edit record it. Phases 2-4 are separate plans.
- **Names:** `partySummary`, `SummaryItem`, `toCharacterFull`, `getPartyCharacters`, `usePartyCharacters`, `usePartyRealtime`, `PartyCard`, `PartyList`, `qk.party` match across tasks.
- **Risk to watch:** Realtime `postgres_changes` delivery depends on the select policy for each subscriber; Task 1's test documents the policy, and Task 6 proves it end to end on the hosted project.
