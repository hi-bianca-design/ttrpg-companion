# Open Session — Combat Badges Implementation Plan (PRD step 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `Enter combat` / `In combat` on the character sheet so any member can start combat and the GM or the starter can end it.

**Architecture:** A `useSetCombat` mutation over the existing `sessions.api.setCombat`, writing the returned row into the session cache. A `CombatBadge` reads the character's active session (already polled by step 2), the campaign (for the GM id) and the signed-in user, and renders one of three states. A `SessionStatusRow` in `SheetHeader` puts `Session: Active` on the left and the combat badge on the right, replacing the step-2 placement of the session badge inside the nav row.

**Tech Stack:** Expo Router, React Query, NativeWind, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-02-open-session-prd.md` (P0 items 2 and 3). **Depends on:** PR 30 (step 2), now on `main`.

## Global Constraints

- Copy, verbatim: `Enter combat`, `In combat`; confirm dialog title `End combat?`, body `The current turn will be cleared.`, actions `Cancel` / `End combat`.
- Rules (match the DB): any active member can enter combat; only the GM (`campaign.gm_id === user.id`) or the member in `session.combat_started_by` can end it; everyone else sees `In combat` as a static badge. While the campaign (and so the GM id) is still loading, treat the viewer as not the GM.
- Badges show only while the session is active; both vanish when it ends.
- Colour: `In combat` uses the existing `tinted` Badge variant (the design system's "status applying right now" plate), not red: red is reserved for destructive and error uses. No hex/rgb literals or arbitrary values outside `src/components/ui/`, `src/lib/theme.ts`, `global.css`, `tailwind.config.js` (`npm run lint:tokens`). No `rounded-full` / pill radii in features.
- Touch targets stay 44pt (`hitSlop` on the tappable badges). Failures surface as a toast (`showToast` from `@/components/ui/toast`) with the `AppError` message from `ERROR_COPY`.
- Polling stays as in step 2; Realtime is step 4.
- `npm test` equivalent must pass at the end of every task. In a `.claude/worktrees` checkout run jest through a CLI override of the ignore lists (the config ignores that path); the machine can be heavily loaded, so allow a longer timeout.
- Do not push, open a PR, or apply migrations to a shared database without the owner's confirmation.

## Review Focus

1. Two members tapping `Enter combat` at once must both end up on `In combat`; the second tap is a no-op, never an error toast. (Tasks 1, 2)
2. A member who is neither the GM nor the starter must not be able to open `End combat`; neither must anyone while the GM id is still loading. (Task 2)
3. When the session ends elsewhere while combat is on, `In combat` must disappear on the next poll, and `End combat` on an already-ended session must toast the `no_active_session` copy and refresh. (Tasks 1, 2)
4. At 2× system font scale or a narrow phone the status row must wrap, not clip or overlap `Level up`. (Task 3)
5. A failing combat mutation must leave the badge unchanged and never crash the header. (Tasks 1, 2)

---

## File Structure

- Modify `src/features/sessions/sessions.queries.ts` — `useSetCombat`.
- Create `src/features/sessions/combat.ts` (pure `canEndCombat`), `CombatBadge.tsx`, `SessionStatusRow.tsx`.
- Modify `src/features/characters/sheet/SheetHeader.tsx` and `src/features/sessions/SessionBadge.tsx` only as needed (badge moves out of the nav row).
- Tests under `__tests__/features/sessions/`; the four sheet tests that mock `SessionBadge` will also need to mock `SessionStatusRow`.

### Task 1: `useSetCombat`

**Files:** Modify `src/features/sessions/sessions.queries.ts`; Test `__tests__/features/sessions/sessions.queries.test.tsx`.

**Interfaces:**
- Consumes: `setCombat(sessionId: string, inCombat: boolean): Promise<Session>`, `qk.session`.
- Produces: `useSetCombat(campaignId: string)` — `useMutation` with `mutate({ sessionId: string; inCombat: boolean })`; success writes the returned row to `qk.session(campaignId)`; error invalidates it.

- [ ] **Step 1: Write failing tests:** success writes the returned row into the cache; calling it twice with `inCombat: true` and the same returned row leaves one cached session; a rejection with `AppError('no_active_session')` exposes the error and refetches (cache shows the refetched `null`); a rejection leaves the previously cached row in place until the refetch resolves.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the hook mirroring `useEndSession`.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: combat mutation hook`.

### Task 2: `canEndCombat` and `CombatBadge`

**Files:** Create `src/features/sessions/combat.ts`, `src/features/sessions/CombatBadge.tsx`; Test `__tests__/features/sessions/combat.test.ts`, `__tests__/features/sessions/CombatBadge.test.tsx`.

**Interfaces:**
- Consumes: `useCharacterSession` (step 2), `useCampaign`, `useCharacterCampaign`, `useAuth`, `useSetCombat` (Task 1), `showToast`.
- Produces: `canEndCombat(session: Pick<Session, 'combat_started_by'>, userId: string | undefined, gmId: string | undefined): boolean`; `CombatBadge()` (no props; reads the sheet's character via `useCharacterRouteId()`), rendering nothing without a session.

- [ ] **Step 1: Write failing tests.** `canEndCombat`: GM → true; starter → true; other member → false; `userId` or `gmId` undefined → false (no accidental match of two undefineds). `CombatBadge`: no session → renders nothing; session out of combat → `Enter combat` button, press calls `setCombat.mutate({ sessionId, inCombat: true })`; in combat as GM or starter → `In combat` is a button, press opens the `End combat?` dialog with the verbatim copy, Cancel does nothing, confirm calls `mutate({ sessionId, inCombat: false })`; in combat as another member → `In combat` is not a button; GM id still loading → not a button; a mutation error shows a toast with the `ERROR_COPY` message.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** `canEndCombat` and the badge (`Badge` default for `Enter combat` with a phosphor `Shield` icon, `tinted` for `In combat`, wrapped in a `Pressable` with `accessibilityRole="button"` and `hitSlop` only where tappable; dialog like `SessionControls`).
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: enter and end combat badge`.

### Task 3: Status row in the sheet header

**Files:** Create `src/features/sessions/SessionStatusRow.tsx`; Modify `src/features/characters/sheet/SheetHeader.tsx`, the four sheet tests that mock `SessionBadge`, `__tests__/features/sessions/sheet-badge.test.tsx`.

**Interfaces:** Consumes `SessionBadge` (step 2), `CombatBadge` (Task 2), `useCharacterSession`. Produces: `SessionStatusRow()` — returns `null` without an active session, else a wrapping row with `SessionBadge` leading and `CombatBadge` trailing. `SheetHeader` renders it below the nav row (no new props); `Level up` stays alone in the nav row.

- [ ] **Step 1: Write failing tests:** with an active session the header shows `Session: Active` and `Enter combat`; with `combat_started_by` the GM and `in_combat` the header shows `In combat`; with no session neither shows and the header gains no extra empty row; `Back` and `Level up` still render; a failing session query leaves the header intact.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the row (`flex-row flex-wrap items-center justify-between gap-2`), move the badge out of the nav row, mock `SessionStatusRow` in the four sheet tests that already mock `SessionBadge`.
- [ ] **Step 4: Run the full suite** — every pre-existing sheet test still passes.
- [ ] **Step 5: Commit** `feat: combat badge in the sheet header`.

### Task 4: Verify in the app

- [ ] **Step 1:** With the owner's go-ahead, apply the migrations to a **local** stack that is not the shared one, then run Expo web with two accounts.
- [ ] **Step 2:** Walk it: a player taps `Enter combat` → the GM sees `In combat` within ~10s; the GM ends combat → the player's badge returns to `Enter combat`; a player who did not start combat has no way to end it; ending the session removes both badges. Note in the PR what was and wasn't checked (iOS/Android not covered).

## Self-Review

- **Spec coverage:** PRD P0 item 2 (right-hand badge: `Enter combat` for members, `In combat` for everyone, tappable for the GM or starter) and item 3 (combat rules and UI) → Tasks 1-3. Turn banner and picker, Realtime: step 4, deliberately out.
- **Names:** `useSetCombat`, `canEndCombat`, `CombatBadge`, `SessionStatusRow` match across tasks; `combat_started_by` is the existing session column.
- **Open question carried:** the mockup shows a red dot for `In combat`; this plan uses the `tinted` plate because red is reserved for destructive/error. A design call before Task 2.
