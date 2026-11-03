# Battle Order with Enemies, Part 2a: Server and Data (PRD Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task (the index recommends native, see below). Steps use checkbox (`- [ ]`) syntax for tracking. Read the index first: `2026-11-03-battle-order-and-enemies.md` (decisions D1-D13 are referenced by number).

**Goal:** The database, API and live-update layer for combat with a server-enforced split between what the GM can see (enemy hit points, AC, notes, hidden enemies) and what players can see (a name-and-order projection).

**Architecture:** Three tables: `combats` and `combat_order` (members read) and `combat_entries` (GM reads, the truth). Security-definer RPCs are the only writers and call one internal `refresh_combat` that syncs party entries, rebuilds the player-safe projection and bumps `combats.rev` only when something a player can see changed. Clients use Realtime on `combats`/`sessions` as a refetch signal (never as data), so the privacy boundary is the RLS select policy alone. Everything here is additive: the old turn picker keeps working until 2b.

**Tech Stack:** Postgres/RLS/plpgsql, pgTAP, Supabase Realtime, supabase-js, React Query, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-03-party-and-combat-design.md` (Phase 2 and cross-phase requirements), plus the index's decisions.

## Global Constraints

- Privacy is server-enforced: no non-GM can read `combat_entries`, a hidden enemy, or any enemy hit points/AC/notes by query, RPC return, error text or Realtime. `combat_entries` and `combat_order` are never in the Realtime publication.
- The GM never writes a character; no RPC here touches `characters`.
- Writes only through RPCs; errors raised with SQLSTATE `P0001` and stable messages (existing: `not_authenticated`, `not_member`, `not_allowed`, `not_your_turn`, `no_active_session`; new: `no_active_combat`, `not_rolling`, `not_active`, `invalid_target`, `invalid_amount`, `invalid_mode`, `invalid_initiative`, `invalid_position`, `invalid_enemy`, `invalid_patch`). The error for a hidden/unknown/other-campaign entry id must be the same message for a non-GM, so ids cannot be probed.
- Internal helpers (`refresh_combat` and friends) are not executable by `authenticated`; check with `has_function_privilege`, never by calling them as that role (a revoked function called through the API role crashed the local Postgres image, see the note in `20261102000002_session_rpcs.sql`).
- Migrations `20261104000001`..`20261104000005`; check for stamp collisions first. pgTAP files each run in a rolled-back transaction against the local stack only.

## Review Focus (2a)

1. A hidden enemy's name, id, position or any enemy number reaches a non-GM through any table, RPC result or error. (Tasks 2, 3, 7)
2. Races: `next_turn` vs `end_my_turn`; repeated damage; undo after a newer change. (Tasks 5, 6)
3. Ending combat/session leaves no entries, order rows or turn pointer, and RPCs on an ended combat fail cleanly. (Task 4)
4. Pointer stability: adding, re-sorting, moving, hiding or removing rows never moves the turn off its holder, except removal of the holder which advances. (Tasks 3, 5, 6)
5. Bad numbers and names are rejected with the stable codes above (amount <= 0, initiative out of -20..99, count 0 or > 20, blank/60+ name, max HP < 1, AC outside 0..40). (Tasks 5, 6)

## File Structure

- Create migrations: `supabase/migrations/20261104000001_combat_tables.sql`, `…000002_combat_projection.sql`, `…000003_combat_lifecycle.sql`, `…000004_combat_turns.sql`, `…000005_combat_enemies.sql`.
- Create pgTAP: `supabase/tests/rls_combat.test.sql`, `combat_projection.test.sql`, `rpc_combat_lifecycle.test.sql`, `rpc_combat_turns.test.sql`, `rpc_combat_enemies.test.sql`, `privacy_combat.test.sql`. Create `scripts/verify-combat-realtime.mjs`.
- Modify `docs/superpowers/specs/2026-11-03-party-and-combat-design.md`, `src/types/database.types.ts` (regenerated), `src/features/errors.ts`, `src/lib/query-client.ts` (`qk.combat`, `qk.combatOrder`, `qk.combatEntries`), `src/features/sessions/sessions.queries.ts` (poll 60 s), `src/features/party/usePartyRealtime.ts` (onto the shared hook).
- Create `src/features/combat/combat.api.ts`, `combat.queries.ts`, `useCombatRealtime.ts`, `src/lib/useRealtimeChannel.ts`; tests under `__tests__/features/combat/` and `__tests__/lib/`.

---

### Task 1: Update the PRD (A0, A1, A2 and the Phase 2 decisions)

**Files:** Modify `docs/superpowers/specs/2026-11-03-party-and-combat-design.md`.

- [ ] **Step 1: Edit the PRD** (docs only):
  - Design principle 1 becomes: `**A scoreboard with a calculator, not a referee.** The app does the arithmetic the table would otherwise do in their heads: subtract damage, add healing, sort the order, count rounds. It never decides a rule: no hit or miss, no saving throws, no resistance or vulnerability, no choosing targets. The GM can reorder, skip, delay and add enemies at any time.`
  - Non-goal "A dice roller, attack/damage automation, saving throws, or any rules engine." becomes "A dice roller, attack automation, saving throws, resistances or any rules engine. (Applying a typed damage or healing amount is arithmetic, not automation, and is in scope.)"
  - Phase 2 requirements: replace "editable hit points (minus/plus)" with the A1 text (Damage / Heal / Temp HP with one number field, temp HP absorbs damage first and healing never raises it, clamped 0..max with a `Down` state at 0, typed exact correction, undo of the last change on the row, number-pad entry that clears after use) and add A2 (select several enemy rows or `Select group` for a ×N group, one amount applied per row, selection clears); replace "A player can nudge their own hit points" with "A player's own row in combat has the same Damage / Heal / Temp HP entry"; change "the builder's call whether to include [a round counter]" to "a round counter, `Round n`, increases each time the turn wraps".
  - Open questions table: close tie-break (GM drags; a stored-modifier rule is not planned), round counter (included), skip of absent/downed (the GM's choice). Add under Phase 4 and later: "Considered and not planned for now: condition timers and reminders, monster-library prefill in Phase 2, stored initiative modifiers, an in-combat rules lookup, an offline save status."
  - "What changes in what is built": say the manual turn picker's database turn column is removed and turn state lives in the battle order.
- [ ] **Step 2: Verify**: `grep -n "calculator" docs/superpowers/specs/2026-11-03-party-and-combat-design.md` shows the principle; `grep -n "minus/plus" …` shows nothing.
- [ ] **Step 3: Commit** `docs: PRD phase 2 decisions (calculator principle, damage entry, bulk damage)`.

### Task 2: Combat tables, RLS and Realtime publication

**Files:** Create `supabase/migrations/20261104000001_combat_tables.sql`; Test `supabase/tests/rls_combat.test.sql`.

**Interfaces:** Produces the three tables (D1), policies, publication, and `lock_combat(p_combat_id uuid) returns public.combats` (locks the combat `for update`; errors in order: `not_authenticated`, `no_active_combat` when missing or `status = 'ended'`, `not_member` unless `is_active_campaign_member(campaign_id)`; granted to `authenticated` and `service_role`, like `lock_active_session`).
- `combats(id, session_id → sessions on delete cascade, campaign_id → campaigns on delete cascade, status check in ('rolling','active','ended') default 'rolling', round int check >= 1 default 1, turn_entry_id uuid null, gm_turn boolean default false, rev int default 0, started_by → profiles on delete set null, created_at, updated_at)`; unique partial index on `session_id where status <> 'ended'`; constraint `not (turn_entry_id is not null and gm_turn)`; `set_updated_at` trigger.
- `combat_entries(id, combat_id → combats cascade, campaign_id, kind check in ('player','enemy'), user_id, character_id, name, max_hp, hp, temp_hp default 0, ac, notes, hidden default false, group_id, initiative, position, is_current default false, last_batch, prev_hp, prev_temp)`. Checks: a player row has `user_id` and `character_id` and none of the enemy columns; an enemy row has `name` of 1..60 non-blank chars, `max_hp >= 1`, `0 <= hp <= max_hp`, `temp_hp >= 0`, `ac` null or 0..40, `notes` null or <= 500 chars. Indexes: `unique (combat_id, position) deferrable initially deferred`; unique partial `(combat_id) where is_current`; unique partial `(combat_id, character_id) where kind = 'player'`.
- `combat_order(id, combat_id → combats cascade, campaign_id, kind, user_id, character_id, name, initiative, position)`; `unique (combat_id, position) deferrable initially deferred`.
- Policies (select only, `to authenticated`): `combats` and `combat_order` using `is_active_campaign_member(campaign_id)`; `combat_entries` using `is_campaign_gm(campaign_id)`. RLS enabled on all three. `alter publication supabase_realtime add table public.combats;` only. Index every foreign key.

- [ ] **Step 1: Write the failing pgTAP test** (style of `rls_sessions.test.sql`; fixtures as superuser: GM, players p1 and p2 with characters, invited member, outsider, a second campaign with its own GM; one active session; one active combat with entries: p1 (player), "Visible Goblin" (hp 7/7, ac 13, notes `secret plan`), "Hidden Ogre" (hidden, hp 59/59), and `combat_order` rows for p1 and the goblin only). Assertions (as `authenticated` with `request.jwt.claims` per user):
  - `combats`: GM and p1 see the row; invited, outsider and the other campaign's GM see 0.
  - `combat_entries`: GM sees 3; p1, p2, invited, outsider, other GM see 0 (so hp, ac, notes, hidden are unreadable).
  - `combat_order`: p1 sees 2 rows and none with the Ogre's id; invited, outsider, other GM see 0.
  - Direct writes: `insert` into each table as p1 and as the GM throws `42501`; `update` and `delete` by the GM and by p1 affect 0 rows on each table.
  - `columns_are('public','combat_order', ['id','combat_id','campaign_id','kind','user_id','character_id','name','initiative','position'])` and `columns_are` for `combats` with its exact column list (a later column added to either table fails this test and must be reviewed for secrets).
  - Publication: `combats` is in `pg_publication_tables` for `supabase_realtime`; `combat_entries` and `combat_order` are not.
  - Constraints: enemy with `max_hp = 0`, blank name, `hp > max_hp`, `ac = 41` rejected; two `is_current` rows in one combat rejected; a player row with a `name` rejected; two live combats for one session rejected while an `ended` one beside a live one is allowed; deleting the session cascades to combats, entries and order.
  - `lock_combat`: invited and outsider get `not_member`; a combat with `status = 'ended'` gets `no_active_combat`; unauthenticated gets `not_authenticated`.
- [ ] **Step 2: Run to verify it fails** (tables missing).
- [ ] **Step 3: Write the migration** per Interfaces.
- [ ] **Step 4: Run to verify it passes**, then every existing pgTAP file (`rls_sessions`, `rpc_sessions` unchanged).
- [ ] **Step 5: Commit** `feat(db): combat tables with gm-only truth and player-safe projection`.

### Task 3: Projection and `refresh_combat`

**Files:** Create `supabase/migrations/20261104000002_combat_projection.sql`; Test `supabase/tests/combat_projection.test.sql`.

**Interfaces:**
- Produces `refresh_combat(p_combat_id uuid) returns void` (internal, not executable by `authenticated`). In one call it: (1) syncs party entries: for every active member of the campaign with a `character_id` there is a `player` entry (missing ones are appended with `initiative` null at the last position); entries whose member is no longer active or has no character are deleted, and if a deleted entry was current the turn first moves to the next row by the wrap rule (D5) incrementing `round` on a wrap, and to none when no entries remain; (2) if `status = 'active'`, rebuilds `combat_order` from the entries with `hidden = false`, `position` dense `1..n` among them, by upserting changed rows and deleting vanished ones; any other status leaves `combat_order` empty; (3) sets `turn_entry_id` (current entry's id when it is a player or a visible enemy, else null) and `gm_turn` (true only when the current entry is a hidden enemy); (4) updates the `combats` row **only if** the order rows, `turn_entry_id` or `gm_turn` actually changed, adding 1 to `rev`; otherwise issues no update at all (no `updated_at` change, so no Realtime event).
- Produces `combat_next_entry(p_combat_id uuid, p_from uuid) returns table (entry_id uuid, wrapped boolean)` (internal): the entry at the next position after `p_from`, wrapping to position 1 with `wrapped = true`; no row when the combat has no entries.

- [ ] **Step 1: Write the failing pgTAP test** (superuser calls the internal functions directly; fixtures as Task 2). Assertions:
  - `rolling`: `combat_order` stays empty and `turn_entry_id` null / `gm_turn` false even with entries and a current flag.
  - `active` with P1 (init 18), Hidden Ogre (15, hidden), Goblin (12), P2 (9) at positions 1..4: order rows are P1, Goblin, P2 at positions 1, 2, 3 (dense), none for the Ogre, and the Ogre's id and name appear in no `combat_order` row nor in the `combats` row (`to_jsonb(...)::text not like`).
  - Turn projection: current = P1 → `turn_entry_id` = P1 id, `gm_turn` false; current = Ogre → `turn_entry_id` null, `gm_turn` true; current = Goblin → its id.
  - Reveal (`hidden = false`) then refresh: order has 4 rows, Ogre at position 2; if it was current, `turn_entry_id` becomes its id and `gm_turn` false. Hide again: row deleted, `gm_turn` true again.
  - Pointer stability: inserting a new entry at position 2 (positions shifted as the RPC would) and refreshing leaves the same entry current.
  - `rev`: refresh with nothing changed leaves `rev` and `updated_at` identical; changing a hidden enemy's `hp`, `notes` and `ac` then refreshing leaves both identical; renaming a visible enemy and refreshing adds exactly 1 to `rev`.
  - Party sync: an active member with a character and no entry gets one appended last with null initiative; a member set to `status = 'invited'` has their entry removed; removing the current player's member advances the turn to the next row, and removing the last-position holder wraps to position 1 and `round` + 1; removing the only entry leaves no current and `turn_entry_id` null.
  - `combat_next_entry`: from the last position returns position 1 with `wrapped`; with one entry returns that entry with `wrapped`; with none returns no row.
  - Privileges: `has_function_privilege('authenticated','public.refresh_combat(uuid)','execute')` is false, same for `combat_next_entry`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the migration** (`security definer`, `set search_path = ''`). Use set-based upsert/delete for the projection and compare before updating `combats`, so unchanged calls write nothing.
- [ ] **Step 4: Run to verify it passes**, plus Task 2's file.
- [ ] **Step 5: Commit** `feat(db): combat projection that never carries hidden enemies`.

### Task 4: Combat lifecycle (enter, start, end) and membership sync

**Files:** Create `supabase/migrations/20261104000003_combat_lifecycle.sql`; Test `supabase/tests/rpc_combat_lifecycle.test.sql`.

**Interfaces:** Replaces `set_combat(p_session_id uuid, p_in_combat boolean) returns public.sessions` and `end_session(p_session_id uuid) returns public.sessions` (same signatures, same existing behaviour and permissions, and in addition: entering creates the combat in `rolling` with `started_by = auth.uid()`, calls `refresh_combat`, and is a no-op when a live combat exists; ending, or ending the session, sets the live combat to `ended`, `turn_entry_id` null, `gm_turn` false, `round` unchanged, and deletes its entries and order rows in the same transaction; the old `current_turn_user_id` handling stays untouched). Produces `start_combat(p_combat_id uuid) returns public.combats` (GM only, else `not_allowed`; status must be `rolling`, else `not_rolling`; sets `active`, `round` 1, makes position 1 current, refreshes). Replaces the body of `sessions_clear_turn_on_leave()` to keep its current behaviour and also call `refresh_combat` for the campaign's live combat on member delete/detach/deactivate, and adds an `after insert or update` trigger on `campaign_members` that refreshes the live combat when a member becomes active with a character.

- [ ] **Step 1: Write the failing pgTAP test.** Assertions:
  - A player entering combat creates one `rolling` combat with `started_by` = that player and one `player` entry per active member with a character (the GM, the invited member and a character-less member get none), all with null initiative; a second call by another player returns the same combat (still one live row); `sessions.in_combat` is true.
  - Invited and outsider get `not_member` on `set_combat`; unauthenticated gets `not_authenticated`.
  - `start_combat`: a player gets `not_allowed`; invited gets `not_member`; the GM on a `rolling` combat sets `active`, `round` 1, and the position-1 entry current with `combat_order` filled; the GM again gets `not_rolling`; an unknown id gets `no_active_combat`.
  - A player who is not the starter, and not the GM, calling `set_combat(false)` still gets `not_allowed`; the GM or the starter ending sets the combat `ended` and leaves 0 `combat_entries`, 0 `combat_order` rows for it, `turn_entry_id` null, `gm_turn` false, `sessions.in_combat` false.
  - `end_session` by the GM ends the combat the same way; `lock_combat`-based RPCs on that combat then raise `no_active_combat`.
  - Entering combat again after it ended creates a new combat with a new id; the old row stays `ended`.
  - Leaving mid-combat: deleting the holder's `campaign_members` row removes their entry and passes the turn to the next row; deleting the last-position holder wraps and adds a round; a character attached later (`character_id` set, status active) appends an entry with null initiative and refreshes the projection.
  - Regression: `rpc_sessions.test.sql` and `rls_sessions.test.sql` pass unchanged.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the migration** with `create or replace` on the three functions and the new trigger; keep all grants/revokes in the style of `20261102000002_session_rpcs.sql` (revoke from `public, anon`, grant to `authenticated, service_role`).
- [ ] **Step 4: Run to verify it passes**, including the unchanged session test files.
- [ ] **Step 5: Commit** `feat(db): combat lifecycle, roll-call state and party sync`.

### Task 5: Order and turn RPCs

**Files:** Create `supabase/migrations/20261104000004_combat_turns.sql`; Test `supabase/tests/rpc_combat_turns.test.sql`.

**Interfaces:** Produces (all `security definer`, call `lock_combat`, return `public.combats`, refresh before returning; GM-only ones raise `not_allowed` for non-GMs):
- `set_initiative(p_entry_id uuid, p_initiative int)` GM; `-20..99` else `invalid_initiative`; null clears. In `rolling` the whole order is re-sorted (D4); in `active` only this entry is re-placed by the insertion rule and the current pointer stays on the same entry.
- `move_entry(p_entry_id uuid, p_to_position int)` GM; `1..n` else `invalid_position`; positions stay dense and unique; current unchanged.
- `next_turn(p_combat_id uuid, p_expected_entry_id uuid)` GM; requires `active` (else `not_active`); if `p_expected_entry_id` is not the current entry, returns the combat unchanged (no error, no write); otherwise advances via `combat_next_entry`, adding 1 to `round` on a wrap.
- `end_my_turn(p_combat_id uuid)` any active member; the caller's own player entry must be current, else `not_your_turn`; advances like `next_turn`.
- `set_current_entry(p_entry_id uuid)` GM; makes that entry current without changing `round`.
- `delay_turn(p_combat_id uuid, p_expected_entry_id uuid)` GM; the current entry swaps positions with the next and the former next becomes current; stale expected id is a no-op; one entry is a no-op.
- Internal `combat_insert_position(p_combat_id uuid, p_initiative int, p_exclude uuid) returns int` (the D4 rule) and `combat_renumber(p_combat_id uuid)` (dense positions) are not executable by `authenticated`.
- For any entry id that is not in a live combat the caller may act on, a non-GM gets the same `not_allowed` (the GM check runs before the lookup of the entry's combat, using the campaign of the entry, and the message is identical for a real hidden id and a random uuid).

- [ ] **Step 1: Write the failing pgTAP test** (fixtures: GM, p1, p2, invited, outsider; players plus enemy entries inserted as superuser). Assertions:
  - `set_initiative`: a player gets `not_allowed`; `100` and `-21` get `invalid_initiative`; in `rolling` with P1=18, Goblin=15, P2=12 the order is P1, Goblin, P2, a blank row last, and setting two rows to 15 keeps the earlier one first; in `active` setting the current row's number re-places it and the current entry id is unchanged; setting a new enemy to 20 inserts it first without moving the current pointer.
  - `move_entry`: player `not_allowed`; `0` and `n+1` get `invalid_position`; moving position 3 to 1 gives positions exactly `1..n` with no gaps and the old current still current; moving a hidden enemy leaves the projection's visible positions dense.
  - `next_turn`: player `not_allowed`; on `rolling` `not_active`; A→B→C→A with `round` 1,1,1,2; stale `p_expected_entry_id` returns the unchanged combat (same current, same round); one-entry combat increments `round` on every call; zero entries returns the combat unchanged.
  - Race, run in sequence: P1 holds the turn; `end_my_turn` by P1 advances to P2; then the GM's `next_turn` with expected = P1 does nothing, so P2 still holds it.
  - `end_my_turn`: a non-holder player, the GM and a player with no entry get `not_your_turn`; invited gets `not_member`; calling it twice in a row gives `not_your_turn` the second time; from the last position it wraps with `round + 1`.
  - `set_current_entry`: GM can make any entry (including a hidden enemy, giving `gm_turn` true and `turn_entry_id` null) current; a player gets `not_allowed`; an entry of another combat gets `invalid_target` for the GM and `not_allowed` for a player (same text for real and random ids).
  - `delay_turn`: A,B,C with A current becomes B,A,C with B current; stale expected is a no-op; single entry is a no-op.
  - Every RPC on an `ended` combat raises `no_active_combat`; helpers are not executable by `authenticated`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the migration.** Insertion rule (D4): scan entries excluding `p_exclude` in position order; the new position is that of the first entry whose initiative is null or lower than the new value, else last; null initiative goes last; renumber densely after every change (constraints are deferred so a single statement may shift rows).
- [ ] **Step 4: Run to verify it passes**, plus earlier files.
- [ ] **Step 5: Commit** `feat(db): combat order and turn rpcs with stale-tap guards`.

### Task 6: Enemy RPCs, hit points and undo

**Files:** Create `supabase/migrations/20261104000005_combat_enemies.sql`; Test `supabase/tests/rpc_combat_enemies.test.sql`.

**Interfaces:** All GM-only (`not_allowed` otherwise, `not_member` for invited/outsider, `no_active_combat` when ended), `security definer`, lock the combat, refresh before returning:
- `add_enemies(p_combat_id uuid, p_name text, p_count int, p_max_hp int, p_initiative int, p_ac int, p_notes text, p_hidden boolean) returns uuid[]` (new entry ids). `p_count` 1..20, name trimmed 1..60, `p_max_hp >= 1`, `p_ac` null or 0..40, notes null or <= 500, else `invalid_enemy`. Count 1 keeps the name as typed; count > 1 names `"<name> 1".."<name> N"`, numbered after the highest existing `"<name> k"` of that combat; the copies share one new `group_id` and one `p_initiative` (null allowed: separate rolls are then set with `set_initiative`); placement by the D4 rule; `hp = max_hp`. Allowed in `rolling` and `active`.
- `update_enemy(p_entry_id uuid, p_patch jsonb) returns public.combats`; keys `name`, `max_hp`, `hp`, `ac`, `notes`, `hidden`; any other key is `invalid_patch`; a player entry is `invalid_target`; values validated like `add_enemies`; lowering `max_hp` clamps `hp`; `hp` is clamped to `0..max_hp`.
- `remove_entry(p_entry_id uuid) returns public.combats`; enemies only (`invalid_target` for a player entry); removing the current entry first advances the turn by the wrap rule (D5); positions renumbered.
- `apply_enemy_hp(p_combat_id uuid, p_entry_ids uuid[], p_mode text, p_amount int) returns uuid` (the batch id). `p_mode` in `damage|heal|temp` else `invalid_mode`; `p_amount >= 1` else `invalid_amount`; every id must be an enemy entry of this combat else `invalid_target` (nothing applied). `damage`: temp first, remainder from `hp`, floor 0. `heal`: `hp + amount` capped at `max_hp`, temp unchanged. `temp`: `temp_hp = greatest(temp_hp, amount)`. Each touched row records `prev_hp`, `prev_temp`, `last_batch`. It must not update the `combats` row (hit points are not in the projection).
- `undo_enemy_hp(p_combat_id uuid, p_batch uuid) returns int`; restores `hp`/`temp_hp` from `prev_*` for rows whose `last_batch = p_batch`, clears `last_batch`, returns the number restored.

- [ ] **Step 1: Write the failing pgTAP test.** Assertions:
  - `add_enemies`: player `not_allowed`, invited `not_member`; Goblin ×3 at max HP 7, initiative 15 gives names `Goblin 1/2/3`, one shared `group_id`, hp 7/7, initiative 15 each, and in `active` they appear in `combat_order` after higher initiatives; a second Goblin ×2 gives `Goblin 4`, `Goblin 5` and leaves 1-3 untouched; count 1 gives the plain name; null initiative creates rows at the end; hidden creates entries with no `combat_order` row; `p_count` 0 and 21, blank name, 61-character name, `p_max_hp` 0, `p_ac` 41 give `invalid_enemy`; adding while someone holds the turn leaves the current entry unchanged.
  - `apply_enemy_hp` acceptance numbers: 22/30 damage 7 → 15/30; 15/30 damage 20 → 0/30; heal 50 → capped at max; temp 5 and hp 12, damage 7 → temp 0, hp 10; heal does not change temp; `temp` 8 over 5 → 8, `temp` 3 over 8 → 8; bulk: four Goblins at 7/7, amount 5 → all 2/7; a fifth Goblin added afterwards is 7/7 and untouched; `p_amount` 0 and -1 → `invalid_amount`; mode `crit` → `invalid_mode`; a player entry id or another combat's id in the list → `invalid_target` and no row changed; a player caller → `not_allowed`; the call returns a uuid; **`combats.rev` and `updated_at` are identical before and after** damaging both a hidden and a visible enemy.
  - `undo_enemy_hp`: restores hp and temp; a bulk batch restores all four and returns 4; undoing the same batch again returns 0; if one goblin received a newer batch, undoing the older batch restores the other three and returns 3; player caller `not_allowed`.
  - `update_enemy`: renaming a visible enemy changes its `combat_order` name and adds 1 to `rev`; changing only `notes`, `ac` or `hp` leaves `rev` unchanged; unknown key `invalid_patch`; a player entry `invalid_target`; `max_hp` 5 on an enemy at 7/7 clamps hp to 5; `hp` 99 clamps to `max_hp`, `hp` -3 to 0; `hidden` false reveals (order row appears at its place), `hidden` true removes the row, and toggling the current entry flips `turn_entry_id` ↔ `gm_turn`.
  - `remove_entry`: a player entry is `invalid_target`; removing a non-current enemy keeps the current entry and densifies positions; removing the current enemy hands the turn to the next row; removing the current last-position enemy wraps to position 1 with `round + 1`; removing the only entry leaves no current.
  - Enemy at 0 hp stays in the order (no automatic removal) and is not re-sorted.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the migration.** The damage/heal/temp arithmetic is written once in SQL and mirrors `adjustPool` and `setTemp` in `src/systems/resources.ts`; note that in a comment so the two stay in step.
- [ ] **Step 4: Run to verify it passes**, plus earlier files.
- [ ] **Step 5: Commit** `feat(db): enemy rpcs with server-side damage, bulk apply and batch undo`.

### Task 7: Privacy suite and Realtime verification script

**Files:** Test `supabase/tests/privacy_combat.test.sql`; Create `scripts/verify-combat-realtime.mjs`.

- [ ] **Step 1: Write the privacy pgTAP test** as one end-to-end scenario driven only through public RPCs as the real roles. Campaign A: GM, players p1/p2 (with characters), invited member, outsider; campaign B with its own GM and player. The GM builds a fight: a visible `Visible Goblin` (hp 7, ac 13, notes `visible note`), a hidden `Ogre Secretmark` (hp 59, ac 17, notes `has the key`, initiative 15), and puts the turn on the Ogre. Define `secrets` as the Ogre's name, its entry id, `has the key`, `visible note`, the substrings `"hp"`, `"max_hp"`, `"temp_hp"`, `"ac"`, `"notes"`, `"hidden"` and `"group_id"` (as JSON keys). Assertions, for each of p1, p2, invited, outsider and campaign B's GM and player, `to_jsonb` of everything they can select from `combats`, `combat_order`, `combat_entries` and `sessions` concatenated to one string contains none of the secrets (invited/outsider/B see no rows at all; p1/p2 see rows that still contain none):
  - `combat_entries` returns 0 rows for every non-GM; `combat_order` rows have exactly the keys `id, combat_id, campaign_id, kind, user_id, character_id, name, initiative, position`.
  - With the Ogre holding the turn, p1 sees `turn_entry_id` null and `gm_turn` true, and `count(combat_order)` equals the number of visible entries with positions `1..n` and no gap.
  - After `next_turn`, `gm_turn` is false and `turn_entry_id` is a visible row; after revealing the Ogre it appears in the order; after hiding it again its row is gone and `gm_turn` follows the pointer.
  - Enemy edits by the GM (damage to hidden and visible, notes, AC, undo) change neither `combats.rev` nor `combats.updated_at`.
  - Probing: a player calling `update_enemy`, `remove_entry`, `set_current_entry`, `apply_enemy_hp`, `set_initiative`, `move_entry` with the real hidden entry id and with a random uuid gets the **same** error code and text (`not_allowed`); invited and outsider callers get `not_member` from every combat RPC; a player on campaign B calling A's combat RPCs gets `not_member`; no error text contains the Ogre's name or id.
  - GM of campaign B reads 0 rows of A's `combats`, `combat_order`, `combat_entries`.
  - `has_function_privilege('authenticated', …)` is false for `refresh_combat`, `combat_next_entry`, `combat_insert_position`, `combat_renumber`; the publication contains `combats` and not `combat_entries` or `combat_order`.
  - After `set_combat(false)`: 0 entries and 0 order rows remain for that combat for the GM too, and the `combats` row is `ended` with no turn pointer.
  Set `plan(...)` to the exact assertion count.
- [ ] **Step 2: Run it** (it should pass if Tasks 2-6 are right; any failure is a real leak: fix the migration that owns it and note which task, do not weaken the test).
- [ ] **Step 3: Write `scripts/verify-combat-realtime.mjs`** (manual, not part of `npm test`): reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and the emails/passwords of a GM, a player and an invited account of one campaign from the environment; signs each in with supabase-js; the player and the invited account each subscribe, **without filters** (the worst case), to `postgres_changes` `*` on `combats`, `combat_order`, `combat_entries` and `sessions`; the GM runs the Task 7 scenario through the RPCs (open session, enter combat, add a visible and a hidden enemy with a distinctive name, start combat, damage both, reveal, next turn, end); after a short settle the script fails (exit 1) if the invited account received any event, if the player received any `combat_entries` or `combat_order` event, if any event payload the player received contains the hidden name, a `hp`/`ac`/`notes` key or the hidden id, or if no `combats` UPDATE reached the player (proving the signal path works); it prints each check's pass/fail. `node --check scripts/verify-combat-realtime.mjs` must pass now; it is run against a real project in 2b Task 9 with the owner's go-ahead.
- [ ] **Step 4: Commit** `test(db): combat privacy suite and realtime leak check`.

### Task 8: Types, error copy, API and query hooks

**Files:** Modify `src/types/database.types.ts`, `src/features/errors.ts`, `src/lib/query-client.ts`; Create `src/features/combat/combat.api.ts`, `src/features/combat/combat.queries.ts`; Test `__tests__/features/combat/combat.api.test.ts`, `__tests__/features/combat/combat.queries.test.tsx`.

**Interfaces:**
- Produces types `Combat` (row of `combats`), `OrderRow` (row of `combat_order`), `CombatEntry` (row of `combat_entries`).
- `getActiveCombat(campaignId: string): Promise<Combat | null>` (`status <> 'ended'`, `maybeSingle`); `getCombatOrder(combatId: string): Promise<OrderRow[]>` (by `position`); `getCombatEntries(combatId: string): Promise<CombatEntry[]>` (by `position`; GM only by RLS).
- Wrappers over each RPC, each `unwrap`-ed: `startCombat(combatId)`, `setInitiative(entryId, initiative: number | null)`, `moveEntry(entryId, toPosition)`, `nextTurn(combatId, expectedEntryId)`, `endMyTurn(combatId)`, `setCurrentEntry(entryId)`, `delayTurn(combatId, expectedEntryId)`, `addEnemies(combatId, input: NewEnemy): Promise<string[]>` with `NewEnemy = { name: string; count: number; maxHp: number; initiative: number | null; ac: number | null; notes: string | null; hidden: boolean }`, `updateEnemy(entryId, patch: EnemyPatch)` with `EnemyPatch = Partial<{ name: string; max_hp: number; hp: number; ac: number | null; notes: string | null; hidden: boolean }>`, `removeEntry(entryId)`, `applyEnemyHp(combatId, entryIds: string[], mode: 'damage' | 'heal' | 'temp', amount: number): Promise<string>`, `undoEnemyHp(combatId, batch: string): Promise<number>`.
- `qk.combat(campaignId)`, `qk.combatOrder(combatId)`, `qk.combatEntries(combatId)` (all prefixed so `qk.combat(campaignId)` is not a prefix of the other two; the realtime hook invalidates the three explicitly).
- Hooks: `useActiveCombat(campaignId: string | undefined)`; `useCombatOrder(combat: Combat | null | undefined)` (enabled only while `combat.status === 'active'`); `useCombatEntries(combat: Combat | null | undefined, isGm: boolean)` (**enabled only when `isGm`**, so a player's device never issues the query); a mutation hook per wrapper that invalidates the three keys on success and on error (the cure for a stale or ended combat is a refetch), exposing `mutateAsync` for callers that must surface errors after unmounting (the existing pattern in `useSetTurn`).

- [ ] **Step 1: Write failing tests** (supabase mocked as in `sessions.api.test.ts`): each wrapper calls the right `rpc` name with the exact parameter names above and returns its payload; `getActiveCombat` filters on the campaign and `neq('status','ended')` and returns `null` for none; `getCombatOrder` and `getCombatEntries` order by `position`; a `P0001` error maps through `unwrap` to an `AppError` whose message is the plain copy for each new code (add them to `errors.ts` next to the session codes, e.g. `no_active_combat`: "That fight has already ended."); `useCombatEntries(combat, false)` never calls the API; `useCombatOrder` is idle while `status = 'rolling'`; a failing mutation invalidates the three query keys.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Regenerate types** with `npx supabase gen types typescript --local > src/types/database.types.ts` (after `npx supabase migration up --local`); confirm the diff adds only the three tables and the new functions. Generated `Args` cannot express nullable parameters: cast with a comment as `setTurn` does. Implement the api, keys, hooks and error copy.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: combat api and query hooks`.

### Task 9: Realtime signal hook and shared channel hook

**Files:** Create `src/lib/useRealtimeChannel.ts`, `src/features/combat/useCombatRealtime.ts`; Modify `src/features/party/usePartyRealtime.ts`, `src/features/sessions/sessions.queries.ts`; Test `__tests__/lib/useRealtimeChannel.test.tsx`, `__tests__/features/combat/useCombatRealtime.test.tsx`, existing `__tests__/features/party/usePartyRealtime.test.tsx` and `__tests__/features/sessions/sessions.queries.test.tsx` (update the poll constant).

**Interfaces:**
- Produces `useRealtimeChannel(options: { topic: string | null; bind: (channel: RealtimeChannel) => RealtimeChannel; onSubscribed: () => void }): { connected: boolean }`: the channel lifecycle already in `usePartyRealtime` (unique topic per hook instance, `connected` from channel status, rebuild after `CLOSED` with a 2 s delay, `onSubscribed` on every `SUBSCRIBED` including recovery, teardown on unmount or topic change, nothing when `topic` is null).
- `usePartyRealtime(campaign)` keeps its signature and behaviour, now built on it.
- `useCombatRealtime(campaignId: string | undefined, enabled: boolean): { connected: boolean }`: when `enabled` (an active member or the GM), binds `postgres_changes` `UPDATE` on `sessions` and `INSERT`/`UPDATE` on `combats`, each with filter `campaign_id=eq.<campaignId>`, and on any event, and on every (re)subscribe, invalidates `qk.session(campaignId)`, `qk.combat(campaignId)`, and the order and entries keys for the cached combat. It never binds `combat_entries`, `combat_order` or `DELETE`.
- `SESSION_POLL_MS` becomes `60_000` (comment: safety net; Realtime invalidates).

- [ ] **Step 1: Write failing tests** with the fake-channel mock used in `usePartyRealtime.test.tsx`: `useRealtimeChannel` reports `connected` false on `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` and true on `SUBSCRIBED`, calls `onSubscribed` on every `SUBSCRIBED`, rebuilds a new channel after `CLOSED` (advance fake timers 2 s), removes the channel on unmount and when `topic` changes, does nothing for a null topic; `useCombatRealtime` registers exactly three bindings (sessions UPDATE, combats INSERT, combats UPDATE) each with `campaign_id=eq.<id>`; **asserts no binding names `combat_entries`, `combat_order` or `DELETE`**; any event invalidates the four keys; recovery after a drop invalidates; `enabled = false` or no campaign id creates no channel (an invited member never subscribes). Existing party and sessions tests stay green with only the poll constant updated.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the shared hook by moving the lifecycle out of `usePartyRealtime` (do not change its observable behaviour or its tests), then `useCombatRealtime`, then the poll constant.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: realtime signal for combat and shared channel hook`.
- [ ] **Step 6 (gate): Stop here.** Open the 2a review: one reviewer on the most capable model reads migrations 1-5 and the six pgTAP files against Review Focus 1 and the Global Constraints, then 2a is merged (PR only with the owner's go-ahead) before 2b starts.

## Self-Review (2a)

- **Coverage:** D1 tables (T2), D2 signal-not-feed (T2 publication test, T9 binding test), D3 GM's-turn projection (T3, T7), D4 order rule (T5), D5 turn RPCs and stale-tap guard (T5), D6 round (T3, T5), D7 enemy HP (T6), D8 undo (T6), D9 concurrency (T5, T6), D10 lifecycle and sync (T4), D11 enemies (T6), D12 ending (T4), PRD edit (T1), privacy end to end (T7).
- **Names** match the index: `lock_combat`, `refresh_combat`, `combat_next_entry`, `combat_insert_position`, `combat_renumber`, `start_combat`, `set_initiative`, `move_entry`, `next_turn`, `end_my_turn`, `set_current_entry`, `delay_turn`, `add_enemies`, `update_enemy`, `remove_entry`, `apply_enemy_hp`, `undo_enemy_hp`; TS wrappers are the camelCase of each.
- **Known risk:** Realtime delivery depends on the select policies alone (D2); Task 7's script and 2b Task 9 prove it on a real project. A hidden numbered enemy (`Goblin 3` while only 1 and 2 are visible) hints at an extra goblin; the GM can rename it, and this is accepted rather than engineered around.
