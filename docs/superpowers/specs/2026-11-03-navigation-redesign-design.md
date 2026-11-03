# Navigation redesign: Home, floating bar, renamed sheet tabs

Owner and designer: Bianca. Decisions below are hers unless marked **(my call)**.

## Intent

Two problems today:

1. A back-button row sits at the top of sheet screens and costs vertical space. A Home button replaces it.
2. Two different bottom bars (root: Characters / Campaigns / Homebrew + Account; inside a character: Character / Actions / Inventory / Campaign) are confusing, and "Campaigns" vs "Campaign" collide.

The bar itself also doesn't match the app's look: the current icon-over-label bar with a soft pill feels off-brand, and earlier versions were too bulky.

## Goals

- Home is the first slot on **both** bars.
- Inside a character the tabs read **Home, Sheet, Actions, Items, Party** (Character→Sheet, Inventory→Items, Campaign→Party).
- The root bar reads **Home, Characters, Campaigns, Homebrew, Account** (five). Account stays a drawer item, as today.
- Home is a real screen, not a redirect to Characters.
- One shared bar component styled to match the app, slimmer than before, floating above content.
- The back arrow (`BackButton` in `src/components/game/HeaderNav.tsx`, used by `SheetHeader` and the campaign screen) is removed wherever Home replaces it. Cancel stays on modal-like flows.

## Non-goals / anti-goals

- No redesign of other screens' content beyond adding bottom space for the floating bar.
- Not a failure-if: the bar becomes bulky again, uses rounded-full (except the existing nav pill/sheet grabber exceptions, which this design removes for the bar), or red for anything non-destructive.
- No new backend. Home reads existing queries (characters, campaigns, session/turn state).

## Constraints

Night Vigil design system: tokens only, no rounded-full, red only for destructive/error, 44pt touch targets. Expo Router; root Tabs in `app/(app)/_layout.tsx`, nested sheet Tabs in `app/(app)/characters/[id]/_layout.tsx`, campaigns Stack. Test-first. Avoid colliding with open work: PR 43 (`app/(app)/campaigns/[id].tsx`), the turn-banner spacing branch, and the Realtime sessions work in `src/features/sessions/`.

## The bar (decided)

- **Frosted glass, floating.** Built on the app's existing `ShapedSurface` glass plate (chamfer shape, overlay glass level), lifted off the bottom edge with a gap and shadow, inset from the sides, content scrolling beneath. Mockup option "Glass".
- Five slots, icon over label, each slot at least 44pt tall. Overall bar about 56pt of content.
- Active tab is a gold-edged tablet (gold tint fill, gold rule border), square-ish corners, no pill. Inactive tabs use the muted foreground colour.
- Same component for both bars (extend `src/components/ui/bottom-nav.tsx`).
- Every screen under the bars needs bottom padding for the bar's height plus gap, and the toast sits above the bar (`TAB_BAR_CONTENT_HEIGHT` in `src/lib/theme.ts` updates accordingly).
- Native cannot clip a blur to the chamfer shape (see `shaped-surface.tsx`), so the native fill stays denser than web. Expected, not a bug.

## Home screen (decided: layout A, "Up-next first")

Top to bottom:

1. Greeting line.
2. **Up-next card** (hero, gold-bordered) for whatever needs the player now: "Your turn" or a live session, with a primary action (Open turn / Open session). When nothing is live it is calm: absent or a quiet "pick up where you left off" card (**my call**: show the most recently opened character).
3. **Characters** section: compact list of the player's characters.
4. **Campaigns** section: compact list of the player's campaigns (GM or player), with a small LIVE badge where a session is running.

Empty states: no characters / no campaigns each get a short message and a create/join action (**my call**: reuse the existing Characters/Campaigns empty-state copy).

## Behaviour (decided or my call)

- **Creation wizard:** no bar, as today. It keeps its own Cancel (dismisses to Characters). No Home there. *(decided)*
- Home tab on either bar goes to the root Home screen. From inside a character, Home leaves the character context entirely. **(my call)**
- **Deep links / web:** deep-linking straight into a character or campaign must still work; Home is one tap away on the bar so nothing needs a back arrow to escape. Browser back and Android hardware back follow normal stack/tab history; from a root tab, back returns to Home before exiting. **(my call: no custom back handling beyond this)**
- Screens that lose their back arrow because Home replaces it: sheet screens and the campaign screen. Modal flows keep Cancel.
- `app/(app)/index.tsx` stops redirecting and renders Home.

## Left to the builder

Icon choice for Home and the renamed tabs (existing Phosphor set), exact spacing/shadow values from tokens, how Home queries are composed, test structure.

## Verification expectations

Tests pass (jest with the worktree ignore override), `tsc` no new errors, and an honest note of what wasn't checked on device (blur on native, safe-area gap on notched iPhones, web).

## Settled after the builder check

From the code (not decisions):

- Root Tabs today: `index` and `shop` are hidden (`href: null`); Characters, Campaigns, Homebrew are tabs; Account is an `extra` button that opens `AccountDrawer`, not a route. Home becomes a visible first tab on `app/(app)/index.tsx`. The root bar is already hidden inside `characters/[id]` (which has its own bar) and `characters/new`.
- Session data is per campaign: `useActiveSession(campaignId)` (60s poll, `SESSION_POLL_MS`), `holdsTurn` in `src/features/sessions/turn.ts`, `useCampaigns()`. No new backend is needed.
- `BackButton` is used by `SheetHeader`, `campaigns/[id].tsx` (twice), `shop/index.tsx`, `characters/[id]/level-up.tsx` and the wizard step.

My calls (please check these):

1. **Up-next data:** Home calls `useCampaigns()` and `useActiveSession` per campaign, and uses `holdsTurn` to tell "your turn" from "live". It stays on the existing 60s poll; the Realtime sessions work will make it live without changes here. "Open turn" and "Open session" go to the campaign screen (Party tab of the character if the player has a character in that campaign, **my call**).
2. **Recent character:** the calm card shows the most recently *updated* character. No new persistence.
3. **Account slot:** stays an action button that opens the drawer; label truncates on one line at the caption size, icon always shown. Check fit at 360pt width.
4. **Which screens lose the back arrow:** sheet screens (`SheetHeader`) and the campaign screen, which keep/show the root bar. `level-up`, `shop` and the wizard keep their back/Cancel (modal-like or bar-less).
5. **Bottom space:** one shared constant/hook (bar height + gap + safe area), applied to every screen under the bars; toast offset uses the same value.
6. **Collisions:** build on a branch off `origin/main`; touch `campaigns/[id].tsx` last and minimally (remove the arrow, add bottom padding), and rebase after PR 43 / the turn-banner branch merge if they land first.
