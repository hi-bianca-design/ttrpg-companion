# Battle Order with Enemies, Part 2b: UI (PRD Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task (the index recommends native). Steps use checkbox (`- [ ]`) syntax for tracking. Read the index first: `2026-11-03-battle-order-and-enemies.md` (decisions D1-D13). **Prerequisite:** Part 2a is merged (or this branch is built on it): the migrations, `combat.api.ts`, `combat.queries.ts`, `useCombatRealtime` and `useRealtimeChannel` exist.

> **Amended after the Phase 2a privacy review.** There is no `GM's turn` row and no `gm_turn` column any more: while a hidden enemy holds the turn the player-visible pointer simply stays on the last visible holder (index D3, amended). Drop the pinned `GM's turn` row, the `gmTurn` view-model field and its announcement. Also: `applyEnemyHp` takes a client batch id (`newBatchId()` in `combat.api.ts`, reused on retry; the hook generates one if none is given) and `endMyTurn(combatId, expectedRound)` takes the round the screen showed. Players see a ×N group's copies numbered densely (`Goblin 1, Goblin 2`) whatever the hidden count.

**Goal:** The Party page transforms into the battle order during combat: a GM roll-call and running screen with enemies, Damage / Heal / Temp HP entry with undo, bulk damage and turn control; a player screen that shows the same order with enemy names only; the "Your turn" banner and `End Turn` driven by the order; the old turn picker retired.

**Architecture:** A `PartyPage` container (replacing `PartyList` at its two mount points) chooses by combat state: `PartyList` (no combat), roll call or `Combat is starting` (rolling), or the GM/player battle order (active). Pure view-model builders turn server rows plus the Phase 1 party cache into display rows; the player builder has no hit-point fields for enemies at all, so a leak is a type error before it is a test failure. One shared `HpEntryBar` serves enemy rows (GM, via the server RPC), bulk selection (GM) and a player's own row (via the existing resource mutation and `adjustPool`/`setTemp`).

**Tech Stack:** Expo Router, React Query, supabase-js Realtime, NativeWind (Night Vigil tokens), react-native-gesture-handler and reanimated (already installed), jest-expo + RNTL, pgTAP (Task 8 only).

**Spec:** `docs/superpowers/specs/2026-11-03-party-and-combat-design.md` (Phase 2, as amended in 2a Task 1) and the index decisions. Mockups (git-ignored scratch, from the PRD session's `.superpowers/brainstorm/…/content/`): `party-transform.html`, `player-combat-view.html`, `gm-roll-call.html`, `gm-combat-layout.html` (the owner's pick was the "one list in turn order" layout A).

## Global Constraints

- Players own their numbers: no control anywhere lets the GM change a character's hit points, conditions or any stat; a player's own row edits only their own character.
- Enemy hit points, AC, notes, hidden enemies exist in the player UI's data model nowhere (view-model types contain no such fields). A hidden enemy holding the turn is drawn only as a pinned `GM's turn` row.
- Design system: tokens only (`npm run lint:tokens`), no `rounded-full`, red only for destructive/error (`Damage` uses the `destructive` button variant, as `HpSheet` does; `Remove` is destructive; nothing else red), 44pt touch targets, hit points as text as well as a bar, the current turn marked by a symbol and the word `Current` in the accessibility label as well as colour, `Down` as text at 0 hit points.
- Copy: `Combat is starting`, `Roll initiative`, `Start combat`, `Next turn`, `Round n`, `GM's turn`, `Your turn`, `End Turn`, `Damage`, `Heal`, `TEMP_HP_LABEL` (`Temp HP`), `Undo`, `Down`, `Hidden`, `Select group`.
- Turn changes, `GM's turn` and a new round are announced to screen readers (`AccessibilityInfo.announceForAccessibility`; `accessibilityLiveRegion` is Android-only).
- Fast at the table: damage is one number and one tap; roll-call fields are number-pad with enter moving to the next row.
- Mutations that must surface errors after their component unmounts (a refetch can unmount the screen) use `mutateAsync(...).catch(toast)`, the pattern in `TurnBanner` and `CombatBadge`.
- `npm test` equivalent passes at the end of every task (see the index for the worktree and lint-wrapper notes); `npx tsc --noEmit` passes from Task 1 on.
- Do not push, open a PR, or apply migrations to a shared database without the owner's confirmation.

## Review Focus (2b)

1. The player screen can never show an enemy's hit points, AC, notes or a hidden enemy, whatever the data it is handed. (Tasks 1, 6)
2. Two phones: a stale `Next turn` after a player's `End Turn`; a double-tapped `Damage`; `Undo` after another change. The UI refetches and never double-applies. (Tasks 2, 5, 6)
3. Combat or session ends while the HP entry, roll call or a mutation is open: the screen falls back to the party page with a toast, no crash, no stale highlight. (Tasks 4, 7)
4. The GM has no path to edit a player's numbers: player rows in the GM list have no Damage/Heal/Temp HP controls. (Task 5)
5. Bad input in number fields (letters, decimals, 0, huge values, blank) and long or duplicate names; 8 players plus 12 enemies in one list. (Tasks 2, 3, 5)

## File Structure

- Create `src/features/combat/`: `copy.ts`, `battleOrder.ts`, `HpEntryBar.tsx`, `useEnemyHp.ts`, `usePlayerCombatHp.ts`, `AddEnemyForm.tsx`, `RollCall.tsx`, `CombatStarting.tsx`, `EnemyRow.tsx`, `BulkBar.tsx`, `GmBattleOrder.tsx`, `PlayerBattleOrder.tsx`, `PartyPage.tsx`; tests mirror these under `__tests__/features/combat/`.
- Modify `src/features/sessions/TurnBanner.tsx` (reads combat state), `app/(app)/campaigns/[id].tsx`, `app/(app)/characters/[id]/campaign.tsx`, `src/features/sessions/sessions.api.ts`, `sessions.queries.ts`, `src/types/database.types.ts`, and the tests that render them.
- Delete (Task 8) `src/features/sessions/TurnControls.tsx`, `src/features/sessions/turn.ts` and their tests. Create `supabase/migrations/20261104000006_drop_manual_turn.sql`.

---

### Task 1: Battle-order view models (pure)

**Files:** Create `src/features/combat/copy.ts`, `src/features/combat/battleOrder.ts`; Test `__tests__/features/combat/battleOrder.test.ts`.

**Interfaces:**
- Consumes: `Combat`, `OrderRow`, `CombatEntry` (2a Task 8), `CharacterFull` (party cache), `CampaignMember`.
- Produces `export const TEMP_HP_LABEL = 'Temp HP'`.
- Row types: `PlayerRow = { kind: 'player'; id: string; characterId: string; userId: string; name: string; subtitle: string | null; initiative: number | null; hp: { current: number; max: number; temp: number } | null; conditions: string[]; isCurrent: boolean; isMine: boolean }`; `PlayerSideEnemyRow = { kind: 'enemy'; id: string; name: string; initiative: number | null; isCurrent: boolean }` (**no other fields**); `GmEnemyRow = { kind: 'enemy'; id: string; name: string; initiative: number | null; hp: number; maxHp: number; tempHp: number; ac: number | null; notes: string | null; hidden: boolean; groupId: string | null; isDown: boolean; isCurrent: boolean }`.
- `buildPlayerOrder(input: { combat: Combat; order: OrderRow[]; party: CharacterFull[]; userId: string | undefined }): { round: number; gmTurn: boolean; rows: (PlayerRow | PlayerSideEnemyRow)[] }`: rows in `position` order; a player row joins its `character_id` to the party cache (a character missing from the cache gets name `Player` and no hit points, never an error); `isCurrent` is `row.id === combat.turn_entry_id`; `isMine` is `row.user_id === userId`.
- `buildGmOrder(input: { combat: Combat; entries: CombatEntry[]; party: CharacterFull[]; userId: string | undefined }): { round: number; currentId: string | null; rows: (PlayerRow | GmEnemyRow)[] }`: rows in `position` order including hidden enemies; `currentId` is the entry with `is_current`; `isDown` is `hp === 0`.
- `selectGroup(rows: GmEnemyRow[], id: string): string[]`: ids sharing the row's `groupId`, or `[id]` when it has none. `toggleSelected(selected: ReadonlySet<string>, id: string): Set<string>`.
- `reorderTarget(fromIndex: number, offsetY: number, rowHeight: number, count: number): number`: the 1-based position a dragged row lands on, clamped to `1..count`.

- [ ] **Step 1: Write failing tests:** the player builder given an order with a visible Goblin and a combat with `gm_turn` true returns `gmTurn` true and no row with the hidden id; each `PlayerSideEnemyRow` has exactly the keys `kind, id, name, initiative, isCurrent` (`Object.keys` equality, so a future field fails the test); a player row picks up the party character's name, `current/max`, temp and conditions; a missing character becomes `Player`/no hp; `isMine` only for the viewer; `isCurrent` follows `turn_entry_id`; the GM builder keeps hidden enemies, flags `isDown` at 0, exposes `currentId`, and has no condition editing fields (player rows are the same `PlayerRow` as the player's view); `selectGroup` returns the four Goblin ids for a ×4 group and `[id]` for a lone enemy and does not include a fifth goblin with a different group; `toggleSelected` adds then removes without mutating its input; `reorderTarget(2, 130, 64, 8)` is 4, negative offsets move up, results clamp to `1` and `count`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the builders and helpers as pure functions, no React.
- [ ] **Step 4: Run to verify they pass**, then `npx tsc --noEmit` and the full suite.
- [ ] **Step 5: Commit** `feat: battle order view models`.

### Task 2: Damage / Heal / Temp HP entry with undo

**Files:** Create `src/features/combat/HpEntryBar.tsx`, `src/features/combat/useEnemyHp.ts`, `src/features/combat/usePlayerCombatHp.ts`; Test `__tests__/features/combat/HpEntryBar.test.tsx`, `useEnemyHp.test.tsx`, `usePlayerCombatHp.test.tsx`.

**Interfaces:**
- Produces `HpEntryBar(props: { label: string; disabled?: boolean; canUndo: boolean; onDamage: (n: number) => void; onHeal: (n: number) => void; onTemp: (n: number) => void; onUndo: () => void })`: one number-pad `Input` (digits only, max 4 characters, accessibility label `Amount`), buttons `Damage` (destructive), `Heal`, `TEMP_HP_LABEL`, and `Undo` shown only when `canUndo`; the three action buttons are disabled for an empty or zero amount; the field clears after an action; every button is 44pt (`Button` default size).
- `useEnemyHp(combatId: string): { apply: (ids: string[], mode: 'damage' | 'heal' | 'temp', amount: number) => Promise<void>; undoFor: (entryId: string) => Promise<void>; canUndo: (entryId: string) => boolean; pending: boolean }`: remembers, per entry id, the batch id returned by `applyEnemyHp`; a bulk apply records the same batch for every id; a later apply to an id replaces its batch; `undoFor` calls `undoEnemyHp(combatId, batchOfThatEntry)` and forgets the batches that call covered; `apply` and `undoFor` are ignored while `pending` (a double tap is one call); errors become the plain-language toast and leave the undo state unchanged.
- `usePlayerCombatHp(character: CharacterFull, campaignId: string): { damage: (n: number) => void; heal: (n: number) => void; temp: (n: number) => void; undo: () => void; canUndo: boolean }`: writes only `character.id`'s resources through `useResourceMutation` with `applyPoolChange(resources, defs, 'hp', change)` where `change` is `adjustPool(cur, -n)`, `adjustPool(cur, n)` or `setTemp(cur, n)` from `src/systems/resources.ts` (so reviving from 0 also clears death saves, as `HpSheet` does); also merges the result into the `qk.party(campaignId)` cache at once (Realtime would otherwise be the first to show it) and rolls back on error with a toast. It remembers `{ before, after }` for the last change; `undo` restores `before` only if the cached pool still equals `after`, otherwise it does nothing and shows `HP changed since`.

- [ ] **Step 1: Write failing tests:**
  - `HpEntryBar`: typing `7` then pressing `Damage` calls `onDamage(7)` once and clears the field; `Heal` and `Temp HP` call their handlers with the number; `7a.5` becomes `75`; empty and `0` leave the three buttons disabled; `Undo` is absent unless `canUndo`; the amount input has `keyboardType="number-pad"`; each action carries the 44pt button size token.
  - `useEnemyHp`: `apply(['a'],'damage',7)` calls `applyEnemyHp(combatId,['a'],'damage',7)` once and `canUndo('a')` becomes true; a bulk apply on four ids makes `canUndo` true for each, and `undoFor('b')` calls `undoEnemyHp` once with the bulk batch and clears undo for all four; a second apply to `a` replaces `a`'s batch only; calling `apply` twice synchronously while the first is pending results in one request; a rejected apply shows a toast and leaves `canUndo` false.
  - `usePlayerCombatHp` (acceptance numbers): 22/30 `damage(7)` writes 15/30; from 15/30 `damage(20)` writes 0/30; with temp 5 and hp 12, `damage(7)` writes temp 0 and hp 10; `heal(100)` caps at max; `temp(8)` over 5 gives 8 and `temp(3)` over 8 stays 8; `undo()` after damage restores the previous pool; `undo()` after the party cache shows a different pool (another device changed it) writes nothing and toasts `HP changed since`; a failed write rolls the party cache back and toasts; the only write function called is the resource update for the player's own character id (assert no other write API is invoked); healing from 0 clears the death-save resource.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the three files, reading `resourceDefs` from `getSystem(character.system_id).resources` as the `HpSheet` callers do.
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: damage, heal and temp hp entry with undo`.

### Task 3: Add-enemy form

**Files:** Create `src/features/combat/AddEnemyForm.tsx`; Test `__tests__/features/combat/AddEnemyForm.test.tsx`.

**Interfaces:**
- Consumes: `addEnemies`, `setInitiative` mutations (2a Task 8), `Sheet` from `src/components/ui/sheet`.
- Produces `AddEnemyForm(props: { combatId: string; open: boolean; onOpenChange: (open: boolean) => void })`: fields `Name` (max 60), `Max HP` (number pad, digits only), `Initiative` (number pad, optional), `AC` (optional), `Notes` (optional, multiline), a `Hidden` toggle, and `×` count (1..20). With a count above 1 a `Separate rolls` toggle appears; on, the single initiative field is replaced by one field per copy labelled `Goblin 1`…, and submitting calls `addEnemies` with `initiative: null` then `setInitiative(id, n)` for each returned id whose field has a number. Submit label `Add enemy` or `Add N enemies`. The sheet stays usable for the next enemy after a successful add (fields cleared, name field focused).

- [ ] **Step 1: Write failing tests:** a valid ×3 add with shared initiative calls `addEnemies(combatId, { name: 'Goblin', count: 3, maxHp: 7, initiative: 15, ac: 13, notes: null, hidden: false })`; with `Separate rolls` and numbers 15, 9 and blank it calls `addEnemies` with `initiative: null` and `count: 3`, then `setInitiative` for the first two returned ids only; blank name or missing/zero Max HP shows an inline message and makes no call; count typed as `100` becomes 20 and `0` becomes 1; letters and `.` are stripped from every number field; a 61-character name is cut at 60; `Hidden` is sent as `true`; a server error shows the toast and keeps the typed values; the submit button is disabled while the request is in flight.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the form (`Input`, `ToggleChip`, `Button`; tokens only).
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: add enemy form with copies and separate rolls`.

### Task 4: Roll call (GM) and the players' "Combat is starting"

**Files:** Create `src/features/combat/RollCall.tsx`, `src/features/combat/CombatStarting.tsx`; Test `__tests__/features/combat/RollCall.test.tsx`, `CombatStarting.test.tsx`.

**Interfaces:**
- Consumes: `useCombatEntries(combat, true)`, `useActiveCombat`, `setInitiative`, `startCombat`, `AddEnemyForm`, party cache for player names.
- Produces `RollCall(props: { combat: Combat; party: CharacterFull[] })` (GM only): heading `Roll initiative`; one row per entry in the server's order (so the list re-sorts as numbers land), a player row showing the character name, an enemy row its name and an `Enemy` tag; each row has a number-pad field (`returnKeyType="next"`, `blurOnSubmit={false}`); submitting sets the number with `setInitiative` and moves focus to the next row's field, the last row dismisses the keyboard; the typed value shows immediately while the request is pending; `Add enemy` opens `AddEnemyForm`; `Start combat` calls `startCombat(combat.id)`, with a hint `N rows have no number yet. They go last.` when some are blank. `CombatStarting()` renders the text `Combat is starting` (live region, announced once) and nothing else.

- [ ] **Step 1: Write failing tests:** rows render for 3 players and an enemy with their names; typing `18` and submitting calls `setInitiative(id, 18)` and the next row's field receives focus; the last row's submit does not move focus; after the server reorders (rerender with entries re-sorted) the rows follow the new order; blank rows show the `go last` hint and `Start combat` is still enabled; `Start combat` calls `startCombat` once even when tapped twice; `not_rolling` and `no_active_combat` errors toast and refetch; letters are stripped and values over 99 or under -20 are clamped before sending; with no players and no enemies the empty copy `No one has joined with a character yet` shows and `Add enemy` still opens the form; `CombatStarting` shows `Combat is starting` and no number fields.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** both components.
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: initiative roll call`.

### Task 5: GM battle order (enemy rows, bulk damage, turn control)

**Files:** Create `src/features/combat/EnemyRow.tsx`, `src/features/combat/BulkBar.tsx`, `src/features/combat/GmBattleOrder.tsx`; Test `__tests__/features/combat/EnemyRow.test.tsx`, `BulkBar.test.tsx`, `GmBattleOrder.test.tsx`.

**Interfaces:**
- Consumes: `buildGmOrder`, `selectGroup`, `toggleSelected`, `reorderTarget`, `useEnemyHp`, `HpEntryBar`, `AddEnemyForm`, `nextTurn`, `delayTurn`, `setCurrentEntry`, `moveEntry`, `updateEnemy`, `removeEntry`, `PartyCard`-style compact player rows.
- Produces `GmBattleOrder(props: { campaign: CampaignFull; combat: Combat; party: CharacterFull[] })`: header `Round n`; one list in turn order (owner's layout A); the current row has a `▶` marker and the text `Current`; a sticky `Next turn` button calling `nextTurn(combat.id, currentId)` (a no-op result just refetches); `Add enemy`; per-row actions `Make current`, and on the current row `Delay`; reorder by dragging a grip handle (`Gesture.Pan()` with `reorderTarget`, committing one `moveEntry` on release) with `Move up`/`Move down` buttons as the accessible alternative; the whole list is one scroll view.
- `EnemyRow(props: { row: GmEnemyRow; selected: boolean; onToggleSelect: () => void; hp: ReturnType<typeof useEnemyHp>; onSelectGroup?: () => void })`: shows name (single line), `init n`, `current/max` text plus `+n Temp HP`, a progress bar, an `AC n` chip, the notes line, `Hidden` badge, and `Down` as text at 0; a 44pt `Select <name>` toggle on the leading edge; tapping the body expands `HpEntryBar` (wired to `hp.apply([row.id], …)` and `hp.undoFor(row.id)`), `Set HP` (exact typed value via `updateEnemy({ hp })`), a notes editor (`updateEnemy({ notes })`), `Hide`/`Reveal` (`updateEnemy({ hidden })`), `Select group` when the row has a group of more than one, and `Remove` (destructive, behind a confirm `Dialog`).
- `BulkBar(props: { selectedIds: string[]; hp: ReturnType<typeof useEnemyHp>; onClear: () => void })`: shown while the selection is non-empty: `N selected`, `HpEntryBar`, and `Clear`; the amount applies to every selected row through one `hp.apply(selectedIds, mode, n)`, then the selection clears. Player rows in the GM list are read-only: **no HpEntryBar, no Select toggle, no edit control of any kind** (the card for a player is the Phase 1 look, with the hit points shown as text).

- [ ] **Step 1: Write failing tests:** current row shows `Current` text and the `▶` marker and an accessibility label containing `current turn`; a hidden enemy shows `Hidden` and a `Reveal` action; an enemy at 0 shows `Down` text; selecting four Goblins and entering 5 with `Damage` calls `applyEnemyHp` once with the four ids, mode `damage`, amount 5, then the selection is empty and the bar is gone; `Select group` on one Goblin selects exactly its group's ids and not a fifth goblin added later; `Heal` and `Temp HP` pass their modes; each affected row shows `Undo` afterwards and tapping it calls `undoEnemyHp` once for the batch; `Next turn` calls `nextTurn(combat.id, currentId)`; a stale no-op refetches without toast; `Delay` and `Make current` call their RPCs with the right ids; `Move up`/`Move down` call `moveEntry` with the neighbouring position; `Remove` needs the confirm and then calls `removeEntry`; `Reveal`/`Hide` call `updateEnemy({ hidden })`; **no player row contains any element with the label `Damage`, `Heal`, `Temp HP`, `Amount` or `Select …`** (assert by query); a 60-character enemy name stays on one line (`numberOfLines={1}`); 8 players and 12 enemies render without error; empty enemy list shows a hint and `Add enemy`; an `ended` error from any action toasts and refetches.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the three components; the drag is only the gesture wrapper around `reorderTarget`, the buttons carry the tested behaviour.
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: GM battle order with enemies, bulk damage and turn control`.

### Task 6: Player battle order and the "Your turn" banner

**Files:** Create `src/features/combat/PlayerBattleOrder.tsx`; Modify `src/features/sessions/TurnBanner.tsx`; Test `__tests__/features/combat/PlayerBattleOrder.test.tsx`; update `__tests__/features/sessions/TurnBanner.test.tsx` and `TurnBanner.flow.test.tsx`.

**Interfaces:**
- Consumes: `buildPlayerOrder`, `usePlayerCombatHp`, `HpEntryBar`, `endMyTurn`, `useActiveCombat`, `useCombatOrder`, `useCombatRealtime`.
- Produces `PlayerBattleOrder(props: { campaign: CampaignFull; combat: Combat; party: CharacterFull[] })`: header `Round n`; when `gmTurn` a pinned row `GM's turn` above the list (no name, no initiative, no hit points); then the order: enemy rows show name and `init n` only; teammate rows show name, `current/max` text, bar, conditions and `init n` read-only; the player's own row (`isMine`) expands on tap to `HpEntryBar` wired to `usePlayerCombatHp`; the current row has the `▶` marker and `Current` text. Changes announce: `GM's turn` when `gmTurn` becomes true, `Round n` on a new round.
- `TurnBanner()` changes its source: it finds the viewer's own `combat_order` row for the sheet's campaign (`user_id` equals the signed-in user and `character_id` equals the sheet's character) and shows only when `combat.status === 'active'` and `combat.turn_entry_id` equals that row's id; `End Turn` calls `endMyTurn(combat.id)` through `mutateAsync(...).catch(toast)`; `not_your_turn` refetches (the banner then disappears); `Your turn` is announced when it appears. It mounts `useCombatRealtime` so the banner works on every tab. `holdsTurn` is no longer used here.

- [ ] **Step 1: Write failing tests:** with a hidden enemy holding the turn (`gm_turn` true) the screen shows the pinned `GM's turn` row and no row with a name for it, and the rendered tree contains none of the enemy's hit points (feed the screen an order row object carrying extra `hp`, `ac`, `notes` keys as a hostile server would, and assert they are never rendered); enemy rows show only name and initiative; teammates have no `Amount` field or buttons, the own row does after tapping; `current/max` text appears for players; `Current` marker follows `turn_entry_id`; `PartyCard` features (conditions) render; the banner appears only for the holder, not for a teammate and not for the GM viewing a sheet, not while `rolling`; `End Turn` calls `endMyTurn` once with two quick taps; `not_your_turn` toasts and refetches; when combat ends while the own-row HP entry is open the component unmounts cleanly (rerender with `combat` ended, no error); announcements fire once per change (spy on `AccessibilityInfo.announceForAccessibility`).
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the player screen and the banner change.
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: player battle order and turn banner from the order`.

### Task 7: `PartyPage`, mounts and live updates

**Files:** Create `src/features/combat/PartyPage.tsx`; Modify `app/(app)/campaigns/[id].tsx`, `app/(app)/characters/[id]/campaign.tsx`; Test `__tests__/features/combat/PartyPage.test.tsx`; update `__tests__/features/campaigns/detail.test.tsx` and the campaign-tab test that renders these screens.

**Interfaces:**
- Consumes: `PartyList`, `usePartyCharacters`, `usePartyRealtime`, `useActiveCombat`, `useCombatRealtime`, `RollCall`, `CombatStarting`, `GmBattleOrder`, `PlayerBattleOrder`.
- Produces `PartyPage({ campaign }: { campaign: CampaignFull })`: renders `PartyList` when there is no live combat; while `rolling`, `RollCall` for the GM and `CombatStarting` followed by `PartyList` for everyone else; while `active`, `GmBattleOrder` for the GM and `PlayerBattleOrder` for active members; invited members and outsiders get `PartyList` (which already shows nothing for invited) and never subscribe (`useCombatRealtime(campaign.id, enabled)` with `enabled` false). It shows one `Reconnecting…` marker if either the party or combat channel is down. Both mount points render `PartyPage` inside the existing `SectionHeader id={`campaign:${id}:party`}`, titled `Party` normally and `Battle order` while active. The campaign screen no longer renders `TurnControls` (removed here; deleted in Task 8).

- [ ] **Step 1: Write failing tests:** no combat → the Phase 1 list; `rolling` as GM → roll call, as player → `Combat is starting` plus the list; `active` as GM/player → the matching screen and the section title `Battle order`; combat `ended` mid-view → back to the list with no error; an invited member never starts a combat query or subscription; `Reconnecting…` shows once when either channel is down; the screens that mount it no longer render `TurnControls`; both existing screen tests pass with `PartyPage` mocked or real as they did for `PartyList`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the container and swap the two mounts.
- [ ] **Step 4: Run to verify they pass**, then the full suite and lint.
- [ ] **Step 5: Commit** `feat: party page becomes the battle order`.

### Task 8: Retire the manual turn picker and drop its column

**Files:** Delete `src/features/sessions/TurnControls.tsx`, `src/features/sessions/turn.ts`, `__tests__/features/sessions/TurnControls.test.tsx`, `TurnControls.flow.test.tsx`, `eligibleTurnMembers.test.ts`, `turn.test.ts`; Modify `src/features/sessions/sessions.api.ts` (remove `setTurn`, `endTurn`), `sessions.queries.ts` (remove `useSetTurn`, `useEndTurn`), `src/types/database.types.ts`, `supabase/tests/rpc_sessions.test.sql`, `rls_sessions.test.sql`, and any 2a pgTAP file asserting the old column; Create `supabase/migrations/20261104000006_drop_manual_turn.sql`.

**Interfaces:** The migration drops `set_turn(uuid, uuid)`, the old `end_turn(uuid)`, constraint `sessions_turn_requires_combat`, index `sessions_current_turn_user_id_idx` and column `sessions.current_turn_user_id`; replaces `set_combat`, `end_session` and `sessions_clear_turn_on_leave()` without the `current_turn_user_id` assignments (the leave trigger keeps only the `refresh_combat` call). `Session` loses `current_turn_user_id`.

- [ ] **Step 1: Write the failing checks first:** update the pgTAP files so they assert the new truth: `rpc_sessions.test.sql` drops the `set_turn`/`end_turn` cases (adjust `plan`) and adds "sessions has no `current_turn_user_id` column" and "`set_turn` and `end_turn` no longer exist" (`hasnt_column`, `hasnt_function`); `rls_sessions.test.sql` drops the turn-cleanup case. Add the guard `grep -rn "current_turn_user_id\|set_turn\|TurnControls\|eligibleTurnMembers\|holdsTurn" src app __tests__` which must print nothing once done.
- [ ] **Step 2: Run to verify they fail** (the column still exists).
- [ ] **Step 3: Write the migration, delete the files, regenerate types** (`npx supabase migration up --local`, `npx supabase gen types typescript --local > src/types/database.types.ts`); remove the unused API and hooks.
- [ ] **Step 4: Run to verify they pass:** every pgTAP file, the grep guard (empty), `npx tsc --noEmit`, the full jest suite and lint. `CombatBadge`'s end-combat dialog copy (`The current turn will be cleared.`) stays true.
- [ ] **Step 5: Commit** `refactor: retire the manual turn picker and current_turn_user_id`.

### Task 9: Verify on a real project

- [ ] **Step 1:** With the owner's go-ahead, apply the 2a and 2b migrations to the hosted project through the CLI (`db push`) (or to a Supabase branch if the owner prefers), then run `node scripts/verify-combat-realtime.mjs` with a GM, a player and an invited account of one campaign; it must pass every check (invited gets nothing; the player gets only `combats`/`sessions` signals with no secrets).
- [ ] **Step 2:** With a GM and two player devices, run a full fight: a player taps `Enter combat`; players see `Combat is starting`; the GM rolls call, adds `Goblin ×3` shared and one hidden `Ogre`, starts, damages the group with one number, undoes, passes turns until the hidden Ogre has the turn (players see `GM's turn` and no position for it), reveals it (it appears at its place), a player ends their own turn from the banner while the GM taps `Next turn` at the same moment (exactly one advance), a player damages themself from their row, the round counter increments, the GM ends combat (every device returns to the party page), and `End session` ends a fight in progress. Check changes appear on other devices within about 2 s, airplane mode on one phone shows `Reconnecting…` and recovers, and VoiceOver announces `Your turn`, `GM's turn` and `Round n`.
- [ ] **Step 3:** In the PR description record what was and was not checked (Android, large font sizes, 8+ players on a small phone, and anything the owner did not run), and that `Temp HP` vs the sheet's `Bonus HP` wording is the owner's call.

## Self-Review (2b)

- **Coverage:** transform (T7); roll call and `Combat is starting` (T4); typed-in enemies, ×N, shared/separate rolls, hidden at creation (T3); enemy rows with notes, hidden toggle, remove, exact correction (T5); Damage/Heal/Temp HP with undo (T2) on enemy rows (T5), in bulk and by group (T5) and on a player's own row (T2, T6); players see names only and `GM's turn` (T1, T6); turn control, `End Turn`, banner (T5, T6); never blocks: reorder, skip (`Make current`), delay, add/remove mid-fight (T5); round counter (T5, T6); picker retired (T8); accessibility and design system (Global Constraints, T5-T7); end of combat/session mid-edit (T4, T6, T7); real-project verification (T9).
- **Names** match 2a: `buildPlayerOrder`, `buildGmOrder`, `HpEntryBar`, `useEnemyHp`, `usePlayerCombatHp`, `AddEnemyForm`, `RollCall`, `CombatStarting`, `EnemyRow`, `BulkBar`, `GmBattleOrder`, `PlayerBattleOrder`, `PartyPage`, `TEMP_HP_LABEL`; API calls are 2a Task 8's camelCase wrappers.
- **Risks to watch:** the drag gesture is the one piece without a unit test beyond `reorderTarget` (the buttons carry the tested behaviour; check the drag by hand in Task 9); new-component length (`GmBattleOrder`) should be split if it passes about 250 lines; two realtime mounts (banner and page) are intentional and use unique topics.
