# Battle Order with Enemies (PRD Phase 2): Index, Decisions and Execution

> **For agentic workers:** this is the index and the decision record. The tasks are in two plans, built in this order, each ending in a state that passes its tests:
> 1. `2026-11-03-battle-order-and-enemies-2a-server-and-data.md` (database, privacy tests, API, queries, Realtime). Additive: nothing in the app changes until 2b mounts it.
> 2. `2026-11-03-battle-order-and-enemies-2b-ui.md` (view models, HP entry, roll call, GM and player battle order, retiring the manual turn picker).
>
> Use superpowers:subagent-driven-development or superpowers:executing-plans per the recommendation at the end. Steps use checkbox (`- [ ]`) syntax.

**Spec:** `docs/superpowers/specs/2026-11-03-party-and-combat-design.md` (Phase 2, cross-phase requirements, "Calls made", open questions), amended by Task 1 of 2a with the owner's accepted amendments A0, A1, A2 from `2026-11-03-combat-tools-amendments.md` (kept in the `reddit-pain-points-plan` worktree; the content that matters is restated in 2a Task 1).

**Scope check (why two plans):** server and data (about 9 tasks, privacy-critical, shippable on its own, reviewable by reading SQL and pgTAP) and UI (about 9 tasks, reviewable by reading components and RNTL tests) are separable at the API boundary. 2a lands first and is reviewed as its own PR; 2b is built against it.

## Scope decided by the owner

**In:** A0 (principle reworded "a scoreboard with a calculator, not a referee"; PRD text updated), A1 (Damage / Heal / Temp HP entry with undo, clamped 0..max, temp HP absorbs first, typed correction, same entry on a player's own row in combat), A2 (bulk damage/heal to selected enemies, `Select group` for ×N groups).
**Out (not planned, not stubbed):** A3 condition timers, A4 monster library, A5 stored-modifier tie-breaks (default stays: GM drags to break ties), A6 rules lookup, A7 offline status. Phase 3 (encounter prep) and Phase 4 are separate plans; the enemy record stays a plain record so they can pre-fill it.

## Decisions

Each is settled here so no task has to reopen it.

**D1. Data model: one truth table the players can never read, one projection they can.**
- `combats` (readable by active members, GM included): one row per fight. `status` `rolling | active | ended`, `round`, `turn_entry_id`, `gm_turn`, `rev`. Holds no enemy data.
- `combat_entries` (readable by the campaign's GM only): the truth. One row per party member (`kind = 'player'`, with `user_id`, `character_id`) and per enemy (`kind = 'enemy'`, with `name`, `max_hp`, `hp`, `temp_hp`, `ac`, `notes`, `hidden`, `group_id`). Shared: `initiative`, `position`, `is_current`.
- `combat_order` (readable by active members): the projection of the entries a player may see, rebuilt by the server on every change: `id` (same as the entry id), `kind`, `user_id`/`character_id` (players), `name` (enemies only), `initiative`, `position`. No hit points, AC, notes or flag ever appears in it, and a hidden enemy has no row.
- All writes go through security-definer RPCs; no insert/update/delete policy exists on any of the three tables. Player names and hit points are not stored in the order: the UI joins `character_id` to the Phase 1 party cache (live, already RLS-protected).

**D2. How players get a Realtime-safe order.**
- `combat_entries` is never added to the Realtime publication. `combats` is, and `sessions` already is.
- Realtime is used as a **signal, not a data feed**: clients subscribe to `UPDATE`/`INSERT` on `combats` and `sessions` filtered by `campaign_id` and, on any event, refetch through the normal RLS-protected queries (`combats`, `combat_order`; the GM also `combat_entries`). Payloads therefore never matter for privacy, and a missed event is repaired by the refetch on reconnect (same recovery as Phase 1).
- Realtime `DELETE` events cannot be filtered or RLS-checked, so nothing relies on them: ending a combat is an `UPDATE` to `status = 'ended'`, and `combat_order` rows are deleted only inside the same transaction that bumps `combats.rev`.
- `combats.rev` is bumped only when what a player can see actually changes (their order rows, the turn pointer, status or round). Enemy hit-point and notes changes never touch the `combats` row, so a player's device gets no event, and no timing hint, when the GM edits a hidden enemy.

**D3. "GM's turn" projection.** The truth pointer is `combat_entries.is_current` (one true per combat, GM-only). The server projects it to `combats.turn_entry_id` (set only when the holder is a player or a visible enemy) and `combats.gm_turn` (true only when the holder is a hidden enemy). The player UI draws a generic `GM's turn` row **pinned above the order, not inside it**, with no name, initiative or hit points, so a hidden enemy never has a position in anything a player receives. Revealing an enemy inserts it into the projection at its place (and moves the pointer projection from `gm_turn` to its row if it holds the turn); hiding does the reverse.

**D4. Order rules.** Highest initiative first. A new or changed initiative is placed after every row whose initiative is higher or equal and before the first row that is lower or empty, scanning the current order, so manual drag tie-breaks and manual reorders are respected. Rows without a number sit last. While `status = 'rolling'` the whole order is re-sorted on every number (highest first, stable by current position). `Start combat` locks it. The tie default is: the GM drags (open question closed, A5 stays out).

**D5. Turn model.** The turn lives on `combat_entries.is_current`; `sessions.current_turn_user_id` is retired in 2b (migration drops it, with `set_turn` and the old `end_turn`). In 2a the new RPCs sit beside the old ones (additive); the new player RPC is `end_my_turn` so the old `end_turn` keeps working until 2b swaps the UI.
- `start_combat`: GM only, `rolling -> active`, current = position 1, round 1.
- `next_turn(combat, expected_entry_id)`: GM only; moves to the next position; past the last position it wraps to the first and `round + 1`. **Stale taps are no-ops**: if `expected_entry_id` is not the current entry (a player's End Turn already moved it) the call returns the unchanged state and the client refetches.
- `end_my_turn`: a player passes the turn from their own current row to the next row (same wrap rule); anyone else gets `not_your_turn`.
- `set_current_entry` (GM): make any row current (skip, go back). `delay_turn` (GM): the current row swaps with the next and the next becomes current. `move_entry` (GM): reorder.
- The current pointer never jumps when rows are added, re-sorted or moved; it stays on the same entry. Removing the current entry advances first.

**D6. Round counter: included.** `combats.round`, shown as `Round n` in the header. It only changes on a wrap. No timers use it (A3 is out).

**D7. Hit points.**
- **Enemies:** the arithmetic lives only in SQL (`apply_enemy_hp(combat, entry_ids, mode, amount)`, modes `damage | heal | temp`), as a delta applied under a row lock, so two GM phones composing damage never overwrite each other. Rules: damage uses temp HP first; heal never raises temp HP; temp HP keeps the larger of old and new (matches `setTemp`); hit points clamp to `0..max_hp`; amount must be a positive integer. A typed exact correction goes through `update_enemy`. The client never computes enemy hit points, it renders what the server returns.
- **Players:** a player edits only their own `characters.resources` through the existing `useResourceMutation`, using the existing pure `adjustPool` and `setTemp` (`src/systems/resources.ts`), so the Character tab's `HpSheet` and the combat row agree. The GM never writes a character (no RPC or policy path exists).
- **Label:** new UI says `Temp HP` (the owner's wording); the existing `HpSheet` says `Bonus HP`. One constant `TEMP_HP_LABEL` in `src/features/combat/copy.ts` is used by new UI so the owner can flip both with one edit; `HpSheet` is not changed in this plan. (Call to confirm with the owner.)

**D8. Undo.** Every enemy hit-point change gets a batch id (returned by `apply_enemy_hp`); each affected row keeps `prev_hp`, `prev_temp`, `last_batch`. `undo_enemy_hp(combat, batch)` restores only rows whose `last_batch` is still that batch, so a stale undo (someone changed the row since) is a no-op and a fireball on four goblins undoes as one. Only the last change per row is kept (the amendments' proposed default). A player's own undo is client-side: it restores the previous pool only if the current pool still equals what the change produced, otherwise it does nothing and says `HP changed since`.

**D9. Concurrency, in one place.** Every RPC locks the `combats` row (`for update`). GM `Next turn` and player `End Turn` at the same moment resolve to one advance (D5). Enemy damage is delta-based (D7). Undo is batch-guarded (D8). A player's HP write is last-write-wins on their own row, as on the Character tab today. Two people tapping `Enter combat` get one combat (partial unique index, as sessions do).

**D10. Roll call.** Anyone can `Enter combat` (existing `set_combat(true)`), which now also creates the `combats` row in `rolling` with one entry per active member who has a character. In `rolling` the projection is empty: players see only `Combat is starting`; the GM sees the roll-call screen (number-pad rows in order, enter moves to the next row, re-sort live, add enemies without leaving, `Start combat`). Members who join or leave mid-fight are synced in (joiners with no number sit last) or out (a departing holder passes the turn on first).

**D11. Enemies.** Typed in: `name`, `max_hp` (>= 1), `initiative`, optional `ac`, `notes`, `hidden`. `×N` (cap 20) creates "Goblin 1..N", numbering after the highest existing "Goblin k" in that combat so reinforcements never collide; copies share one `group_id` and one initiative by default; "separate rolls" creates them with no number and the GM fills each in. Enemy rows are removable; players' rows are not.

**D12. When combat or the session ends.** `set_combat(false)` and `end_session` set `combats.status = 'ended'`, clear the turn projection, and delete that combat's entries and order rows in the same transaction (enemies are discarded; resuming is out of scope). `sessions.in_combat` stays the flag the badges read; it and the live combat row are kept in step by the same RPCs. Clients that were mid-edit get `no_active_combat`, show the usual toast and fall back to the party page.

**D13. What changes in what exists (exactly).**
- Phase 1: `PartyList` is wrapped by a new `PartyPage` container that renders `PartyList` outside combat, the roll-call/`Combat is starting` states while rolling, and the battle order while active. `PartyCard` is unchanged and reused (compact rows are new components, `PartyCard` is not forked). `usePartyRealtime` is refactored onto a shared `useRealtimeChannel` (existing tests unchanged and must stay green); `PartyList`'s `Reconnecting…` marker is shared.
- Mounts: `app/(app)/campaigns/[id].tsx` and `app/(app)/characters/[id]/campaign.tsx` render `PartyPage` where they render `PartyList`; the campaign screen loses `TurnControls`.
- Sessions: `TurnBanner` reads the combat state (`turn_entry_id` is the viewer's own row) instead of `session.current_turn_user_id`; `End Turn` calls `end_my_turn`. `TurnControls`, `eligibleTurnMembers`, `holdsTurn`, `setTurn`, `useSetTurn`, the old `end_turn`/`set_turn` RPCs and the `current_turn_user_id` column (with its constraint, index, and the leave-trigger update) are removed in 2b's last code task. `set_combat` and `end_session` are replaced to also create/end the combat. `CombatBadge`, `SessionBadge`, `CampaignSessionStatus` are unchanged.
- Session polling: `SESSION_POLL_MS` drops from 10 s to a 60 s safety net because Realtime now invalidates it.
- PRD: principle 1, one non-goal, and the Phase 2 requirements updated (2a Task 1).

## Global Constraints (apply to every task in 2a and 2b)

- **Privacy is server-enforced.** A player, an invited member and an outsider must not be able to read a hidden enemy, any enemy's hit points, armor class or notes, or learn a hidden enemy's position, by direct query, any RPC return value, any error message, or Realtime. Each new table/function ships with pgTAP proving it.
- **Players own their numbers.** No RPC or policy lets the GM (or anyone else) write another character's hit points or conditions. The GM edits enemies only.
- **Dice stay physical.** No roller. The app does arithmetic and sorting, never a rule: no hit/miss, saves, resistance or target choice.
- Design system: tokens only (`npm run lint:tokens`), no `rounded-full`, red only for destructive/error (so `Damage` uses the existing `destructive` button as `HpSheet` does, nothing else red), 44pt touch targets, hit points as text as well as a bar, the current turn not conveyed by colour alone (a `▶`-style marker and the word `Current`/`Your turn` in the accessibility label), the turn change announced to screen readers, a `Down` text state at 0 hit points.
- Copy: `GM's turn`, `Combat is starting`, `Roll initiative`, `Start combat`, `Next turn`, `Round n`, `Temp HP` (via `TEMP_HP_LABEL`), `Down`.
- Fast at the table: `Damage` is one number plus one tap; roll-call entry is number-pad with the cursor advancing on enter.
- Tests first with exact paths: pgTAP under `supabase/tests/`, jest-expo + RNTL under `__tests__/`. Run each pgTAP file against the **local** Supabase stack inside its own rolled-back transaction (`psql "$LOCAL_DB_URL" -f supabase/tests/<file>`, `LOCAL_DB_URL` from `npx supabase status`), after `npx supabase migration up --local`; never reset or push to a shared database.
- `npm test` equivalent passes at the end of every task. In a `.claude/worktrees` checkout run jest through a CLI override of the ignore lists (the config ignores that path), with a longer timeout when loaded; `npm run lint:tokens` fails on `main` at `app/(app)/characters/index.tsx:33` (`pr-10`) at the time of Phase 1: use the tolerant wrapper if it is still failing, or drop it if fixed.
- Migrations use the `20261104…` range after `20261103000001`; before writing one, `ls supabase/migrations` and renumber if another branch (e.g. the invite-code work) has taken a later stamp.
- Do not push, open a PR, or apply migrations to a shared/hosted database without the owner's confirmation.

## Review Focus (whole phase)

1. A player or invited member obtains a hidden enemy's identity, position, or any enemy's hit points/AC/notes by any route: direct select, RPC return value or error, or a Realtime payload or its timing. (2a Tasks 2, 3, 7; 2b Task 1)
2. Two phones act at once: GM `Next turn` with a player's `End Turn`; a double-tapped `Damage`; an `Undo` after someone else changed the row. Expected: one advance, one application, no undo of newer work. (2a Tasks 5, 6; 2b Task 2)
3. Combat or the session ends while a screen is mid-edit (HP sheet open, roll call open, mutation in flight). Expected: back to the party page, a plain toast, no crash, no stale highlight. (2a Task 4; 2b Tasks 4, 6, 7)
4. Turn edge cases: removing the current enemy, the holder leaving the campaign, a one-row combat (every `Next turn` is a new round), an empty order, adding or reordering rows while someone holds the turn (pointer must not jump). (2a Tasks 4, 5, 6)
5. Odd input: blank or 0 damage, damage above the max or above remaining HP, decimals/negatives/pasted text in number fields, `×0`/`×100`, a 60-character or blank name, enemy with 0 max HP, duplicate names, 8 party members plus 12 enemies in one list. (2a Task 6; 2b Tasks 2, 3, 5)

## Self-Review (index level)

- **PRD coverage:** anyone starts combat into rolling (D10, 2a T4, 2b T4/T7); hidden enemies and "GM's turn" (D1-D3, 2a T2/T3/T7); roll call (D10, 2b T4); typed-in enemies, ×N, shared roll (D11, 2a T6, 2b T3); enemy rows with notes, hidden toggle, remove (2a T6, 2b T5); players see names only (D1, 2b T1/T6); turn control, End Turn passes on, banner (D5, 2a T5, 2b T6); never blocks (reorder, skip, delay, add/remove mid-fight: 2a T5/T6, 2b T5); player nudges own HP (D7, 2b T2/T6); manual picker retired (D13, 2b T8); round counter (D6); A0/A1/A2 (2a T1, T6; 2b T2, T5); end of combat/session (D12, 2a T4); accessibility and design system (Global Constraints, 2b T6/T7).
- **Open questions closed:** tie-break (GM drags), round counter (in), skip of absent/downed (GM's choice, via `set_current_entry`/`Next turn`), hit-point numbers for teammates (numbers and bar, as Phase 1 cards). Left open for the owner: `Temp HP` vs `Bonus HP` wording (D7); a GM who also has a character (unchanged, out of scope).
- **Names** (`combats`, `combat_entries`, `combat_order`, `refresh_combat`, `lock_combat`, `start_combat`, `next_turn`, `end_my_turn`, `set_current_entry`, `delay_turn`, `move_entry`, `set_initiative`, `add_enemies`, `update_enemy`, `remove_entry`, `apply_enemy_hp`, `undo_enemy_hp`, `useCombatRealtime`, `useRealtimeChannel`, `PartyPage`, `HpEntryBar`, `TEMP_HP_LABEL`) are defined in 2a and consumed verbatim in 2b.

## Execution recommendation

**Native, with a task ledger, in two PRs, and an independent Opus review of 2a before 2b starts.** The tasks lean heavily on each other's exact signatures (the RPC set feeds the API layer, which feeds every component), which is where a fresh subagent per task loses the thread; native keeps one context holding the data model. But 2a is where a mistake ships a spoiler leak, so the fresh read is spent there: after 2a Task 9, one reviewer on the most capable model reads the migrations and the pgTAP files against Review Focus 1 before 2b begins. 2b then runs native and gets the usual whole-branch Opus review at the end. Subagent-driven for everything would cost roughly 18 task contexts and 18 reviews for work that is mostly mechanical once the interfaces are fixed.
