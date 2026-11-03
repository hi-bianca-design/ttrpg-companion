# Open Session — Turn Banner and GM Turn Picker Implementation Plan (PRD step 4a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The GM gives the turn to one player; that player (and only that player) sees a "Your turn" banner on their character sheet with an End Turn button.

**Architecture:** Two mutation hooks over the existing `set_turn` / `end_turn` RPCs. A `TurnBanner` in `SheetHeader`, right after the session status row, reads the character's active session and shows only when `current_turn_user_id` is the signed-in user and the sheet is that user's own character. A GM-only `TurnControls` block on the campaign screen lists eligible members with a "Give turn" action and a "Clear turn" action. Turn changes still reach other devices by the step-2 polling; Realtime is step 4b.

**Tech Stack:** Expo Router, React Query, NativeWind, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-02-open-session-prd.md` (P0 item 4). **Depends on:** PR 32 (step 3), on `main`.

## Global Constraints

- Banner copy, verbatim: title `Your turn`, body `Take your action, bonus action, and movement`, primary button `End Turn`.
- Rules (match the DB): only the GM can set or clear the turn, and only while in combat, to an active member who has a character; only the holder can end their own turn; **End Turn clears the turn** for everyone (no auto-advance until a turn order exists).
- The banner shows on all four sheet tabs, above the character name block, pushing content down (not overlaying it), only while `session.in_combat` and `session.current_turn_user_id === user.id` and the sheet's character is owned by the user.
- `TurnControls` shows only to the GM, only while the session is in combat. Offered targets: active members with a character; the GM is never offered unless they have a character of their own that is attached. A holder row shows a `Their turn` marker; "Clear turn" appears while someone holds the turn; with nobody holding it the panel says `Pick whose turn it is`.
- Failures toast with `ERROR_COPY` text via `mutateAsync(...).catch(showToast)` (a per-call `mutate` `onError` is dropped when the component unmounts).
- Design system: tokens only (`npm run lint:tokens`), no `rounded-full`/pill radii, red only for destructive/error; touch targets 44pt; the banner uses the existing `Card`/`Button` primitives.
- Polling stays as in step 2; Realtime is step 4b. No auto-expiry (PRD open question).
- `npm test` equivalent must pass at the end of every task. In a `.claude/worktrees` checkout run jest through a CLI override of the ignore lists (the config ignores that path), with a longer timeout when the machine is loaded.
- Do not push, open a PR or change a shared database without the owner's confirmation.

## Review Focus

1. The banner shows for exactly one person: the holder, on their own character's sheet. Not the GM viewing the holder's sheet, not a teammate who also holds a turn but is viewing another character, not anyone outside combat. (Task 2)
2. Moving the turn from A to B removes A's banner and shows B's on the next poll; End Turn on a turn that has already moved (`not_your_turn`) toasts the shared copy and refreshes to the true state. (Tasks 1, 2)
3. When combat or the session ends while the banner is showing it disappears, and End Turn then toasts rather than failing silently. (Tasks 1, 2)
4. A GM with no character can open the picker and is not offered as a target; invited members and members with no character are not offered either. (Task 3)
5. Giving the turn to a member who left a moment ago (`invalid_turn_target`) toasts and the list refreshes. (Tasks 1, 3)

---

## File Structure

- Modify `src/features/sessions/sessions.queries.ts` — `useSetTurn`, `useEndTurn`.
- Create `src/features/sessions/turn.ts` (pure helpers), `TurnBanner.tsx`, `TurnControls.tsx`.
- Modify `src/features/characters/sheet/SheetHeader.tsx`, `app/(app)/campaigns/[id].tsx`; the sheet tests that mock `SessionStatusRow` also mock `TurnBanner`.
- Tests under `__tests__/features/sessions/`.

### Task 1: Turn mutation hooks

**Files:** Modify `src/features/sessions/sessions.queries.ts`; Test `__tests__/features/sessions/sessions.queries.test.tsx`.

**Interfaces:**
- Consumes: `setTurn(sessionId: string, userId: string | null)`, `endTurn(sessionId: string)` from `sessions.api.ts`; `qk.session`.
- Produces: `useSetTurn(campaignId: string)` — `mutate`/`mutateAsync({ sessionId: string; userId: string | null })`; `useEndTurn(campaignId: string)` — `mutateAsync(sessionId: string)`. Both write the returned row to `qk.session(campaignId)` on success and invalidate it on error.

- [ ] **Step 1: Write failing tests** (real hooks, mocked api; add `setTurn`/`endTurn` to the file's `sessions.api` mock): success writes the returned row; `useSetTurn` passes `null` through to clear; a rejection with `AppError('not_your_turn')` / `AppError('invalid_turn_target')` exposes the error and refetches the cache to the api's current value.
- [ ] **Step 2: Run to verify they fail** (hooks undefined).
- [ ] **Step 3: Implement** both hooks mirroring `useSetCombat`.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: turn mutation hooks`.

### Task 2: `holdsTurn` and `TurnBanner`

**Files:** Create `src/features/sessions/turn.ts`, `src/features/sessions/TurnBanner.tsx`; Modify `src/features/characters/sheet/SheetHeader.tsx`, the sheet tests that mock `SessionStatusRow`; Test `__tests__/features/sessions/turn.test.ts`, `TurnBanner.test.tsx`, `TurnBanner.flow.test.tsx`, `sheet-badge.test.tsx`.

**Interfaces:**
- Consumes: `useCharacterSession`, `useCharacter` (for `owner_id`), `useAuth`, `useEndTurn` (Task 1), `showToast`.
- Produces: `holdsTurn(session: Pick<Session, 'in_combat' | 'current_turn_user_id'>, userId: string | undefined, characterOwnerId: string | undefined): boolean`; `TurnBanner()` (no props; uses `useCharacterRouteId()`), rendering nothing unless `holdsTurn`. `SheetHeader` renders it directly after `SessionStatusRow`.

- [ ] **Step 1: Write failing tests.** `holdsTurn`: holder on own character → true; holder on a teammate's character → false; GM viewing the holder's sheet → false; not in combat → false; unknown user or owner id → false (two undefineds never match). `TurnBanner`: shows `Your turn`, the verbatim body and an `End Turn` button for the holder; nothing otherwise; pressing End Turn calls `endTurn.mutateAsync(sessionId)`; a rejection toasts the `ERROR_COPY` message. Flow test (real hooks over a mocked api, `staleTime` raised on `['session']` like `CombatBadge.flow.test.tsx`): End Turn clears the banner; `not_your_turn` toasts and the banner disappears once the refetch shows the turn moved; a poll that clears the session while the call is in flight still toasts. Header test: the banner appears on a sheet header only for the holder.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the helper and a `Card`-based banner (gold-bordered, title `Your turn`, body, primary `End Turn`), mounted in `SheetHeader`; mock `TurnBanner` in the four sheet tests that already mock `SessionStatusRow`.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: your turn banner`.

### Task 3: `TurnControls` for the GM

**Files:** Create `src/features/sessions/TurnControls.tsx`; Modify `app/(app)/campaigns/[id].tsx`, `__tests__/features/campaigns/detail.test.tsx`; Test `__tests__/features/sessions/TurnControls.test.tsx`, `TurnControls.flow.test.tsx`.

**Interfaces:**
- Consumes: `CampaignFull`, `useActiveSession`, `useSetTurn` (Task 1), `useAuth`, `showToast`.
- Produces: `eligibleTurnMembers(members: CampaignMember[]): CampaignMember[]` (active, with `character_id`) exported from `turn.ts`; `TurnControls({ campaign }: { campaign: CampaignFull })` — renders nothing for non-GMs, outside combat, or without a session.

- [ ] **Step 1: Write failing tests.** `eligibleTurnMembers`: drops invited members and members without a character, keeps the rest in order. `TurnControls`: a player sees nothing; the GM sees nothing without a session or out of combat; in combat the GM sees `Pick whose turn it is` and a `Give turn to <name>` button per eligible member (the GM without a character is not listed); pressing one calls `setTurn.mutateAsync({ sessionId, userId })`; with a holder the row shows `Their turn`, the text names them, and `Clear turn` calls `mutateAsync({ sessionId, userId: null })`. Flow test: giving the turn to a member who just left toasts the `invalid_turn_target` copy and the list refreshes. Campaign detail test: a GM sees the panel in combat.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the panel (`SectionHeader`-style block, `Button` variants `outline` for Give turn, `ghost` for Clear turn) and mount it under `SessionControls` on the campaign screen; extend `detail.test.tsx`'s mocks.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: GM turn controls`.

### Task 4: Verify in the app

- [ ] **Step 1:** The hosted project already has the session functions; with two real accounts (GM and a player with a character) on the Vercel preview or production URL, walk it: enter combat; the GM gives the turn → the player's sheet shows the banner on every tab within ~10s; the player taps End Turn → banner gone, GM panel says `Pick whose turn it is`; the GM moves the turn between two players; the GM ends combat → banner vanishes.
- [ ] **Step 2:** Record what was and wasn't checked (iOS/Android not covered) in the PR.

## Self-Review

- **Spec coverage:** PRD P0 item 4 (GM sets/clears the turn while in combat; banner for exactly one user; End Turn clears; GM sees who holds it and the waiting state) → Tasks 1-3. Realtime and reconnect (P0 item 5) is step 4b, deliberately out; the polling interim stays.
- **Names:** `useSetTurn`, `useEndTurn`, `holdsTurn`, `eligibleTurnMembers`, `TurnBanner`, `TurnControls` match across tasks; `current_turn_user_id` and `in_combat` are existing session columns.
- **Decisions carried from the PRD:** End Turn clears (no auto-advance); the banner shows on all sheet tabs; the GM picks from the campaign screen. Open PRD questions not needed here: auto-expiry, GM-with-character turns (handled by "eligible = has an attached character").
