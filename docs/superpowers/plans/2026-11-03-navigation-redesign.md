# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Home screen, put Home first on both bottom bars, rename the sheet tabs (Sheet / Actions / Items / Party), restyle the bar as a floating frosted-glass plate, and drop the back arrow where Home replaces it.

**Architecture:** One shared `BottomNav` (floating, absolutely positioned, built on `ShapedSurface` glass) serves the root Tabs and the character-sheet Tabs. A small `NavInset` context tells `ScreenBackground` how much bottom space the visible bar needs, so screens never hide content behind it. Home is `app/(app)/index.tsx`, fed by existing queries (`useCharacters`, `useCampaigns`, per-campaign `useActiveSession`) through one pure selector.

**Tech Stack:** Expo Router (Tabs/Stack), React Navigation bottom-tabs 7, NativeWind, `expo-blur` via `ShapedSurface`, TanStack Query, Jest (`jest-expo`) + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-navigation-redesign-design.md`

**Running tests from this worktree:** `npx jest --testPathIgnorePatterns '/node_modules/' '/__tests__/helpers/' '/__tests__/scripts/fixtures/' <path>` (the repo config ignores `/.claude/worktrees/`, which would skip every test here; `modulePathIgnorePatterns` there may also need overriding with `--modulePathIgnorePatterns '/.superpowers/'`). If `node_modules` is missing, it resolves from the main checkout two levels up; if not, symlink it.

## Global Constraints

- Night Vigil: tokens only (`THEME_COLORS` / Tailwind classes), no `rounded-full` on the bar (the old `nav-pill` goes away), red only for destructive/error, 44pt minimum touch targets.
- Bar corners use the existing `chamfer` shape of `ShapedSurface`; glass level `overlay`.
- Root bar items, in order: Home, Characters, Campaigns, Homebrew, Account (Account is a button that opens `AccountDrawer`, not a route).
- Sheet bar items, in order: Home, Sheet, Actions, Items, Party. Route files keep their names (`index`, `actions`, `inventory`, `campaign`); only labels change.
- No bar and no Home in the character creation wizard (`characters/new`); it keeps its Cancel.
- `level-up`, `shop` and the wizard keep their back arrow / Cancel. Only `SheetHeader` and `campaigns/[id].tsx` lose `BackButton`.
- No new backend or persistence.
- Run `npm run lint:tokens` and `npx tsc --noEmit` before the final commit; no new tsc errors.

## Review Focus

1. Home with zero characters and zero campaigns: each section shows its empty state with an action, not a blank screen (Task 5).
2. One campaign's session query fails or is loading: Home still renders everything else (Task 5).
3. A session is in combat but the turn belongs to someone else: card says live, not "your turn" (Task 5).
4. Deep link straight into a character (no history): Home on the sheet bar still works (Task 4).
5. Narrow phone (~360pt) with five labels: labels stay one line and truncate, never wrap or overflow (Task 2).
6. Content never ends under the floating bar: scroll screens get bottom space when a bar is shown and none when it is hidden (Task 1).

## File Structure

- Create `src/components/ui/nav-inset.tsx`: bar-height constants, `NavInsetContext`, `useNavInset()`.
- Modify `src/components/ui/bottom-nav.tsx`: floating glass bar, tablet active state, optional `leading` item.
- Modify `src/lib/theme.ts`: `TAB_BAR_CONTENT_HEIGHT` for the new bar + gap.
- Modify `src/components/game/ScreenBackground.tsx`: bottom padding from `useNavInset()`.
- Modify `app/(app)/_layout.tsx`: visible Home tab, provider, `backBehavior="initialRoute"`.
- Modify `app/(app)/characters/[id]/_layout.tsx`: labels, Home leading item, provider.
- Create `src/features/home/selectUpNext.ts`, `src/features/home/UpNextCard.tsx`, `src/features/home/useHomeData.ts`; rewrite `app/(app)/index.tsx` as the Home screen.
- Modify `src/features/characters/sheet/SheetHeader.tsx`, `app/(app)/characters/[id]/campaign.tsx` (eyebrow), `app/(app)/campaigns/[id].tsx` (last, minimal; PR 43 also edits it), `src/components/game/HeaderNav.tsx` (doc comment).
- Tests under `__tests__/` mirroring paths; existing tests listed per task are updated, not deleted.

---

### Task 1: NavInset context and bottom space

**Files:**
- Create: `src/components/ui/nav-inset.tsx`
- Modify: `src/lib/theme.ts` (`TAB_BAR_CONTENT_HEIGHT`), `src/components/game/ScreenBackground.tsx:41`
- Test: `__tests__/components/ui/nav-inset.test.tsx`, existing ScreenBackground test

**Interfaces:**
- Produces: `export const NAV_BAR_HEIGHT = 56`, `export const NAV_BAR_GAP = 12`; `export const NavInsetContext: React.Context<boolean>` (default `false` = no bar); `export function useNavInset(): number` returning `0` when no bar, else `NAV_BAR_HEIGHT + NAV_BAR_GAP + safeAreaBottom`. `TAB_BAR_CONTENT_HEIGHT` becomes `NAV_BAR_HEIGHT + NAV_BAR_GAP` (68).

- [ ] **Step 1: Write failing tests** in `nav-inset.test.tsx`: `useNavInset` returns `0` with no provider and with `value={false}`; returns `56 + 12 + 34` inside `value={true}` with `SafeAreaProvider initialMetrics` bottom inset 34. A `ScreenBackground scroll` rendered inside `value={true}` has a content wrapper whose style/className adds that bottom space (assert through a `testID="screen-content"` you add), and with no provider keeps today's `pb-8`.
- [ ] **Step 2: Run to see failure** (module missing).
- [ ] **Step 3: Implement `useNavInset(): number`** in `nav-inset.tsx` using `useSafeAreaInsets`; give `ScreenBackground`'s content `View` `testID="screen-content"` and `style={{ paddingBottom: 32 + inset }}` when inset > 0 (keep `pb-8` otherwise).
- [ ] **Step 4: Run test to verify pass**, plus existing ScreenBackground tests.
- [ ] **Step 5: Commit** `feat(nav): reserve bottom space for a floating bar`.

### Task 2: Floating glass BottomNav

**Files:**
- Modify: `src/components/ui/bottom-nav.tsx`
- Test: `__tests__/components/ui/bottom-nav.test.tsx` (rewrite the pill and `border-t` tests)

**Interfaces:**
- Consumes: `NAV_BAR_HEIGHT`, `NAV_BAR_GAP` (Task 1); `ShapedSurface` props `glass="overlay"`, `shape="chamfer"`.
- Produces: `BottomNav` props `BottomTabBarProps & { leading?: ExtraNavItem; extra?: ExtraNavItem }`. `leading` renders before the routes as a `role="button"`, never active. The wrapper has `testID="bottom-nav"`, `position: 'absolute'`, `left/right: 12`, `bottom: max(insets.bottom, 8)`... (use `NAV_BAR_GAP` above the safe area). Active tab has `testID="nav-active"` (replaces `nav-pill`).

- [ ] **Step 1: Write failing tests**: (a) the bar is absolutely positioned (`style` flattens to `position: 'absolute'`); (b) exactly one `nav-active`, and none for `leading`/`extra`; (c) no element uses `rounded-full`; (d) every item's Pressable is at least 44 high (`minHeight: 44`); (e) labels have `numberOfLines={1}`; (f) `leading` renders first and fires its `onPress`; (g) the existing hidden-screen, tabPress/navigate and extra-button tests still pass.
- [ ] **Step 2: Run to see failure.**
- [ ] **Step 3: Implement the restyle.** Bar = `ShapedSurface glass="overlay" shape="chamfer" fill="rockDeep" stroke="border"` with the existing drop shadow style; items are flex-1 columns, icon 22 over caption label; active item = inner plate `fill="primary"`-tinted at low opacity with `stroke="rule"` (gold edge), label/icon colour `highlightText`; inactive `mutedForeground`.
- [ ] **Step 4: Run tests to verify pass.**
- [ ] **Step 5: Commit** `feat(nav): floating frosted-glass bottom bar`.

### Task 3: Root layout with Home tab

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Test: `__tests__/app/app-layout.test.tsx`

**Interfaces:**
- Consumes: `NavInsetContext`, `BottomNav`.
- Produces: root Tabs screen `index` visible, title `Home`, icon `House` (Phosphor, duotone), listed first; `backBehavior="initialRoute"` on `Tabs`; the whole `Tabs` is wrapped in `NavInsetContext.Provider value={!hideTabBar}`.

- [ ] **Step 1: Write failing tests** (extend the existing mocked-`Tabs` test): the captured screens include `index` with `title: 'Home'` and no `href: null`; `Tabs` receives `backBehavior="initialRoute"`; the provider value is `false` for `['(app)','characters','new']` and `['(app)','characters','[id]']`, `true` for `['(app)','campaigns','[id]']` and `['(app)']`. Existing hide/show tests stay.
- [ ] **Step 2: Run to see failure.**
- [ ] **Step 3: Implement** the changes above; keep Account as the `extra` item.
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** `feat(nav): Home is the first root tab`.

### Task 4: Character sheet bar: Home plus renamed tabs

**Files:**
- Modify: `app/(app)/characters/[id]/_layout.tsx`, `app/(app)/characters/[id]/campaign.tsx:27` (eyebrow "Campaign" → "Party")
- Test: `__tests__/app/character-sheet-layout.test.tsx` (new), `__tests__/features/characters/sheet/campaign-tab.test.tsx` (eyebrow)

**Interfaces:**
- Consumes: `BottomNav` `leading` prop, `NavInsetContext`.
- Produces: tab labels Sheet / Actions / Items / Party; `leading={{ label: 'Home', icon: House, onPress }}` where `onPress = () => router.replace('/(app)')`; `NavInsetContext.Provider value` is `true` around the sheet `Tabs`.

- [ ] **Step 1: Write failing tests** with a mocked `Tabs` capturing screen options and `tabBar`: labels are exactly `['Sheet','Actions','Items','Party']` for routes `index, actions, inventory, campaign`; rendering the captured `tabBar` shows a Home button first; pressing it calls `router.replace('/(app)')` (deep-link case: works when `router.canDismiss()` is false). Update the campaign-tab test to expect eyebrow `Party`.
- [ ] **Step 2: Run to see failure.**
- [ ] **Step 3: Implement** labels, `leading`, provider.
- [ ] **Step 4: Run to verify pass**, plus other sheet tests that may match on old labels (`grep -rn "Inventory\|'Character'" __tests__`).
- [ ] **Step 5: Commit** `feat(nav): sheet bar gets Home and renamed tabs`.

### Task 5: Home screen

**Files:**
- Create: `src/features/home/selectUpNext.ts`, `src/features/home/useHomeData.ts`, `src/features/home/UpNextCard.tsx`
- Modify: `app/(app)/index.tsx`
- Test: `__tests__/features/home/selectUpNext.test.ts`, `__tests__/app/home.test.tsx`

**Interfaces:**
- Produces:
  - `type UpNext = { kind: 'turn'; campaign: CampaignSummary } | { kind: 'live'; campaign: CampaignSummary } | { kind: 'recent'; character: CharacterSummary } | { kind: 'none' }`
  - `selectUpNext(input: { userId: string | undefined; campaigns: CampaignSummary[]; sessions: Record<string, Session | null | undefined>; characters: CharacterSummary[] }): UpNext`. Priority: a campaign whose session has `in_combat && current_turn_user_id === userId` → `turn`; else any campaign with a non-null session → `live`; else first character (list is already newest-updated first) → `recent`; else `none`.
  - `useHomeData(): { characters, campaigns, sessions, isLoading, isError }` using `useCharacters`, `useCampaigns`, and `useQueries` over campaigns with the same keys/fns as `useActiveSession` (`qk.session(id)`, `getActiveSession`, `refetchInterval: SESSION_POLL_MS`); a failed or pending session query yields `undefined` for that campaign only.
  - `UpNextCard({ upNext: UpNext })`: gold-bordered card (`Card` with accent border token); copy and action: `turn` → "Your turn" tag + campaign name + button "Open turn" → `/(app)/campaigns/[id]`; `live` → "Live" tag + "Open session" → same route; `recent` → "Pick up where you left off" + character name + "Open character" → `/(app)/characters/[id]`; `none` renders null.
- Home screen sections, top to bottom: greeting, `UpNextCard`, "Characters" list, "Campaigns" list (rows show a LIVE badge when that campaign has a session). Rows push to the existing character / campaign routes. Empty states reuse `EmptyState` with actions "Create character" (`/(app)/characters/new`) and "Join or create a campaign" (`/(app)/campaigns`).

- [ ] **Step 1: Write failing selector tests** for each priority branch, including Review Focus 3 (in combat, turn held by another user → `live`) and sessions undefined/null (→ falls through to `recent`/`none`).
- [ ] **Step 2: Run to see failure.**
- [ ] **Step 3: Implement `selectUpNext`.**
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Write failing screen tests** (`home.test.tsx`, mocking the query hooks like `characters.test.tsx` does): shows UpNext "Your turn" card with "Open turn"; empty accounts show both empty states with their actions (Review Focus 1); one campaign's session errored while others loaded still renders every list (Review Focus 2); a character row press navigates to its sheet.
- [ ] **Step 6: Run to see failure.**
- [ ] **Step 7: Implement `useHomeData`, `UpNextCard`, and the Home screen** (replace the `Redirect`), using `ScreenBackground scroll`, `Text`, `Card`, `Badge` and existing tokens; loading state uses the skeleton pattern from `characters/index.tsx`.
- [ ] **Step 8: Run to verify pass.**
- [ ] **Step 9: Commit** `feat(home): Home screen with up-next card`.

### Task 6: Remove back arrows where Home replaces them

**Files:**
- Modify: `src/features/characters/sheet/SheetHeader.tsx`, `src/components/game/HeaderNav.tsx` (doc comment lists), `app/(app)/campaigns/[id].tsx` (last; minimal)
- Test: `__tests__/features/characters/sheet/*.test.tsx`, `__tests__/features/campaigns/detail.test.tsx`, `__tests__/components/game/HeaderNav.test.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: `SheetHeader` renders no Back; the `NavRow` appears only when `onLevelUp && name`, with Level up at the trailing edge. `campaigns/[id].tsx` renders no `BackButton` in loading, error or loaded states; the loaded header's `NavRow` keeps Invite (GM only) at the trailing edge and is omitted when empty. The `back` helper and `useReturnToSheet` import are deleted from this screen if unused.

- [ ] **Step 1: Update failing tests**: assert `queryByRole('button', { name: 'Back' })` is null on each sheet tab and on the campaign screen (all three states); Level up and Invite still render; `level-up`, `shop` and wizard tests still expect Back.
- [ ] **Step 2: Run to see failure.**
- [ ] **Step 3: Implement** the removals; change the `HeaderNav` doc comment so "pushed screens" no longer lists sheet and campaign detail.
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** `feat(nav): drop the back arrow on sheet and campaign screens`.

### Task 7: Whole-suite verification

- [ ] **Step 1:** Run the full Jest suite with the worktree overrides; expect all passing.
- [ ] **Step 2:** `npx tsc --noEmit` shows no new errors versus `origin/main`; `npm run lint:tokens` passes.
- [ ] **Step 3:** Start the web build (`npx expo start --web`) and check: bar floats and blurs over scrolling content, last list item clears the bar, Home from inside a sheet, deep link into `/characters/<id>` then Home, wizard shows no bar.
- [ ] **Step 4:** Write the honest verification note (what ran, what only the web build showed, native blur and notched-iPhone safe area not checked on device) into the commit body of the final commit and tell Bianca; do not push or open a PR without asking.
