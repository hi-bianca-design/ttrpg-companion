# Open Session — Session and Combat Status on the Campaign Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `Session: Active` and `Enter combat` / `In combat` on the campaign screen, so a GM (who has no character sheet) can start and end combat and see session state.

**Architecture:** The session and combat badges today resolve their campaign from the open character sheet. Split each into a presentational `…View` that takes a campaign id and session, keep the existing sheet components as thin wrappers (same hooks, same behaviour), and add `Campaign…` wrappers that read the session by campaign id. A `CampaignSessionStatus` row (same layout as the sheet's `SessionStatusRow`) mounts on the campaign screen above the session controls.

**Tech Stack:** Expo Router, React Query, NativeWind, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-02-open-session-prd.md` (P0 items 2 and 3: "a GM who has no character must still see the controls"). **Found by:** the owner, reviewing the preview: a GM has no sheet (a GM's membership has no character and `join_campaign` refuses a second join), so the sheet-only badges are unreachable for them.

## Global Constraints

- Behaviour and copy unchanged from steps 2 and 3: `Session: Active`; `Enter combat` for any active member out of combat; `In combat` tappable only for the GM or whoever started combat, opening `End combat?` / `The current turn will be cleared.` / `Cancel` / `End combat`; failures toast the shared `ERROR_COPY` text via `mutateAsync().catch`.
- The campaign screen must not call character-route hooks (`useCharacterRouteId`, `useCharacterCampaign`): on that route `id` is the **campaign** id. Campaign wrappers take `campaignId` explicitly.
- The status row renders nothing without an active session (no empty row), and nothing for members who can't read sessions (invited): the session query returns null for them.
- Design system: tokens only (`npm run lint:tokens`), no `rounded-full`, red only for destructive/error, touch targets 44pt (existing `HIT_SLOP`).
- The sheet's existing tests keep passing unchanged: that is the regression check for the refactor.
- `npm test` equivalent must pass at the end of every task. In a `.claude/worktrees` checkout run jest through a CLI override of the ignore lists (the config ignores that path), with a longer timeout when the machine is loaded. `npm run lint:tokens` currently fails on `main` at `app/(app)/characters/index.tsx:33` (`pr-10`, not from this work); use `.superpowers/lint-mine.sh`, which tolerates only that line.
- Do not push, open a PR or change a shared database without the owner's confirmation.

## Review Focus

1. A GM with no character can enter combat and end it from the campaign screen, and sees `In combat` for combat a player started. (Tasks 1, 2)
2. The campaign screen never queries by character: no failing character-campaign request with the campaign id. (Task 2)
3. An invited member, or anyone when no session exists, sees no status row and no empty gap. (Task 2)
4. The sheet's badges behave exactly as before (the existing sheet tests pass untouched). (Task 1)
5. Both screens mounted at once (sheet underneath, campaign screen on top) stay in sync: one session cache key. (Task 2)

---

### Task 1: Campaign-based badges

**Files:** Modify `src/features/sessions/SessionBadge.tsx`, `src/features/sessions/CombatBadge.tsx`; Test `__tests__/features/sessions/CampaignBadges.test.tsx`, `__tests__/features/sessions/CampaignBadges.flow.test.tsx`.

**Interfaces:**
- Consumes: `useActiveSession(campaignId)`, `useSetCombat`, `useCampaign`, `useAuth`, `canEndCombat`, `showToast`.
- Produces: `SessionBadgeView({ session }: { session: Session | null })`; `CombatBadgeView({ campaignId, session }: { campaignId: string | undefined; session: Session | null })`; `CampaignSessionBadge({ campaignId }: { campaignId: string })`; `CampaignCombatBadge({ campaignId }: { campaignId: string })`. The existing `SessionBadge()` and `CombatBadge()` keep their signatures and behaviour (they resolve the sheet's campaign and session, then render the views).

- [ ] **Step 1: Write failing tests.** Unit: `CampaignSessionBadge` shows `Session: Active` when `useActiveSession(campaignId)` has a session and nothing otherwise, and never calls `useCharacterCampaign`/`useCharacterRouteId`; `CampaignCombatBadge` shows `Enter combat` out of combat and presses call `setCombat.mutateAsync({ sessionId, inCombat: true })`, shows a tappable `In combat` for the GM and the starter and a static one for others. Flow (real hooks over a mocked api, `staleTime` raised on `['session']`): a GM with no character enters combat → `In combat`, taps it, confirms `End combat?` → back to `Enter combat`; a refused end (`not_allowed`) toasts and keeps `In combat`.
- [ ] **Step 2: Run to verify they fail** (exports missing).
- [ ] **Step 3: Implement** the views by moving the rendering/logic out of the sheet components, the two campaign wrappers, and rewrite `SessionBadge`/`CombatBadge` as thin wrappers over the views.
- [ ] **Step 4: Run to verify they pass**, plus the existing `SessionBadge`, `CombatBadge`, `CombatBadge.flow`, `sheet-badge` tests unchanged, then the full suite and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `refactor: campaign-based session and combat badges`.

### Task 2: Status row on the campaign screen

**Files:** Create `src/features/sessions/CampaignSessionStatus.tsx`; Modify `app/(app)/campaigns/[id].tsx`, `__tests__/features/campaigns/detail.test.tsx`; Test `__tests__/features/sessions/CampaignSessionStatus.test.tsx`.

**Interfaces:** Consumes Task 1's `CampaignSessionBadge`, `CampaignCombatBadge`, `useActiveSession`. Produces `CampaignSessionStatus({ campaignId }: { campaignId: string })` — `null` without an active session, else a wrapping row (`flex-row flex-wrap items-center justify-between gap-2`) with `CampaignSessionBadge` leading and `CampaignCombatBadge` trailing; mounted in the campaign screen directly above `SessionControls`.

- [ ] **Step 1: Write failing tests.** Unit: no session → renders nothing (no empty row); session → both badges. Campaign detail: a GM sees `Session: Active` and `Enter combat` for an active session and neither without one; an in-combat session shows `In combat`; no character-campaign request is made (the `campaigns.api` mock exposes only `getCampaign`, so a stray `getCharacterCampaign` call would throw); an invited viewer (session query returns null) sees no row.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the row and mount it; extend `detail.test.tsx` mocks (`sessions.api` already mocked there).
- [ ] **Step 4: Run the full suite** and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: session and combat status on the campaign screen`.

### Task 3: Verify in the app

- [ ] **Step 1:** On the preview with a GM account (no character): open a session, `Session: Active` and `Enter combat` appear on the campaign screen; tap `Enter combat` → `In combat`; tap it → confirm → back. A player entering combat shows `In combat` for the GM within ~10s.
- [ ] **Step 2:** Note in the PR what was and wasn't checked (iOS/Android not covered).

## Self-Review

- **Spec coverage:** PRD P0 items 2 and 3 for the GM-with-no-character case → Tasks 1-2. Turn banner and picker are PR 34; Realtime is step 4b.
- **Names:** `SessionBadgeView`, `CombatBadgeView`, `CampaignSessionBadge`, `CampaignCombatBadge`, `CampaignSessionStatus` match across tasks; the existing sheet exports keep their names.
- **Open question:** none.
