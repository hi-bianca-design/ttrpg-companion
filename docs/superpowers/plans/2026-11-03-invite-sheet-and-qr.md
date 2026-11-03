# Invite Sheet and QR Join Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-visible invite-code card on the GM's campaign screen with a header button that opens a sheet holding the code, Copy, Share and a QR code; scanning the QR (or opening the shared link) lands the player on the Join screen with the code prefilled.

**Architecture:** A pure `inviteLink` module builds and parses `/campaigns/join?code=XXXXXX` links. `InviteSheet` (built on the existing `Sheet`) replaces `InviteCode`. The Join screen reads a `code` param. `RootRedirect` is extracted from `app/_layout.tsx` so it can remember a join code across the login redirect (AsyncStorage, take-once) and resume the join after sign-in. No database change.

**Tech Stack:** Expo Router 6 (scheme `session-zero`, web output `single` with a Vercel catch-all rewrite), `react-qr-code` (MIT, renders through `react-native-svg`, already a dependency), `expo-clipboard`, RN `Share` (native) / `navigator.share` (web), jest-expo + RNTL.

**Spec:** No separate design doc. Bianca skipped the brainstorm questions; the decisions below were made by the planner and are open to her override. They are the spec.

## Decisions (planner's calls, flagged for Bianca)

1. **Entry point:** a trailing icon button (`QrCode` glyph, label "Invite players") in the campaign screen's `NavRow`, GM only. The inline card goes away, so the campaign screen gets one card shorter.
2. **Sheet, not a centered dialog:** uses `Sheet`/`SheetContent`/`SheetTitle` from `src/components/ui/sheet.tsx`, like `AdjustSheet`. Contents, top to bottom: title "Invite players", the QR (when a link is available), the code in `font-plex` `stat`, then a Copy button and a Share button (full width, 44pt).
3. **QR encodes a web link, not a bare code:** `https://<origin>/campaigns/join?code=ABC123`. A phone camera opens the browser, which runs the web build of the app and works with no install. On web the origin is `window.location.origin`; on native it is `process.env.EXPO_PUBLIC_WEB_URL`. If that is unset on native, the QR is hidden and Share sends the code alone (never a broken link). Opening the *native* app from a scanned link needs universal links / app links (a domain, `associatedDomains`, `assetlinks.json`); that is **out of scope** and a follow-up. The custom scheme `session-zero://campaigns/join?code=…` already works for anyone who has the app and taps it, since Expo Router resolves it.
4. **A link prefills, it never joins:** the Join screen still needs a character choice and a tap on Join. Nobody is added to a campaign just by opening a link.
5. **Signed out:** the code is stashed in AsyncStorage before `RootRedirect` sends the visitor to login, and taken (read and cleared) on the first redirect into the app after sign-in or sign-up, which lands on `/(app)/campaigns/join?code=…`. It survives an email-confirmation reload; it is cleared on use, so it can never prefill twice.
6. **Safe to share?** The link carries exactly what the code carries: anyone holding either can join. QR adds no new exposure. Rotation, expiry and a "Reset code" action (needs a migration and `join_campaign` changes) are **out of scope**; flag as the follow-up if Bianca wants invites revocable. Pre-existing and also out of scope: `join_campaign` has no rate limit on guesses (36^6 codes).
7. **Web preview:** works. The QR renders with `react-native-svg`'s web build; Copy uses `expo-clipboard` (already degrades to a "Couldn't copy" message); Share is shown only if `navigator.share` exists (mobile browsers), otherwise hidden. Dev preview origin is `window.location.origin` (e.g. `http://localhost:8081`), so a phone on the same network cannot scan it unless the dev server is reachable; that is expected.
8. **Night Vigil:** tokens only (`THEME_COLORS.ink` modules on a `THEME_COLORS.foreground` plate, for scanner contrast; the plate is a `rounded-sm` square, never `rounded-full`), no red, 44pt targets.

## Global Constraints

- Tokens only: no hex or `rgb(` in `app/` or `src/features/` (`npm run lint:tokens` is part of `npm test`).
- No `rounded-full`; the header and sheet buttons have a 44pt hit area (follow how `Button size="icon"` and `CancelButton` get 44pt via `hitSlop`; verify in `src/components/ui/button.tsx` and assert in tests).
- Red (`destructive` tone) only for errors; the sheet's only error is "Couldn't copy".
- Invite code format is `^[A-Z0-9]{6}$` (`CODE_LENGTH = 6` in `join.tsx`).
- Do not touch the hosted database or add a migration.
- Run `npm test` (token lint + jest) and `npx tsc --noEmit` before each commit that touches `.ts(x)`.

## Review Focus

1. Join link opened with a lowercase, padded or too-long code (`?code=ab12cd%20`, `?code=ABCDEFGH`): prefill is sanitized exactly like typing; never throws.
2. Link opened signed out, then the visitor signs up (not logs in): the code still resumes to Join once.
3. A stale stashed code must not prefill a later, unrelated sign-in (take-once).
4. `EXPO_PUBLIC_WEB_URL` unset on native, or with a trailing slash: no broken QR and no `//campaigns` double slash.
5. `navigator.share` missing, or Share rejected because the user cancelled: no error toast on cancel, button hidden when unsupported.

---

### Task 1: Install the QR library and add the invite-link module

**Files:**
- Modify: `package.json`, `package-lock.json` (`npm install react-qr-code`)
- Create: `src/features/campaigns/inviteLink.ts`
- Test: `__tests__/features/campaigns/inviteLink.test.ts`

**Interfaces:**
- Produces:
  - `inviteOrigin(): string | null` (web: `window.location.origin`; native: `process.env.EXPO_PUBLIC_WEB_URL` with trailing slashes stripped, `null` if unset or empty)
  - `buildInviteLink(code: string, origin?: string | null): string | null` (defaults `origin` to `inviteOrigin()`; `null` when no origin)
  - `parseInviteCode(raw: unknown): string` (uppercase, strip non-`[A-Z0-9]`, cap 6; non-strings and arrays give `''`, arrays give their first element's result)
  - `inviteShareMessage(code: string, link: string | null): string`

- [ ] **Step 1: Confirm the library fits.** Run `npm view react-qr-code license version peerDependencies`; expected `MIT` and a `react` peer only. Then `npm install react-qr-code`. Check `git diff package.json` shows only that one dependency.

- [ ] **Step 2: Write the failing tests** in `__tests__/features/campaigns/inviteLink.test.ts`:
  - `buildInviteLink('ABC123', 'https://sz.example')` equals `'https://sz.example/campaigns/join?code=ABC123'`.
  - A trailing-slash origin `'https://sz.example/'` gives the same URL (no `//campaigns`).
  - `buildInviteLink('ABC123', null)` is `null`.
  - `parseInviteCode('ab12cd ')` is `'AB12CD'`; `'ABCDEFGH'` is `'ABCDEF'`; `undefined`, `42` and `''` give `''`; `['xy9z88', 'q']` gives `'XY9Z88'`.
  - `inviteShareMessage('ABC123', link)` contains both the code and the link; with `null` it contains the code and no `http`.
  - `inviteOrigin()` on native (mock `Platform.OS = 'ios'`) reads `process.env.EXPO_PUBLIC_WEB_URL`, strips a trailing slash, and returns `null` when it is unset.

- [ ] **Step 3: Run to verify failure:** `npx jest __tests__/features/campaigns/inviteLink.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/features/campaigns/inviteLink.ts`** with the signatures above. The path is the literal `/campaigns/join` (the route under the `(app)` group), query param name `code`. Message copy: `Join my campaign on Session Zero. Invite code: ABC123` plus a newline and the link when present.

- [ ] **Step 5: Run to verify pass** (same command), then `npx tsc --noEmit`.

- [ ] **Step 6: Commit:** `git add package.json package-lock.json src/features/campaigns/inviteLink.ts __tests__/features/campaigns/inviteLink.test.ts && git commit -m "feat(campaigns): invite link builder and code parser"`

### Task 2: Join screen reads a prefilled `code`

**Files:**
- Modify: `app/(app)/campaigns/join.tsx` (the `useLocalSearchParams` type at line 18 and the `code` state at line 22)
- Test: `__tests__/features/campaigns/join.test.tsx` (extend; it already mocks `useLocalSearchParams` as a `jest.fn`)

**Interfaces:**
- Consumes: `parseInviteCode` from Task 1.
- Produces: `/(app)/campaigns/join?code=ABC123` shows `ABC123` in the "Invite code" input.

- [ ] **Step 1: Write failing tests** in `join.test.tsx` (mock `useLocalSearchParams` to return `{ code: 'ab12cd ' }`): the input with label "Invite code" has value `AB12CD`; with `{ code: 'ABCDEFGH' }` the value is `ABCDEF`; with `{ code: ['xy9z88'] }` it is `XY9Z88`; with no param it is `''`; **Join is not auto-submitted** (`joinCampaign` not called after mount even once characters load); and a `code` param that changes while mounted updates the input (mirror the existing `characterId` effect).

- [ ] **Step 2: Run to verify failure:** `npx jest __tests__/features/campaigns/join.test.tsx -t "prefill"`. Expected: FAIL.

- [ ] **Step 3: Implement.** Initialise `code` with `parseInviteCode(params.code)` and add a `useEffect` on `params.code` that sets it when the parsed value is non-empty, matching the existing `characterId` effect.

- [ ] **Step 4: Run the whole file** `npx jest __tests__/features/campaigns/join.test.tsx`. Expected: all PASS.

- [ ] **Step 5: Commit:** `git commit -am "feat(campaigns): prefill join code from the link"`

### Task 3: Remember a join code across sign-in

**Files:**
- Create: `src/features/campaigns/pendingJoin.ts`
- Create: `src/features/auth/RootRedirect.tsx` (moved out of `app/_layout.tsx` lines 36-50, exported as `RootRedirect`)
- Modify: `app/_layout.tsx` (import `RootRedirect`; remove the local function and the now-unused `useEffect`/`useRouter`/`useSegments` imports only if nothing else uses them)
- Test: `__tests__/features/campaigns/pendingJoin.test.ts`, `__tests__/features/auth/RootRedirect.test.tsx`

**Interfaces:**
- Produces:
  - `setPendingJoinCode(code: string): Promise<void>` (stores `parseInviteCode(code)`; ignores empty)
  - `takePendingJoinCode(): Promise<string | null>` (returns and removes; `null` if none)
  - `RootRedirect(): JSX.Element` with unchanged behaviour plus the two cases below.
- Consumes: `parseInviteCode` (Task 1); `useAuth`; `useRouter`, `useSegments`, `useGlobalSearchParams`, `Slot` from `expo-router`.

- [ ] **Step 1: Write failing tests for `pendingJoin`** using `@react-native-async-storage/async-storage/jest/async-storage-mock` via `jest.mock`: set then take returns the code once, and a second take returns `null`; `setPendingJoinCode('ab12cd ')` stores `AB12CD`; `setPendingJoinCode('')` stores nothing.

- [ ] **Step 2: Write failing tests for `RootRedirect`** (mock `useAuth`, `expo-router`, `pendingJoin`; assert on `router.replace` and the mocked stash functions):
  - signed out on `['(app)','campaigns','join']` with search param `code=AB12CD`: `setPendingJoinCode('AB12CD')` is called, then `replace('/(auth)/login')`.
  - signed out elsewhere with a `code` param (e.g. `['(app)','characters']`): no stash.
  - signed in while on an `(auth)` segment, with a pending code `AB12CD`: `replace({ pathname: '/(app)/campaigns/join', params: { code: 'AB12CD' } })`.
  - signed in on `(auth)` with no pending code: `replace('/(app)')` (existing behaviour).
  - `loading: true`: no redirect and no stash read.
  - take-once: after the redirect above, a re-render does not read a second code.

- [ ] **Step 3: Run both to verify failure:** `npx jest __tests__/features/campaigns/pendingJoin.test.ts __tests__/features/auth/RootRedirect.test.tsx`. Expected: FAIL.

- [ ] **Step 4: Implement `pendingJoin.ts`** (AsyncStorage key `session-zero:pending-join-code`) and **`RootRedirect.tsx`**. In the signed-out branch await `setPendingJoinCode` before `router.replace('/(auth)/login')`; in the signed-in branch await `takePendingJoinCode()` then replace. Use a ref so an async take cannot run twice for the same transition.

- [ ] **Step 5: Run to verify pass,** then the full suite `npm test` (the move must not change any existing layout or redirect test) and `npx tsc --noEmit`.

- [ ] **Step 6: Commit:** `git add src/features/campaigns/pendingJoin.ts src/features/auth/RootRedirect.tsx app/_layout.tsx __tests__ && git commit -m "feat(auth): resume a join link after sign-in"`

### Task 4: InviteSheet (code, Copy, Share, QR)

**Files:**
- Create: `src/features/campaigns/InviteSheet.tsx`
- Delete: `src/features/campaigns/InviteCode.tsx` (its Copy/"Copied"/"Couldn't copy" logic moves into the sheet; nothing else imports it once Task 5 lands, and no test references it today)
- Test: `__tests__/features/campaigns/InviteSheet.test.tsx`

**Interfaces:**
- Consumes: `buildInviteLink`, `inviteShareMessage` (Task 1); `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `@/components/ui/sheet`; `QRCode` default export of `react-qr-code`.
- Produces: `InviteSheet({ code, open, onOpenChange }: { code: string; open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element`

- [ ] **Step 1: Write failing tests** (render inside a `PortalHost`, as `join.test.tsx` does; mock `expo-clipboard`, `react-native`'s `Share.share` via `jest.spyOn`, and `react-qr-code` to a `Text` that prints its `value` prop):
  - with `open`, shows title "Invite players" and the code `ABC123`.
  - QR `value` equals `https://sz.example/campaigns/join?code=ABC123` when the origin is available (set `EXPO_PUBLIC_WEB_URL`, `Platform.OS = 'ios'`).
  - origin unavailable: no QR rendered, code still shown.
  - pressing "Copy invite code" calls `Clipboard.setStringAsync('ABC123')` and the label becomes "Copied"; a rejected clipboard shows "Couldn’t copy. Select the code instead." in destructive tone.
  - native: pressing "Share invite" calls `Share.share({ message: inviteShareMessage('ABC123', link) })`; a rejection (user cancelled) shows no error.
  - web (`Platform.OS = 'web'`): the Share button is absent when `navigator.share` is undefined; present and calling `navigator.share({ text, url })` when defined; an `AbortError` rejection is swallowed.
  - the Copy and Share buttons and the QR plate use no `rounded-full`, and each button has a 44pt hit area (`hitSlop`/`min-h-11`, matching how `Button` sets it).

- [ ] **Step 2: Run to verify failure:** `npx jest __tests__/features/campaigns/InviteSheet.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement `InviteSheet`.** QR plate: a `View` with `className="self-center rounded-sm bg-foreground p-4"` around `<QRCode value={link} size={176} fgColor={THEME_COLORS.ink} bgColor={THEME_COLORS.foreground} />`; give it `accessibilityLabel="QR code to join the campaign"`. Reuse the copy/timer/`failed` logic from `InviteCode.tsx` unchanged. Share: native `Share.share`, web `navigator.share` guarded by `typeof navigator !== 'undefined' && typeof navigator.share === 'function'`; catch and ignore rejections. Then delete `InviteCode.tsx`.

- [ ] **Step 4: Run to verify pass,** `npm test`, `npx tsc --noEmit` (tsc will flag the stale `InviteCode` import in `[id].tsx` until Task 5; commit Tasks 4 and 5 together if you want a green tree per commit, or leave `InviteCode.tsx` in place until Task 5 deletes it. Prefer the latter.)

- [ ] **Step 5: Commit** (without deleting `InviteCode.tsx` yet): `git add src/features/campaigns/InviteSheet.tsx __tests__/features/campaigns/InviteSheet.test.tsx && git commit -m "feat(campaigns): invite sheet with copy, share and QR"`

### Task 5: Header entry point on the campaign screen

**Files:**
- Modify: `app/(app)/campaigns/[id].tsx` (the `nav` constant at lines 33-37; replace `{isGm ? <InviteCode .../> : null}` at line 79; drop the `InviteCode` import)
- Delete: `src/features/campaigns/InviteCode.tsx`
- Test: `__tests__/features/campaigns/detail.test.tsx` (extend; `getCampaign` is already mocked with `gm_id: 'gm1'` and `invite_code: 'ABC123'`, and `useAuth` returns `gm1`)

**Interfaces:**
- Consumes: `InviteSheet` (Task 4). The sheet's open state lives in `CampaignDetailScreen` (`useState(false)`), rendered once, outside the loading/error branches' early returns only for the GM success path.

- [ ] **Step 1: Write failing tests** in `detail.test.tsx`: the GM sees a button labelled "Invite players" in the nav row and no inline "Invite code" label or `ABC123` text before opening; pressing it shows the sheet with `ABC123`; a player (mock `useAuth` as another user id) sees no "Invite players" button; the button has a 44pt hit area and is not `rounded-full`; loading and error states render no invite button (GM-ness is unknown until the campaign loads).

- [ ] **Step 2: Run to verify failure:** `npx jest __tests__/features/campaigns/detail.test.tsx`. Expected: new tests FAIL.

- [ ] **Step 3: Implement.** In the success branch build the `NavRow` with `BackButton` leading and, when `isGm`, a trailing `<Button variant="ghost" size="icon" accessibilityLabel="Invite players" onPress={() => setInviteOpen(true)}>` with the phosphor `QrCode` icon in `THEME_COLORS.accentForeground`; render `<InviteSheet code={data.invite_code} open={inviteOpen} onOpenChange={setInviteOpen} />` for the GM. Keep the loading/error `nav` as it is today (back button only). Delete `InviteCode.tsx`.

- [ ] **Step 4: Run to verify pass,** then `npm test` and `npx tsc --noEmit`.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(campaigns): move the invite code into a header-opened sheet"`

### Task 6: Manual verification and PR prep

**Files:** none (verification only; add `EXPO_PUBLIC_WEB_URL` to the README/env docs if the repo has an env example file).

- [ ] **Step 1: Web preview.** `npm run web`: as GM, the header button opens the sheet; QR renders; Copy works; Share is hidden on desktop Chrome. Open `/campaigns/join?code=ab12cd` in a new tab while signed in: input shows `AB12CD`. Repeat signed out: login appears, and after login the Join screen shows the code once; sign out and in again shows it empty.
- [ ] **Step 2: Scan test.** Point a phone camera at the QR on the web preview served over the LAN (or a deployed preview); the browser opens the Join screen with the code.
- [ ] **Step 3: Native (iOS simulator).** `EXPO_PUBLIC_WEB_URL=https://<preview-host> npm run ios`: sheet shows QR and the system share sheet opens from Share. With the variable unset: QR hidden, Share sends the code only. In Safari on the simulator run `xcrun simctl openurl booted "session-zero://campaigns/join?code=AB12CD"`: the app opens on Join prefilled.
- [ ] **Step 4:** Confirm with Bianca before pushing or opening the PR (her standing rule). The PR body follows her global template and `Closes` line only if a ticket exists; none is linked to this work, so ask her.

## Self-Review

- **Coverage:** entry point (T5), sheet contents (T4), QR payload (T1, T4), signed-out and no-session handling (T3), safe-to-share and rotation (Decisions 6, explicitly out of scope), web preview (Decision 7, T4 web cases, T6), library choice (T1 step 1), tokens and 44pt (Global Constraints, asserted in T4 and T5).
- **Names:** `parseInviteCode`, `buildInviteLink`, `inviteOrigin`, `inviteShareMessage`, `setPendingJoinCode`, `takePendingJoinCode`, `RootRedirect`, `InviteSheet` are used identically across tasks.
- **Review Focus mapping:** item 1 is T2 tests, item 2 is T3 (sign-up goes through the same `(auth)` to app redirect), item 3 is T3 take-once, item 4 is T1 tests, item 5 is T4 web/native share tests.
- **Known unknowns to check while executing:** that `react-qr-code` renders under jest-expo (mocked in tests, so also confirm it in T6 on web and iOS); that `Button size="icon"` gets a 44pt hit area (`hitSlop`) before relying on it.
