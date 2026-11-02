# Open Session — Open/End Session UI and Status Badge Implementation Plan (PRD step 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any active member open a session and the GM or opener end it, and show a `Session: Active` badge on every character-sheet tab while one is active.

**Architecture:** React Query hooks over the step-1 `sessions.api` (`getActiveSession`, `openSession`, `endSession`), with mutations writing the returned row into the cache. A `SessionBadge` renders in `SheetHeader`, the one header all four sheet tabs already share. A `SessionControls` block (Open / End with a confirm dialog) mounts on the campaign detail screen and the sheet's Campaign tab. Until Realtime lands (PRD step 4) the session query polls on a short interval so other members see changes.

**Tech Stack:** Expo Router, React Query, NativeWind, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-02-open-session-prd.md` (P0 items 1 and 2). **Depends on:** PR #21 (step 1) — base this work on that branch.

## Global Constraints

- Copy, verbatim: badge `Session: Active`; buttons `Open session`, `End session`; confirm dialog title `End this session?`, body `Combat and any active turn will end too.`, actions `End session` / `Cancel`.
- Roles: any **active** member sees Open when no session is active. End shows only to the GM (`campaign.gm_id === user.id`) or the opener (`session.opened_by === user.id`). Invited members see neither.
- Badge shows only when the character is in a campaign **and** that campaign has an active session. Its dot uses the `resource-sage` token; no hex/rgb literals or arbitrary values outside `src/components/ui/`, `src/lib/theme.ts`, `global.css`, `tailwind.config.js` (`npm run lint:tokens`).
- Touch targets stay 44pt (existing `Button` sizes). Errors use `ERROR_COPY` / `AppError` from `src/features/errors.ts`.
- Interim polling: `SESSION_POLL_MS = 10_000` on the session query only; remove it when step 4 adds Realtime.
- `npm test` equivalent must pass at the end of every task. In a `.claude/worktrees` checkout run jest with a CLI override of the ignore lists (the config ignores that path).
- Do not push, apply migrations to a shared database, or change PR #21 without the owner's confirmation.

## Review Focus

1. A character that is in no campaign, or whose campaign query is loading or failed, must show no badge, no error text and fire no session query. (Tasks 2, 3)
2. A session query that errors must never break the sheet header or the campaign screen. (Tasks 2, 3)
3. An invited (not active) member must see no Open button; a GM who has no character must still see the controls on the campaign screen. (Task 4)
4. Ending a session that another member already ended must show the `no_active_session` copy and refresh to the true state, not leave a stale End button. (Tasks 1, 4)
5. Two members opening at once must end up showing the same single session. (Task 1)

---

## File Structure

- Modify `src/lib/query-client.ts` — add `qk.session`.
- Create `src/features/sessions/sessions.queries.ts` — hooks.
- Create `src/features/sessions/SessionBadge.tsx`, `src/features/sessions/SessionControls.tsx`.
- Modify `src/features/characters/sheet/SheetHeader.tsx`, `app/(app)/campaigns/[id].tsx`, `app/(app)/characters/[id]/campaign.tsx`.
- Modify `docs/superpowers/specs/2026-11-02-open-session-prd.md` — badges live in `SheetHeader`, not the tab layout.
- Tests under `__tests__/features/sessions/`; adjust mocks in `__tests__/features/campaigns/detail.test.tsx` and sheet tests that now reach the new hooks.

### Task 1: Query layer

**Files:** Modify `src/lib/query-client.ts`; Create `src/features/sessions/sessions.queries.ts`; Test `__tests__/features/sessions/sessions.queries.test.tsx`.

**Interfaces:**
- Consumes: `getActiveSession`, `openSession`, `endSession`, `Session` from `sessions.api.ts`.
- Produces: `qk.session(campaignId: string)`; `SESSION_POLL_MS: number`; `useActiveSession(campaignId: string | undefined)` (disabled when undefined, polls every `SESSION_POLL_MS`); `useOpenSession(campaignId: string)` and `useEndSession(campaignId: string)` (`useMutation`, `mutate(sessionId)` for end).

- [ ] **Step 1: Write failing tests** (mock `sessions.api`, wrap in `QueryClientProvider` via `makeTestQueryClient`): `useActiveSession(undefined)` never calls the api; with an id it returns the row and `null` when none; `useOpenSession` success writes the returned row to `qk.session(id)`; two `open` calls resolving the same row leave one cached session; `useEndSession` success sets the cache to `null`; `useEndSession` rejecting with `AppError('no_active_session')` invalidates `qk.session(id)` (refetch shows the truth) and exposes the error.
- [ ] **Step 2: Run to verify they fail** (module not found).
- [ ] **Step 3: Implement** the key, constant and three hooks; `onError` for end invalidates the session query.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: session query hooks`.

### Task 2: `SessionBadge` and `useCharacterSession`

**Files:** Create `src/features/sessions/SessionBadge.tsx`; Modify `src/features/sessions/sessions.queries.ts`; Test `__tests__/features/sessions/SessionBadge.test.tsx`.

**Interfaces:**
- Consumes: `useCharacterCampaign(characterId)` (existing), `useActiveSession` from Task 1.
- Produces: `useCharacterSession(characterId: string | undefined): Session | null` (null while loading, on error, or with no campaign); `SessionBadge()` (no props) rendering the badge for the current sheet's character via `useCharacterRouteId()`, or `null`.

- [ ] **Step 1: Write failing tests:** renders `Session: Active` with an accessibility label when a session exists; renders nothing with no campaign (and `getActiveSession` is never called); renders nothing while the campaign is loading; renders nothing and no error text when the session query rejects.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the hook (campaign id from `useCharacterCampaign(...).data?.id` feeds `useActiveSession`) and a `Badge` with a `bg-resource-sage` dot.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: session status badge`.

### Task 3: Show the badge on every sheet tab

**Files:** Modify `src/features/characters/sheet/SheetHeader.tsx`, the PRD note; adjust sheet-test mocks; Test `__tests__/features/sessions/sheet-badge.test.tsx`.

**Interfaces:** Consumes `SessionBadge` (Task 2). Produces: `SheetHeader` renders `<SessionBadge />` in its nav row on all tabs; no new props.

- [ ] **Step 1: Write failing tests:** with an active session, `SheetHeader` shows `Session: Active` on each of Character, Actions, Inventory, Campaign (render each tab screen, or `SheetHeader` with each tab's props); with no session none shows it; Level up and Back still render.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the mount in the `NavRow` (badge between Back and Level up, wrapping safely at 2× font scale); fix existing tests that now need `QueryClientProvider` or a mocked `sessions.api`; update the PRD sentence that said the badges render in the tab layout.
- [ ] **Step 4: Run the full suite** — every pre-existing sheet test still passes.
- [ ] **Step 5: Commit** `feat: session badge in the sheet header`.

### Task 4: `SessionControls` on campaign detail and the Campaign tab

**Files:** Create `src/features/sessions/SessionControls.tsx`; Modify `app/(app)/campaigns/[id].tsx`, `app/(app)/characters/[id]/campaign.tsx`, `__tests__/features/campaigns/detail.test.tsx`; Test `__tests__/features/sessions/SessionControls.test.tsx`.

**Interfaces:**
- Consumes: Task 1 hooks; `CampaignFull` (members, `gm_id`); `useAuth().user`.
- Produces: `SessionControls({ campaign }: { campaign: CampaignFull })`.

- [ ] **Step 1: Write failing tests:** active member with no session sees `Open session`, pressing it calls `openSession(campaign.id)` and then shows the active state; invited member sees nothing; GM with no character sees `Open session`; with an active session the opener sees `End session` and a non-opener non-GM does not; the GM sees it for a session they did not open; pressing End opens the confirm dialog with the verbatim copy, Cancel closes without calling the api, confirm calls `endSession(session.id)`; an `endSession` rejection of `no_active_session` shows `ERROR_COPY.no_active_session`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** with `Button` (primary for Open, `destructive` variant for End) and the existing `Dialog` pattern from the characters screen; mount in the campaign detail screen under the badges and in the Campaign tab under `CampaignCard`; update `detail.test.tsx` to mock `sessions.api`.
- [ ] **Step 4: Run the full suite** and `npm run lint:tokens`.
- [ ] **Step 5: Commit** `feat: open and end session controls`.

### Task 5: Verify in the app

- [ ] **Step 1:** With the owner's go-ahead, apply the step-1 migrations to a **local** stack that is not the shared one (or accept a `supabase db reset` on the owner's own stack), then run Expo web (`npx expo start --web`) with two accounts, one GM and one player with a character in the campaign.
- [ ] **Step 2:** Walk it: player opens a session → GM sees the badge within ~10s on all four sheet tabs; GM ends it → badge disappears for the player; a player who is not the opener has no End button; ending twice shows the ended-session copy. Record what was and wasn't checked (iOS/Android not covered) in the PR.

## Self-Review

- **Spec coverage:** PRD P0 item 1 (open/end, one session, GM/opener ends) → Tasks 1, 4; item 2 (badge on all four tabs, hidden otherwise) → Tasks 2, 3. `Enter combat` / `In combat` badges (step 3), turn banner (step 4) and Realtime are deliberately out.
- **Names:** `useActiveSession`, `useOpenSession`, `useEndSession`, `useCharacterSession`, `SessionBadge`, `SessionControls` match across tasks.
- **Open question carried:** the badge mounts in `SheetHeader` (one place, already on all tabs) instead of the tab layout the PRD named; Task 3 corrects the PRD.
