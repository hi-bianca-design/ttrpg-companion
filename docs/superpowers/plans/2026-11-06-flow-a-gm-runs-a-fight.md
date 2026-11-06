# Flow A: GM Runs a Fight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GM's list-style battle order and number-entry roll-call with a review-then-enter flow and a side-by-side enemy-card combat screen that keeps working offline.

**Architecture:** Server changes are three new Supabase migrations (enemy fields, encounters, prepared-combat launch plus auto-skip). The client keeps the existing fetch-and-invalidate React Query model and the existing combat RPCs, and adds: a local review draft that becomes one atomic launch RPC call, an enemy card grid, an initiative strip, a quick-add sheet, a Cmd/Ctrl+K search panel, and an offline layer (persisted cache plus queued mutations) that does not exist today.

**Tech Stack:** Expo Router, React Native (web first), TypeScript, Supabase (Postgres RPCs, RLS, pgTAP), React Query v5, NativeWind, `react-native-gesture-handler`, Jest with `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-11-06-flow-a-gm-runs-a-fight-ux.md` (UX), `docs/superpowers/specs/2026-11-06-gm-table-redesign-prd.md` (PRD), `docs/superpowers/specs/2026-11-06-flow-a-tickets.md` (FA-1 to FA-12, referenced per task).

## Global Constraints

- Players see a monster's **name only**: no stats, HP, XP, story notes. Enemy data, hidden enemies and encounters are never readable by non-GMs (RLS plus the player-safe `combat_order` projection); never add columns to `combat_order`.
- All new database writes are `security definer` functions with `set search_path = ''`; failures raise the existing coded `P0001` messages (add new codes to `AppErrorCode` and `ERROR_COPY` in `src/features/errors.ts`).
- Token lint (`npm run lint:tokens`, enforced in `src/features`, `src/components/game`, `src/systems`, `app`): no hex or rgb literals, no inline `style` colour/spacing/font props, no arbitrary `-[...]` classes, spacing utilities only on steps 0, 1, 2, 3, 4, 6, 8, 11. Colours from `THEME_COLORS` only for JS. No red except destructive and error uses.
- knip is an error for unused files and dependencies: every new file in `src` must be reachable from `app/` or a test; any new package must be imported.
- Touch targets 44pt; current turn never shown by colour alone; health is text as well as a bar; every drag has move up and move down buttons.
- Dice stay physical; no rules automation beyond the existing arithmetic.
- GM layout is web-first on a laptop or tablet in landscape; there is no breakpoint system today, so Task 6 defines one helper rather than scattering `useWindowDimensions`.
- CI runs `npm ci`, `npm run typecheck`, `npm test -- --ci` (token lint then jest), `npm run lint:dead`. pgTAP files under `supabase/tests/` are **not** run in CI: run them locally with `supabase test db`.

## Where this plan departs from the spec (check these)

1. **Review screen is a local draft.** Nothing is written to the server until **Enter combat**, which calls one RPC (`start_prepared_combat`). If a player already tapped Enter combat, the RPC reuses that rolling combat. Players still see "Combat is starting" in that case, as today.
2. **Late or character-less members.** Only members with a character appear in the draft. Anyone who joins later is added to the end by the existing member sync, and the GM drags them. The spec's "waiting" row is not built.
3. **Search content.** The spec says "SRD rules and spells". The `content` table has spells, items, magic items, feats, classes, species, backgrounds and subclasses, and **no rules or monsters**. v1 searches those kinds plus the campaign's encounters. NPCs, lore, locations and monsters arrive with Flow B.
4. **"Save for later"** (quick-add, spec section 3) is deferred: there is no library to save into until Flow B.
5. **Offline** covers a dropped connection and a page reload while offline, on web. Native connectivity detection is out of scope.
6. **Quick-add "search and pick"** (spec section 3, path 2) has no monster data to search yet. The sheet's second path picks a **saved encounter** instead (reinforcements); searching monsters comes with Flow B. Copy (path 1) and Blank (path 3) are as specced.
7. **Initiative numbers** stop being shown or edited. The `initiative` column and `set_initiative` RPC stay in the database (removing them is a later cleanup); the client stops using them.

## Review Focus

1. A fight where every other creature is a downed enemy: `Next turn` must not loop forever or crash (Task 3, Task 7).
2. A hidden enemy launched from an encounter never appears in a player's order, and no player can read `encounters`, `encounter_enemies` or story notes (Task 2, Task 3 pgTAP).
3. Launching the same encounter twice, or adding it mid-fight, makes independent copies with dense names, and the saved encounter is unchanged (Task 3).
4. Reload while offline restores the last cards; queued edits replay once each in order (idempotent HP batches, stale-turn no-op); sign-out clears the persisted combat cache (Task 11).
5. Twelve or more enemies with long names on a wide screen and on a narrow tablet: cards wrap, downed cards collapse, nothing overlaps; Enter combat with zero enemies works (Task 6, Task 5).

---

### Task 0: Bring the branch up to `main` and confirm a green baseline

**Why.** The code map found this branch at `7e5aaed`, which lacks PR #49 (battle-order UI) and migration `20261104000007`; `main` has them. Everything below assumes `main`'s code.

**Files:** none (git only).

- [ ] **Step 1: Sync the worktree with the base branch** using the `sync_with_base_branch` host tool (do not run `git merge` or `git pull` by hand). Resolve conflicts if any; the three untracked docs under `docs/superpowers/specs/2026-11-06-*.md` must survive.
- [ ] **Step 2: Verify the files exist.** Run `ls src/features/combat` and confirm `GmBattleOrder.tsx`, `RollCall.tsx`, `AddEnemyForm.tsx`, `EnemyRow.tsx`, `HpEntryBar.tsx`, `BulkBar.tsx`, `battleOrder.ts`, `useEnemyHp.ts`; and `ls supabase/migrations | tail -2` shows `20261104000007_drop_manual_turn.sql`.
- [ ] **Step 3: Baseline.** Run `npm ci && npm run typecheck && npm test -- --ci && npm run lint:dead`. Expected: all pass. Record any pre-existing failure in the task notes and stop if one exists.
- [ ] **Step 4: Commit the three spec docs and this plan** with `docs: GM table redesign PRD, Flow A spec, tickets and plan`.

---

### Task 1: Enemy fields for cards (FA-1)

**Files:**
- Create: `supabase/migrations/20261106000001_enemy_card_fields.sql`, `supabase/tests/enemy_card_fields.test.sql`
- Modify: `src/types/database.types.ts` (regenerate), `src/features/combat/combat.api.ts`, `src/features/combat/battleOrder.ts`
- Test: `__tests__/features/combat/battleOrder.test.ts`, `__tests__/features/combat/combat.api.test.ts`

**Interfaces:**
- Produces (DB): `combat_entries.defense_label text`, `combat_entries.attacks jsonb not null default '[]'`, `combat_entries.xp int`, `combat_entries.conditions text[] not null default '{}'` (≤ 12 entries, each ≤ 30 chars). `add_enemies(p_combat_id uuid, p_name text, p_count int, p_max_hp int, p_initiative int, p_ac int, p_notes text, p_hidden boolean, p_defense_label text, p_attacks jsonb, p_xp int) returns uuid[]` (old 8-arg signature dropped). `update_enemy` patch accepts `defense_label`, `attacks`, `xp`, `conditions`.
- Produces (TS): `export type Attack = { name: string; toHit: string; damage: string }`; `NewEnemy` and `EnemyPatch` gain `defenseLabel`/`defense_label`, `attacks`, `xp`, `conditions`; `GmEnemyRow` gains `defenseLabel: string | null; attacks: Attack[]; xp: number | null; conditions: string[]`.

- [ ] **Step 1: Write the failing pgTAP test** `enemy_card_fields.test.sql`: adding an enemy with `p_attacks => '[{"name":"Bite","toHit":"+4","damage":"2d4+2"}]'`, `p_xp => 50`, `p_defense_label => 'AC'` stores them; `update_enemy(.., '{"xp": 75}')` changes xp; attacks longer than 6 entries or `xp < 0` raises `invalid_enemy`; a player entry cannot hold these columns; a non-GM cannot read them (existing RLS).
- [ ] **Step 2: Run** `supabase test db` and confirm the new file fails.
- [ ] **Step 3: Write the migration.** Add the columns with checks (`defense_label` ≤ 12 chars, `jsonb_typeof(attacks)='array' and jsonb_array_length(attacks) <= 6`, `xp >= 0`); extend the player-shape check so all three are null/empty for players; drop the old `add_enemies` signature and create the new one (copy bodies from migrations 000005 and 000006, adding the three fields to the insert); extend `update_enemy`'s allowed-key list and validation. `refresh_combat` and `combat_order` are untouched.
- [ ] **Step 4: Run** `supabase test db`; expected: PASS, including the existing combat privacy tests.
- [ ] **Step 5: Regenerate types** (`npx supabase gen types typescript --local > src/types/database.types.ts`) and check the diff only adds the new columns and signature.
- [ ] **Step 6: Failing TS tests.** In `battleOrder.test.ts`: `buildGmOrder` maps `defense_label`, `attacks`, `xp` onto the enemy row (`expect(row.attacks).toEqual([...])`, `expect(row.xp).toBe(50)`); `buildPlayerOrder` output for the same enemy has no keys other than `kind,id,name,initiative,isCurrent` (`expect(Object.keys(row).sort()).toEqual([...])`). In `combat.api.test.ts`: `addEnemies` passes `p_attacks`, `p_xp`, `p_defense_label`.
- [ ] **Step 7: Implement** the types and the mapping in `combat.api.ts` and `battleOrder.ts` (extend the existing `entry`/`enemy` helpers in `__tests__/helpers/combat.ts` with the new fields).
- [ ] **Step 8: Run** `npm run typecheck && npx jest __tests__/features/combat`; expected PASS.
- [ ] **Step 9: Commit** `feat(combat): enemy defense label, attacks and XP`.

---

### Task 2: Encounters, GM-only (FA-2 data)

**Files:**
- Create: `supabase/migrations/20261106000002_encounters.sql`, `supabase/tests/encounters_rls.test.sql`, `src/features/encounters/encounters.api.ts`, `src/features/encounters/encounters.queries.ts`
- Modify: `src/lib/query-client.ts` (add `qk.encounters(campaignId)`), `src/types/database.types.ts`
- Test: `__tests__/features/encounters/encounters.api.test.ts`

**Interfaces:**
- Produces (DB): `encounters(id, campaign_id → campaigns cascade, name text 1..80, story_before text, story_why text, story_after text (each ≤ 1000), created_at, updated_at)`; `encounter_enemies(id, encounter_id → encounters cascade, campaign_id, name 1..60, count 1..20, max_hp ≥ 1, defense_label, ac 0..40, attacks jsonb, xp ≥ 0, notes ≤ 500, hidden bool, position int)`. RLS: select, insert, update, delete all `to authenticated using/with check (public.is_campaign_gm(campaign_id))`. Not added to the realtime publication.
- Produces (TS): `export type Encounter = Database['public']['Tables']['encounters']['Row'] & { enemies: Database['public']['Tables']['encounter_enemies']['Row'][] }`; `listEncounters(campaignId: string): Promise<Encounter[]>`; `useEncounters(campaignId: string | undefined, isGm: boolean)` (enabled only for the GM).

- [ ] **Step 1: Failing pgTAP test** `encounters_rls.test.sql`: the GM can insert and read an encounter and its enemies; an active non-GM member selects zero rows from both tables and cannot insert; a non-member sees nothing; `count = 21` is rejected.
- [ ] **Step 2: Run** `supabase test db`; expected FAIL (tables missing).
- [ ] **Step 3: Write the migration** with the columns, checks and policies above.
- [ ] **Step 4: Run**; expected PASS. Regenerate `database.types.ts`.
- [ ] **Step 5: Failing TS test** `encounters.api.test.ts`: `listEncounters('camp1')` (supabase mocked as in other combat tests) returns encounters ordered by `created_at`, each with its enemies ordered by `position`; an error goes through `unwrap`.
- [ ] **Step 6: Implement** `listEncounters` as one select with the nested `encounter_enemies` relation; `useEncounters` as a `useQuery` keyed `qk.encounters(campaignId)`.
- [ ] **Step 7: Run** `npm run typecheck && npx jest __tests__/features/encounters`; expected PASS.
- [ ] **Step 8: Commit** `feat(encounters): GM-only encounters and enemies`.

*Authoring encounters is Flow B. For manual checks until then, insert one with the Supabase SQL editor (an `encounters` row plus `encounter_enemies` rows for your campaign).*

---

### Task 3: Prepared launch, reinforcements and auto-skip (FA-3, FA-8 server)

**Files:**
- Create: `supabase/migrations/20261106000003_prepared_combat.sql`, `supabase/tests/prepared_combat.test.sql`
- Modify: `src/features/combat/combat.api.ts`, `src/features/combat/combat.queries.ts`, `src/features/errors.ts`, `src/types/database.types.ts`
- Test: `__tests__/features/combat/combat.api.test.ts`, `__tests__/features/combat/combat.queries.test.tsx`

**Interfaces:**
- Produces (DB): `start_prepared_combat(p_session_id uuid, p_encounter_ids uuid[], p_order text[], p_hidden_keys text[]) returns public.combats`. GM only. Entry keys are `player:<character_id>` and `enemy:<encounter_enemy_id>:<n>` (n is the 1-based copy number). It reuses the session's live `rolling` combat or creates one, adds fresh enemy copies for each encounter, places entries in `p_order` (keys not listed go last, in their natural order), sets `hidden` for keys in `p_hidden_keys`, then starts combat exactly as `start_combat` does (status `active`, round 1, position 1 current). Raises `not_allowed`, `no_active_session`, `invalid_target` (unknown encounter or key), `not_rolling` (live combat already active).
- `add_encounter_enemies(p_combat_id uuid, p_encounter_id uuid) returns uuid[]`: GM only, combat `rolling` or `active`; copies named densely per group, placed at the bottom, none hidden unless the encounter enemy is.
- `combat_next_entry` is redefined to **skip enemies with `hp = 0`**. If every other entry is a downed enemy it returns the next position regardless (no infinite loop); `wrapped` semantics are unchanged. `set_current_entry` still lets the GM stop on a downed enemy.
- Produces (TS): `startPreparedCombat(sessionId: string, input: { encounterIds: string[]; order: string[]; hiddenKeys: string[] }): Promise<Combat>`; `addEncounterEnemies(combatId: string, encounterId: string): Promise<string[]>`; hooks `useStartPreparedCombat(campaignId: string, sessionId: string | undefined)` and `useAddEncounterEnemies(campaignId: string, combatId: string | undefined)`. No new error codes: unknown encounters and keys raise the existing `invalid_target`.

- [ ] **Step 1: Failing pgTAP tests** `prepared_combat.test.sql`:
  - launching an encounter with a ×3 group creates entries "Wolf 1", "Wolf 2", "Wolf 3" in the given order and the combat is `active` with position 1 current;
  - `p_hidden_keys => ARRAY['enemy:<id>:2']` leaves that enemy out of `combat_order` and the visible copies renumbered densely;
  - launching the same encounter twice (second via `add_encounter_enemies`) gives "Wolf 4..6" and the encounter's own rows are unchanged;
  - a non-GM calling either RPC raises `not_allowed`;
  - zero encounters and a party-only order starts combat;
  - `next_turn` skips a downed enemy but not a downed player; with all other entries downed enemies it lands on the next position and does not hang.
- [ ] **Step 2: Run** `supabase test db`; expected FAIL.
- [ ] **Step 3: Write the migration.** Build the enemy insert as a shared internal function `combat_add_encounter_enemies(p_combat_id uuid, p_encounter_id uuid) returns table(entry_id uuid, key text)` (execute revoked from authenticated) used by both RPCs; position by calling the existing `combat_place_entry`; finish with `refresh_combat`. Replace `combat_next_entry` per the interface above.
- [ ] **Step 4: Run**; expected PASS, including `rpc_combat_turns`, `privacy_combat` and `privacy_combat_silence`.
- [ ] **Step 5: Failing TS tests.** `combat.api.test.ts`: `startPreparedCombat('s1', { encounterIds:['e1'], order:['player:c1'], hiddenKeys:[] })` calls rpc `start_prepared_combat` with `p_session_id`, `p_encounter_ids`, `p_order`, `p_hidden_keys`; `addEncounterEnemies` calls `add_encounter_enemies`. `combat.queries.test.tsx`: both mutation hooks invalidate `qk.combat`, `qk.combatOrder`, `qk.combatEntries` on success and on error.
- [ ] **Step 6: Implement** the wrappers and hooks following the existing `useCombatMutation` pattern.
- [ ] **Step 7: Run** `npm run typecheck && npx jest __tests__/features/combat`; expected PASS.
- [ ] **Step 8: Commit** `feat(combat): prepared launch, reinforcements, auto-skip downed enemies`.

---

### Task 4: Review draft model (FA-4)

**Files:**
- Create: `src/features/combat/reviewDraft.ts`
- Test: `__tests__/features/combat/reviewDraft.test.ts`

**Interfaces:**
- Consumes: `Encounter` (Task 2), `CharacterFull` (existing, from the party cache).
- Produces:
  - `export type DraftRow = { key: string; kind: 'player' | 'enemy'; name: string; hidden: boolean; encounterId: string | null }`
  - `buildDraft(input: { party: CharacterFull[]; encounters: Encounter[] }): DraftRow[]` (players first, then enemies in encounter order; ×N groups expanded to `enemy:<id>:<n>` keys named "Wolf 1..N", a count of 1 keeps the bare name)
  - `moveRow(rows: DraftRow[], key: string, toIndex: number): DraftRow[]` (0-based, clamped, never mutates)
  - `moveBy(rows: DraftRow[], key: string, delta: -1 | 1): DraftRow[]`
  - `toggleHidden(rows: DraftRow[], key: string): DraftRow[]` (enemies only)
  - `launchInput(rows: DraftRow[]): { encounterIds: string[]; order: string[]; hiddenKeys: string[] }` (distinct encounter ids in first-seen order)

- [ ] **Step 1: Write the failing tests** `reviewDraft.test.ts`: `buildDraft` of two players and a Wolf ×3 encounter returns keys `player:c1, player:c2, enemy:ew1:1, enemy:ew1:2, enemy:ew1:3`; `moveRow` to index 99 clamps to last; `moveBy(rows, k, -1)` on the first row is a no-op; `moveBy` and `moveRow` produce the same result for adjacent moves; `toggleHidden` ignores players; `launchInput` returns `hiddenKeys` for hidden rows only and no duplicate encounter ids; zero encounters gives `encounterIds: []`.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat/reviewDraft.test.ts`; expected FAIL (module missing).
- [ ] **Step 3: Implement** the five pure functions.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(combat): review draft model`.

---

### Task 5: Review screen replaces the roll-call (FA-2 UI, FA-3, FA-4)

**Files:**
- Create: `src/features/combat/ReviewScreen.tsx`, `src/features/combat/EncounterPicker.tsx`
- Modify: `src/features/combat/PartyPage.tsx`: the GM's no-combat state (live session, no active combat) shows a "Run a fight" `EncounterPicker`; picking one opens `ReviewScreen` with that encounter pre-selected; the `rolling`+GM branch opens `ReviewScreen` with nothing pre-selected. The session id comes from `useActiveSession(campaignId)`.
- Delete: `src/features/combat/RollCall.tsx`, `__tests__/features/combat/RollCall.test.tsx`
- Test: `__tests__/features/combat/ReviewScreen.test.tsx`, `__tests__/features/combat/PartyPage.test.tsx`

**Interfaces:**
- Consumes: Tasks 2 to 4 (`useEncounters`, `buildDraft`, `moveRow`, `moveBy`, `toggleHidden`, `launchInput`, `useStartPreparedCombat`), `reorderTarget` from `battleOrder.ts`.
- Produces: `ReviewScreen({ campaign: CampaignFull; party: CharacterFull[]; sessionId: string; initialEncounterId?: string; onBack: () => void })` (the GM can add more encounters from the picker while reviewing); `EncounterPicker({ encounters: Encounter[]; onPick: (id: string) => void })` (empty state "No encounters yet" with the Flow B pointer text from `copy.ts`).
- The screen shows: story panel (three notes, GM only, hidden when empty, concatenated across picked encounters under each encounter's name), an enemy-preview strip, the drag list (testID `draft-<key>`; grip plus `Move up: <name>` / `Move down: <name>` buttons), a Hidden toggle on enemy rows, **Back** and **Enter combat**.

- [ ] **Step 1: Write failing tests** `ReviewScreen.test.tsx` (same setup as `GmBattleOrder.test.tsx`: mocks for supabase, combat.api and toast, `PortalHost`): picking an encounter shows its three story notes and its enemies; empty notes render nothing; `Move down: Goblin Boss` reorders the list; **Back** calls `onBack` and `startPreparedCombat` is never called; **Enter combat** calls `startPreparedCombat('s1', { encounterIds:['e1'], order:[...], hiddenKeys:[...] })` once even if tapped twice; Enter combat with no encounters and a party-only draft is allowed; a failing launch shows `showToast` with `ERROR_COPY` text and stays on the screen. `PartyPage.test.tsx`: GM with a `rolling` combat sees the review screen; a player sees `CombatStarting`; no element labelled `Initiative for <name>` exists anywhere.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat`; expected FAIL.
- [ ] **Step 3: Implement** `EncounterPicker` and `ReviewScreen` (drag grip reuses the `Gesture.Pan().runOnJS(true)` pattern from `GmBattleOrder`, calling `moveRow(rows, key, reorderTarget(...) - 1)`; guard Enter combat with a `busy` ref as `GmBattleOrder` does). Wire `PartyPage`. Remove `RollCall` and its test.
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__/features/combat && npm run lint:dead`; expected PASS (no dead `RollCall` references).
- [ ] **Step 5: Commit** `feat(combat): review screen with drag-only initiative`.

---

### Task 6: Enemy cards and the GM combat screen (FA-5, FA-6, FA-7)

**Files:**
- Create: `src/features/combat/EnemyCard.tsx`, `src/features/combat/cardsLayout.ts`, `src/features/combat/xp.ts`, `src/features/combat/GmCombatScreen.tsx`
- Modify: `src/features/combat/PartyPage.tsx` (`active`+GM renders `GmCombatScreen`), `src/features/combat/PlayerRowCard.tsx` (stop showing `initText` for enemies and players), `src/features/combat/PlayerBattleOrder.tsx`
- Delete: `src/features/combat/GmBattleOrder.tsx`, `src/features/combat/EnemyRow.tsx`, and their tests (port the cases below)
- Test: `__tests__/features/combat/EnemyCard.test.tsx`, `__tests__/features/combat/cardsLayout.test.ts`, `__tests__/features/combat/xp.test.ts`, `__tests__/features/combat/GmCombatScreen.test.tsx`, `__tests__/features/combat/PlayerBattleOrder.test.tsx`

**Interfaces:**
- Consumes: `GmEnemyRow` (Task 1), `HpEntryBar`, `BulkBar`, `useEnemyHp`, `useUpdateEnemy`, `useRemoveEntry`.
- Produces:
  - `columnsFor(width: number): 1 | 2 | 3 | 4` (below 700 → 1, 700–1023 → 2, 1024–1439 → 3, 1440+ → 4)
  - `xpEarned(rows: GmEnemyRow[]): number` (sum of `xp` for rows with `isDown` and non-null `xp`)
  - `EnemyCard({ row: GmEnemyRow; selected: boolean; onToggleSelect: () => void; hp: EnemyHp; onPatch: (p: EnemyPatch) => Promise<void>; onRemove: () => Promise<void>; onCopy: () => Promise<void> })`. Shows name, defense (`defenseLabel ?? 'AC'` and value, large), `hp/max` text plus `Progress`, `HpEntryBar`, condition chips are **not** stored for enemies today (see note), attacks, XP when non-null, **Full stat block** expander (notes for now), Hidden badge, **+1** copy. Downed rows collapse to one line (name, "Down", XP, Undo).
  - `GmCombatScreen({ campaign: CampaignFull; combat: Combat; party: CharacterFull[] })` rendering a header (round, "XP earned: N", search and add-enemy buttons), a wrapping card grid at fixed card width, `BulkBar` when anything is selected, player rows as compact cards (name, `hp/max`, conditions), and the strip from Task 7.
- Condition chips on a card read `row.conditions` (Task 1) and add or remove through `onPatch({ conditions })`, picking from the same condition list the character sheet uses (find it under `src/systems`); no timers.

- [ ] **Step 1: Write failing tests.** `cardsLayout.test.ts`: `columnsFor(699)=1, (700)=2, (1023)=2, (1024)=3, (1440)=4`. `xp.test.ts`: two downed enemies with xp 200 and 50 and one alive with xp 200 give 250; a null xp counts as 0; healing a downed enemy above 0 (re-derived row with `isDown:false`) removes its xp. `EnemyCard.test.tsx`: defense label defaults to "AC"; a downed card shows "Down" and is collapsed (no `Amount` input); `+1` calls `onCopy`; damage typed 7 on 22/30 calls `hp.apply([id], 'damage', 7)`; XP is absent when `xp` is null; no element shows `Initiative`. `GmCombatScreen.test.tsx`: 12 enemies with long names render 12 cards (`getAllByTestId(/^card-/)`), zero enemies shows the empty state with an Add enemy action; header text "XP earned: 250" after two enemies are downed in the cache; players never appear as enemy cards. `PlayerBattleOrder.test.tsx`: no `init` text is rendered.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat`; expected FAIL.
- [ ] **Step 3: Implement** the helpers, `EnemyCard` and `GmCombatScreen`. Card width is a fixed token-scale width per column count; wrap with `flex-row flex-wrap gap-4`. Reuse `HpEntryBar`/`useEnemyHp` unchanged so damage, heal, temp HP, clamping and undo keep their tested behaviour (port the equivalent cases from the deleted `EnemyRow.test.tsx`: 22/30 minus 7 is 15/30; 20 gives 0/30; temp HP absorbed first; Undo restores).
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__/features/combat && npm run lint:tokens && npm run lint:dead`; expected PASS.
- [ ] **Step 5: Commit** `feat(combat): enemy card grid with XP and collapsed downed cards`.

---

### Task 7: Initiative strip and Next turn (FA-8)

**Files:**
- Create: `src/features/combat/InitiativeStrip.tsx`
- Modify: `src/features/combat/GmCombatScreen.tsx`
- Test: `__tests__/features/combat/InitiativeStrip.test.tsx`

**Interfaces:**
- Consumes: `buildGmOrder` rows, `useNextTurn`, `useSetCurrentEntry`, `useMoveEntry`.
- Produces: `InitiativeStrip({ campaignId: string; combatId: string; rows: (PlayerRow | GmEnemyRow)[]; currentId: string | null; round: number })`: name chips in order (current marked with text "Current" and `▶`, downed enemies struck with "Down"), **Next turn** button, `Move earlier: <name>` / `Move later: <name>` buttons per chip, tap a chip to `setCurrentEntry` (active combat only).

- [ ] **Step 1: Write failing tests:** **Next turn** calls `nextTurn(combatId, currentId)` once even if tapped twice quickly; it is disabled with no current entry; tapping a downed enemy's chip calls `setCurrentEntry(id)`; `Move later: Elara` calls `moveEntry(id, position + 1)`; the current chip is identifiable without colour (text "Current"); round text "Round 3" is announced via `AccessibilityInfo.announceForAccessibility` on change.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat/InitiativeStrip.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement** the strip using the existing `turnBusy`/`run` guard pattern from the old `GmBattleOrder` (copy the guard, not the component). Auto-skip happens on the server (Task 3); the client does not skip.
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__/features/combat`; expected PASS.
- [ ] **Step 5: Commit** `feat(combat): initiative strip and next turn`.

---

### Task 8: Quick-add (FA-9)

**Files:**
- Create: `src/features/combat/AddEnemySheet.tsx`
- Delete: `src/features/combat/AddEnemyForm.tsx` and its test (port its cases: ×N copies, separate rolls is dropped with initiative numbers, hidden toggle, retry on failure)
- Modify: `src/features/combat/GmCombatScreen.tsx`, `src/features/combat/EnemyCard.tsx`
- Test: `__tests__/features/combat/AddEnemySheet.test.tsx`

**Interfaces:**
- Consumes: `useAddEnemies`, `useAddEncounterEnemies`, search results from Task 9 (`SearchResult` type, optional).
- Produces: `AddEnemySheet({ campaignId: string; combatId: string; open: boolean; onOpenChange: (o: boolean) => void })` with three paths: **Copy** (lists current enemies; picking one calls `addEnemies` with that row's name stem, `maxHp`, defense, attacks, xp, count 1, `initiative: null`), **Encounter** (pick a saved encounter, calls `addEncounterEnemies`), **Blank** (name required, max HP required, everything else optional, `count` 1..20). The card's **+1** (Task 6 `onCopy`) uses the same copy path directly.

- [ ] **Step 1: Write failing tests:** blank with name "Bandit" and max HP 11 calls `addEnemies(combatId, expect.objectContaining({ name:'Bandit', maxHp:11, count:1, initiative:null }))`; blank without a name or HP keeps the submit disabled; copy from "Goblin Boss" sends its stats with `count: 1`; **+1** on a card adds one at full health; the sheet stays open and resets after a successful add; a failed add shows a toast and keeps the entered values.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat/AddEnemySheet.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement** the sheet using `Sheet`, `Input`, `Button`, `ToggleChip` (Hidden) as the old form did.
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__/features/combat && npm run lint:dead`; expected PASS.
- [ ] **Step 5: Commit** `feat(combat): quick-add enemy sheet`.

---

### Task 9: Cmd/Ctrl+K search (FA-10)

**Files:**
- Create: `src/lib/useHotkey.ts`, `src/features/search/search.ts`, `src/features/search/useSearchIndex.ts`, `src/features/search/SearchPanel.tsx`
- Modify: `src/features/combat/GmCombatScreen.tsx`
- Test: `__tests__/lib/useHotkey.test.ts`, `__tests__/features/search/search.test.ts`, `__tests__/features/search/SearchPanel.test.tsx`

**Interfaces:**
- Produces:
  - `useHotkey(combo: 'mod+k', handler: () => void, enabled: boolean): void` (web only: `Platform.OS === 'web'`, `keydown` on `document`; `mod` is Meta on Mac and Control elsewhere; calls `preventDefault`; a no-op on native)
  - `export type SearchResult = { id: string; kind: string; name: string; summary: string | null; group: 'SRD' | 'Encounters' }`
  - `searchIndex(items: SearchResult[], query: string, limit?: number): SearchResult[]` (case-insensitive prefix matches rank above substring matches; empty query returns `[]`)
  - `useSearchIndex(systemId: string, campaignId: string, isGm: boolean): { items: SearchResult[]; ready: boolean }` (loads `name`, `kind`, `description` for kinds `spell, magic_item, item, feat, class, species, background, subclass` via `listContent` once per system plus the campaign's encounters; a long `staleTime`, persisted in Task 11)
  - `SearchPanel({ open: boolean; onClose: () => void; items: SearchResult[]; onPick?: (r: SearchResult) => void })`: side panel beside the cards; results grouped by kind; `Escape` closes; focus returns to where it was.

- [ ] **Step 1: Write failing tests:** `useHotkey`: Control+K fires the handler on web; Meta+K fires on web; plain `k` does not; unmounting removes the listener; `enabled=false` does not fire. `search.test.ts`: "fire" ranks "Fireball" above "Wildfire"; empty query returns `[]`; limit is respected. `SearchPanel.test.tsx`: opening shows results grouped by kind; `Escape` calls `onClose`; picking a result shows its summary in the panel while the cards remain rendered.
- [ ] **Step 2: Run** `npx jest __tests__/lib __tests__/features/search`; expected FAIL.
- [ ] **Step 3: Implement** all four units; mount in `GmCombatScreen` (button in the header and the hotkey while the screen is mounted). On a width under 700 the panel overlays the cards (`columnsFor` from Task 6).
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__ && npm run lint:tokens && npm run lint:dead`; expected PASS.
- [ ] **Step 5: Commit** `feat(search): Cmd/Ctrl+K search panel for the GM`.

---

### Task 10: End combat summary (FA-12)

**Files:**
- Create: `src/features/combat/EndCombatSummary.tsx`
- Modify: `src/features/combat/GmCombatScreen.tsx`, `src/features/sessions/CombatBadge.tsx` (reuse its existing End combat dialog; add the summary props)
- Test: `__tests__/features/combat/EndCombatSummary.test.tsx`

**Interfaces:**
- Produces: `EndCombatSummary({ round: number; xp: number | null; onClose: () => void })` ("Rounds fought: N", "XP earned: N" only when `xp` is non-null; no XP is credited to characters). When every enemy is down, `GmCombatScreen` shows a non-blocking "All enemies down. End combat?" prompt that never ends combat by itself.

- [ ] **Step 1: Write failing tests:** summary shows the round and XP; XP line absent when null; the all-down prompt appears with every enemy at 0 HP and does **not** call `setCombat`; ending calls the existing `setCombat(sessionId, false)` once.
- [ ] **Step 2: Run** `npx jest __tests__/features/combat/EndCombatSummary.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement.** Capture round and XP **before** calling end (entries are deleted by `combat_end_for_session`).
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__/features`; expected PASS.
- [ ] **Step 5: Commit** `feat(combat): end-of-combat summary`.

---

### Task 11: Offline-tolerant cards and sync on return (FA-11)

**Files:**
- Create: `src/lib/offline.ts`, `src/features/combat/offlineMutations.ts`, `src/features/combat/OfflineBadge.tsx`, `src/features/combat/hpLocal.ts`, `src/features/combat/turnLocal.ts`
- Modify: `src/lib/query-client.ts`, `app/_layout.tsx`, `src/features/combat/combat.queries.ts`, `src/features/combat/useEnemyHp.ts`, `src/features/auth/` (the sign-out path), `package.json` (add `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister`)
- Test: `__tests__/features/combat/hpLocal.test.ts`, `__tests__/features/combat/turnLocal.test.ts`, `__tests__/lib/offline.test.ts`, `__tests__/features/combat/offlineMutations.test.tsx`

**Interfaces:**
- Produces:
  - `applyHpLocal(entries: CombatEntry[], ids: string[], mode: HpMode, amount: number): CombatEntry[]` (same arithmetic as `apply_enemy_hp`: damage takes temp first then floors at 0, heal caps at max, temp keeps the larger value; reuse `adjustPool`/`setTemp` from `@/systems/resources`)
  - `nextEntryLocal(order: { id: string; kind: 'player' | 'enemy'; hp: number | null }[], currentId: string): { id: string; wrapped: boolean }` (mirrors the SQL skip rule from Task 3, including the all-downed fallback)
  - `registerCombatMutationDefaults(client: QueryClient): void` (sets `setMutationDefaults` for keys `combat/applyHp`, `combat/nextTurn`, `combat/updateEnemy`, `combat/setCurrent`, `combat/move`, so paused mutations resume after a reload, with optimistic `setQueryData` on `qk.combatEntries` and `qk.combat`)
  - `installOffline(client: QueryClient): { dispose: () => void }` (persists only keys starting `combat`, `combatOrder`, `combatEntries`, `encounters`, `search` to AsyncStorage under a per-user key; resumes paused mutations when online returns; `onlineManager` on web uses `online`/`offline` events)
  - `clearPersistedCombat(): Promise<void>` (called on sign-out)
  - `OfflineBadge()` ("Offline: changes will sync"), shown when `onlineManager.isOnline()` is false
  - `diffPlayerHp(before: CharacterFull[], after: CharacterFull[]): string[]` (names whose current HP changed) used for the reconnect toast "<names> changed while you were offline"
- Set `networkMode: 'offlineFirst'` for the combat mutations only (queries keep the default).

- [ ] **Step 1: Write failing tests.** `hpLocal.test.ts` (same cases as the server tests): 22/30 minus 7 is 15/30; 20 gives 0/30; with 5 temp and 12 HP, 7 damage leaves 0 temp and 10 HP; heal never raises temp. `turnLocal.test.ts`: skips a downed enemy but not a downed player; all-other-downed returns the next position; wrap sets `wrapped`. `offlineMutations.test.tsx`: with `onlineManager.setOnline(false)`, applying 7 damage updates the cached entries immediately and calls no RPC; going online calls `applyEnemyHp` **once** with the same batch id; two queued `nextTurn` calls with stale `expectedEntryId` replay without error; a failed replay rolls the cache back via invalidate and shows a toast. `offline.test.ts`: `clearPersistedCombat` removes the persisted entries; persisted data contains no keys outside the allow-list; `diffPlayerHp` returns only changed names.
- [ ] **Step 2: Run** `npx jest __tests__/lib __tests__/features/combat`; expected FAIL.
- [ ] **Step 3: Implement** the units; call `installOffline(queryClient)` once from `app/_layout.tsx`; call `clearPersistedCombat()` on sign-out. After resume, refetch the three combat keys and the party cache and toast `diffPlayerHp` if non-empty.
- [ ] **Step 4: Run** `npm run typecheck && npx jest __tests__ && npm run lint:dead`; expected PASS (the new packages are imported, so knip passes).
- [ ] **Step 5: Manual web check** (`npm run web`, DevTools Network offline): cards stay visible, damage and Next turn apply locally, "Offline" shows; going online syncs and a second device sees the changes within about 2 seconds; reload while offline shows the last cards.
- [ ] **Step 6: Commit** `feat(combat): offline-tolerant enemy cards with queued sync`.

---

### Task 12: Whole-flow verification

**Files:** none (verification only).

- [ ] **Step 1:** `npm run typecheck && npm test -- --ci && npm run lint:dead`; expected: all pass.
- [ ] **Step 2:** `supabase test db`; expected: every pgTAP file passes, including `privacy_combat` and `privacy_combat_silence`.
- [ ] **Step 3:** Run `node scripts/verify-combat-realtime.mjs` (the existing manual leak check) and confirm a player device receives no enemy fields, no encounter rows and no story notes.
- [ ] **Step 4: Manual walkthrough on web** (GM laptop plus two player phones): launch an encounter from the list, read the story panel, drag the order, hide one enemy, Enter combat; damage and heal on cards; downed enemy collapses and XP total rises; Next turn skips it; tap it to stop on it; quick-add all three ways; Cmd/Ctrl+K search; end combat summary; players see names only and the "Your turn" banner as before.
- [ ] **Step 5:** Fix anything found; commit as `fix(combat): <issue>` per fix.
