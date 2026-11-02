# Night Vigil Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the app as a single dark "Night Vigil" screenprint design system (flat matte fills, hard shadows, pointed-end buttons/inputs, lancet-arch cards, grain, Cinzel + Cormorant Garamond) with no light mode.

**Architecture:** All colours stay CSS variables → Tailwind names → `THEME_COLORS` (JS mirror), collapsed to one palette. Shapes (hex ends, chamfer, arch), hard shadows and glow are drawn by one SVG primitive, `ShapedSurface`, driven by a pure `shapePath()` function, so the look is identical on iOS, Android and web. `Button`, `Input`, `Card` and the other `ui/` components compose it; screens re-skin through tokens.

**Tech Stack:** Expo 54, React Native 0.81, NativeWind 4, react-native-svg, jest-expo + @testing-library/react-native, `@expo-google-fonts/cinzel` and `@expo-google-fonts/cormorant-garamond` (new).

**Spec:** `docs/superpowers/specs/2026-11-02-night-vigil-design-system-design.md` (mockup: `docs/superpowers/mockups/2026-11-02-night-vigil-screenprint.html`). Read both before starting.

## Global Constraints

- Dark only. One palette in `:root`; no `.dark:root`, no `useColorScheme`, no OS-theme following (`app.json` `userInterfaceStyle` = `dark`, status bar light).
- Palette starting values (tune only to meet contrast): night `#0B1D20`, deep teal `#12383A`, sky teal `#1F6361`, ink `#070F15`, rock `#12212C`/`#0C1822`, moon gold `#E3B130` (primary, flat), mint ice `#9BD3C4` (secondary, labels, outline), bone `#E6D9B6` (text), torch `#F0902F` (lit/focus only), blood `#B8321F` / fill `#3A110C` / text `#F0B9A8` (destructive and error only), placeholder `#6B8F8A`, typed `#FFE08A`. Sky bands (top to bottom): `#2C7D74 #25726B #1E6360 #18524F #12403F #0E3334`.
- Red is never used for a non-destructive action. Torch is never a resting fill on buttons, inputs or chips (the only resting use is the light inside hero arch cards).
- Contrast: body and typed text ≥ 7:1 on their surface; large display text ≥ 4.5:1; placeholder ≥ 4.5:1 on the input well; button labels ≥ 4.5:1 on their fills.
- Touch targets stay 44pt (`h-11`; `sm`/`icon` keep 32pt with the existing 6px hitSlop). System font scaling cap of 2x stays.
- Spacing scale (0,1,2,3,4,6,8,11 → 0,4,8,12,16,24,32,44px), radii, and the nine type role sizes are unchanged. `npm test` (= `lint:tokens` then jest) must pass at the end of every task; no hex/rgb literals or arbitrary values outside `src/components/ui/`, `src/lib/theme.ts`, `global.css`, `tailwind.config.js`.
- Fonts: Cinzel = `display`, `title`, `heading`, new `eyebrow`, button/tab labels; Cormorant Garamond = new `narrative` variant (≥16px) and input values; Inter = `body`, `body-sm`, `subhead`, `caption`; IBM Plex Mono = `label`, `stat`, invite codes. Fraunces is removed.
- Shapes: hex ends 14px point depth on single-line surfaces (≤ 56pt tall); chamfer 8px for taller surfaces and multiline inputs; arch rise 54px for hero cards only. Hard shadow 3px right/down, zero blur; pressed = 2px translate with 1px shadow.
- Do not push or open a PR without the owner's confirmation. Commits are local.

## Review Focus

1. A surface measured at width 0 or height 0 (before first layout) or narrower than twice its point depth must produce a valid path, never `NaN`. (Task 3)
2. A multiline input that grows must re-measure and switch from hex to chamfer without remounting. (Tasks 3, 5)
3. React Native cannot style a placeholder separately from the value, so italic/light must be driven by whether the input currently has text, including uncontrolled inputs. (Task 5)
4. Two shapes on screen at once must not share SVG gradient/clip ids (web keeps several screens mounted). (Task 3)
5. Body text over the lightest sky bands can fall below contrast; every sky band must hold at least 4.5:1 with bone text and the page `background`/cards 7:1. (Task 1)
6. A disabled button must stay distinguishable without relying on colour alone (reduced opacity plus no glow and no press sink). (Task 4)

---

### Task 1: Single dark palette, remove light mode, contrast test

**Files:**
- Modify: `global.css`, `src/lib/theme.ts`, `tailwind.config.js`, `app.json`, `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/(app)/content/index.tsx`, `app/(app)/characters/index.tsx`, `app/(app)/characters/new/[step].tsx`, `app/(app)/characters/[id]/_layout.tsx`, `src/features/auth/AccountMenu.tsx`, `src/components/game/ScreenBackground.tsx`, `src/components/game/SectionHeader.tsx`, `src/components/game/ResourceTracker.tsx`, `src/components/ui/toggle-chip.tsx`, `__tests__/lib/theme-drift.test.ts`, `__tests__/lib/tailwind-config.test.ts`
- Delete: `src/lib/web-theme.ts`, `__tests__/lib/web-theme.test.ts`
- Create: `__tests__/helpers/contrast.ts`, `__tests__/lib/contrast.test.ts`, `__tests__/lib/single-theme.test.ts`

**Interfaces:**
- Produces: `THEME_COLORS: Record<string, string>` (flat, one palette; was `{light, dark}`); keys keep today's names and add `ink`, `rock`, `rockDeep`, `torch`, `torchGlow`, `secondary`, `secondaryForeground`, `well`, `placeholder`, `typed`, `sky1`..`sky6`. `SKY_BANDS: string[]` (the six band colours top→bottom, derived from `sky1`..`sky6`). `GLOW_STOPS` is removed. Tailwind colour names added: `ink`, `rock`, `torch`, `secondary`(+`.foreground`), `well`, `placeholder`, `typed`. `highlight`/`highlight-foreground` temporarily stay (set to the secondary mint values) until Task 4.
- `contrastRatio(fg: string, bg: string, under?: string): number` in `__tests__/helpers/contrast.ts`: WCAG ratio; `fg`/`bg` may be `rgba()`, composited over `under` (hex, default `#0B1D20`).

- [ ] **Step 1: Write failing tests.** `contrast.test.ts`: `foreground` on `background` ≥ 7; `foreground` on `card` (composited over `background`) ≥ 7; `typed` on `well` ≥ 7; `placeholder` on `well` ≥ 4.5; `primaryForeground` on `primary` ≥ 4.5; `secondaryForeground` on `secondary` ≥ 4.5; `accentForeground` and `labelForeground` on `rock` ≥ 4.5; `foreground` on each `sky1`..`sky6` ≥ 4.5. `single-theme.test.ts`: no file under `app/` or `src/` contains `useColorScheme`, `colorScheme.set`, or `.dark:root` (including `global.css`); `THEME_COLORS` has no `light`/`dark` keys. Rewrite `theme-drift.test.ts` to compare the single `:root` block only; extend `tailwind-config.test.ts` with the new colour names.
- [ ] **Step 2: Run** `npx jest __tests__/lib` — Expected: FAIL (palette and shape not changed yet).
- [ ] **Step 3: Implement.** Move the Night Vigil values from Global Constraints into one `:root` block in `global.css` (tune hex until the contrast tests pass; lighten/darken only the failing token); flatten `THEME_COLORS`; delete `GLOW_STOPS`; set `tabBarStyle` to take only `(bottomInset)`. Replace every `THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']` in the listed files with `THEME_COLORS`; delete `useColorScheme`/`colorScheme.set('system')`/`useDarkClassOnWeb` and the `NAV_THEME` light/dark split (`NAV_THEME` becomes one `Theme` with `dark: true`). `app.json`: `userInterfaceStyle: "dark"`. Add `<StatusBar style="light" />` in `app/_layout.tsx`. `ScreenBackground` only needs to compile here (Task 7 redraws it): keep a single flat `background` fill and remove the gradient.
- [ ] **Step 4: Run** `npm test` — Expected: PASS (all suites, lint:tokens clean).
- [ ] **Step 5: Commit** (include the spec, plan and `docs/superpowers/mockups/`): `git add -A && git commit -m "feat: single dark Night Vigil palette; remove light mode"`

### Task 2: Fonts and type variants

**Files:**
- Modify: `package.json`, `app/_layout.tsx`, `tailwind.config.js`, `src/components/ui/text.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/lib/theme.ts` (`TAB_LABEL_STYLE`, nav `fonts`), `__tests__/components/ui/text.test.tsx`

**Interfaces:**
- Produces: Tailwind families `font-display` (Cinzel_700Bold), `font-display-medium` (Cinzel_500Medium), `font-narrative` (CormorantGaramond_500Medium), `font-narrative-semibold` (CormorantGaramond_600SemiBold), `font-narrative-italic` (CormorantGaramond_400Regular_Italic), `font-plex`, `font-inter`, `font-sans-semibold`. `Text` variants add `narrative` (`font-narrative text-body`, 17px via `text-body`) and `eyebrow` (`font-display-medium text-label uppercase text-highlight-text`); `stat` becomes `font-plex text-stat`. (Verify the exact export names after install; adjust the family names to match.)

- [ ] **Step 1: Write failing tests** in `text.test.tsx`: `title` has `font-display`; `stat` has `font-plex` and not `font-display`; `eyebrow` has `font-display-medium`, `text-label`, `uppercase`; `narrative` has `font-narrative` and `text-body`; `label` still `font-plex`.
- [ ] **Step 2: Run** `npx jest __tests__/components/ui/text.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** `npm install @expo-google-fonts/cinzel @expo-google-fonts/cormorant-garamond`; remove `@expo-google-fonts/fraunces`; load `Cinzel_500Medium`, `Cinzel_700Bold`, `CormorantGaramond_500Medium`, `CormorantGaramond_600SemiBold`, `CormorantGaramond_400Regular_Italic` in `app/_layout.tsx` beside Inter/Plex; map families in `tailwind.config.js`; update `text.tsx`; `DialogTitle`/`SheetTitle` keep `font-display`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: Cinzel + Cormorant Garamond type system`

### Task 3: `shapePath` and `ShapedSurface` primitive

**Files:**
- Create: `src/lib/shape-path.ts`, `src/components/ui/shaped-surface.tsx`, `__tests__/lib/shape-path.test.ts`, `__tests__/components/ui/shaped-surface.test.tsx`

**Interfaces:**
- Produces: `type Shape = 'hex' | 'chamfer' | 'arch'`; `shapePath(shape: Shape, width: number, height: number, opts?: { point?: number; chamfer?: number; rise?: number; inset?: number }): string` (SVG path `d`; defaults point 14, chamfer 8, rise 54, inset 0; clamps depths to `min(depth, width/2, height/2)`; returns `''` when width or height ≤ 0).
- Produces: `ShapedSurface` props `{ shape?: Shape | 'auto'; fill: ThemeColorKey; stroke: ThemeColorKey; strokeWidth?: number /*2*/; shadowOffset?: number /*3*/; glow?: ThemeColorKey; light?: ThemeColorKey; children?: ReactNode; className?: string; testID?: string }` where `ThemeColorKey = keyof typeof THEME_COLORS`. `'auto'` (default) = `hex` when measured height ≤ 56, else `chamfer`. `light` draws a bottom-up radial gradient (arch hero cards). Renders an absolutely positioned `Svg` behind `children`, measuring itself with `onLayout`. Paint order: shadow path (ink, offset by `shadowOffset`), optional glow (three layered strokes at falling opacity), fill+stroke path, optional light gradient clipped to the fill path. Gradient ids come from `useId` (sanitised) so instances never collide.

- [ ] **Step 1: Write failing tests.** `shape-path.test.ts`: `hex` at 200×44 starts at `M14 0`, contains `L186 0` and points `200 22` and `0 22`; `chamfer` at 200×80 contains the 8px cuts (`M8 0`, `L200 8`); `arch` at 300×200 has its apex at `150 0` and shoulders at `y=54`; `shapePath('hex', 0, 44)` is `''`; `shapePath('hex', 10, 44)` contains no `NaN` and every x in `[0,10]`; `inset: 2` shifts the whole outline inward by 2. `shaped-surface.test.tsx`: after `fireEvent(node,'layout',{nativeEvent:{layout:{width:200,height:44}}})` the fill `Path` has the hex path; re-firing layout with height 120 switches it to the chamfer path with no remount (same node, `shape="auto"`); two instances rendered with `light` have different gradient ids; no `d` contains `NaN` before any layout event.
- [ ] **Step 2: Run** `npx jest __tests__/lib/shape-path.test.ts __tests__/components/ui/shaped-surface.test.tsx` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both files. Read the `d` values in the component test with `screen.UNSAFE_getAllByType(Path)`.
- [ ] **Step 4: Run** the same command — Expected: PASS. Then `npm test`.
- [ ] **Step 5: Commit:** `feat: ShapedSurface primitive (hex, chamfer, arch, hard shadow, glow)`

### Task 4: Button (and `highlight` → `secondary`)

**Files:**
- Modify: `src/components/ui/button.tsx`, `app/(app)/characters/new/[step].tsx:123`, `app/(app)/characters/[id]/level-up.tsx:124`, `src/features/characters/sheet/VitalsSection.tsx:78`, `global.css`, `tailwind.config.js`, `src/lib/theme.ts` (remove `highlight`, `highlightForeground`), `__tests__/components/ui/button.test.tsx`, `__tests__/lib/tailwind-config.test.ts`

**Interfaces:**
- Consumes: `ShapedSurface` (Task 3).
- Produces: `Button` keeps its props and `buttonVariants`/`buttonTextVariants` exports; variant union becomes `'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'`; adds `lit?: boolean` (torch glow). The root `Pressable` keeps `role="button"` and the `h-11`/`h-8`/`h-8 w-8` size classes and hitSlop, and no longer has `rounded-full`. Label text uses `font-display-medium text-body-sm uppercase tracking-widest` (Cinzel via variants).

- [ ] **Step 1: Write failing tests** (replace the highlight test): `secondary` variant renders a `ShapedSurface` filled `secondary` with text class `text-secondary-foreground`; `primary` fill is `primary`; `destructive` stroke is `destructive`; size classes and hitSlop assertions are unchanged; `lit` adds a glow to the surface; `disabled` has `opacity-50`, no glow, and does not call `onPress`; pressing in (`fireEvent(btn,'pressIn')`) sets the surface `shadowOffset` to 1 and translates the content 2px, pressing out restores it; `Button` has no `rounded-full` class.
- [ ] **Step 2: Run** `npx jest __tests__/components/ui/button.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `Button` (variant → `{fill, stroke, textClass}` map; track pressed state with `onPressIn`/`onPressOut`; surface behind children). Rename the three `variant="highlight"` call sites to `secondary`; delete the `highlight` fill tokens from `global.css`, `theme.ts` and `tailwind.config.js` (`highlight-text` stays); update the tailwind-config test.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: matte pointed Button with press sink; highlight → secondary`

### Task 5: Input and placeholder distinction

**Files:**
- Modify: `src/components/ui/input.tsx`, `__tests__/components/ui/input.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `ShapedSurface`.
- Produces: `Input` keeps `InputProps` (`TextInput` props + `className`); wraps the field in a `ShapedSurface` (`fill` `well`, `stroke` `border` → `torch` when focused, width 2 → 3 when focused); `multiline` or measured height > 56 uses chamfer. Value text is `font-narrative-semibold text-typed`; while the field has no text, the field style is `font-narrative-italic` with `placeholderTextColor` = `THEME_COLORS.placeholder`. "Has text" is tracked from `value ?? defaultValue` and `onChangeText`, so uncontrolled inputs work.

- [ ] **Step 1: Write failing tests:** empty input renders the italic placeholder class and no `text-typed`; after `fireEvent.changeText(input,'Thessaly')` it switches to `font-narrative-semibold text-typed` (uncontrolled); `value="x"` starts typed; focus adds `torch` stroke and strokeWidth 3 on the surface; `multiline` renders chamfer; `editable={false}` has `opacity-50`; user `onChangeText`/`onFocus`/`onBlur` still fire.
- [ ] **Step 2: Run** `npx jest __tests__/components/ui/input.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `Input` with local `hasText` and `focused` state; keep `web:outline-none`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: recessed pointed Input; placeholder italic vs typed semibold`

### Task 6: Card, ContentCard, StatTile, SectionHeader divider

**Files:**
- Modify: `src/components/ui/card.tsx`, `src/components/ui/separator.tsx`, `src/components/game/ContentCard.tsx`, `src/components/game/StatTile.tsx`, `src/components/game/SectionHeader.tsx`, and their tests under `__tests__/components/`
- Create: `src/components/ui/spire-divider.tsx`

**Interfaces:**
- Consumes: `ShapedSurface`.
- Produces: `Card` gains `variant?: 'flat' | 'hero'` (default `flat`; keeps `compact`, `className`, View props). `flat` = chamfer, `rock` fill, `border`-colour 1px edge, hard shadow 3px. `hero` = arch shape, gold (`primary`) stroke, `light="torch"`, extra top padding equal to the arch rise (54px) so content clears the point. `SpireDivider({ className })` draws the gold line with a centred triangle marker; `SectionHeader` uses it under the title in place of `border-b border-rule`; `Separator` is unchanged for dense lists. `ContentCard` and `StatTile` use `flat`; `StatTile` number is `font-plex`.

- [ ] **Step 1: Write failing tests:** `Card variant="hero"` renders an arch path and a `light` gradient; default `Card` renders chamfer with no gradient; hero content padding top ≥ rise; `StatTile` value has `font-plex`; `SectionHeader` renders a `SpireDivider` (by testID `spire-divider`); existing StatTile/ContentCard/SectionHeader behaviour tests still pass.
- [ ] **Step 2: Run** `npx jest __tests__/components` — Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement.** Pick `hero` for scene/content-detail cards only (search for large single cards in `src/features/content`); leave list rows `flat`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: arch hero cards, flat chamfered cards, spire dividers`

### Task 7: Screen background, vignette, grain

**Files:**
- Create: `scripts/make-grain.mjs`, `assets/grain.png`, `__tests__/scripts/grain.test.ts`
- Modify: `src/components/game/ScreenBackground.tsx`, `__tests__/components/game/ScreenBackground.test.tsx`, `src/lib/theme.ts` (`tabBarStyle`)

**Interfaces:**
- Consumes: `SKY_BANDS` (Task 1).
- Produces: `ScreenBackground({ children, scroll })` keeps its props. Layers (bottom→top): `background` fill; six stepped sky-band rectangles occupying the top 30% of the window height (heights 14/14/14/14/14/30% of that band region), a radial vignette (`Defs`/`RadialGradient` with a per-instance `useId` id, transparent at centre → `ink` at 0.82 on the edges), content, then an `Image` of `assets/grain.png` tiled via `resizeMode="repeat"`, `pointerEvents="none"`, opacity 0.3. `scripts/make-grain.mjs` writes a 256×256 RGBA noise PNG using only Node built-ins (`zlib`).

- [ ] **Step 1: Write failing tests:** `grain.test.ts` reads `assets/grain.png` and asserts the PNG signature and a 256×256 IHDR; `ScreenBackground` renders six band rects with `SKY_BANDS` fills in order, a grain `Image` with `pointerEvents="none"`, and two instances use different vignette gradient ids.
- [ ] **Step 2: Run** `npx jest __tests__/scripts/grain.test.ts __tests__/components/game/ScreenBackground.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the script (run `node scripts/make-grain.mjs` once; commit the PNG), the layers, and `tabBarStyle` border/background from the new tokens.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: banded sky, vignette and grain screen background`

### Task 8: Remaining `ui/` components

**Files:**
- Modify: `src/components/ui/badge.tsx`, `toggle-chip.tsx`, `tabs.tsx`, `progress.tsx`, `dialog.tsx`, `sheet.tsx`, `toast.tsx`, `label.tsx`, `collapsible.tsx` and their tests under `__tests__/components/ui/`

**Interfaces:**
- Consumes: `ShapedSurface`, `Text`.
- Produces: unchanged props/exports for each component. `Badge` and `ToggleChip` use pointed ends (`ToggleChip` `sm` keeps 32pt + hitSlop; selected `fill` = `primary`, `outline` = mint stroke; selected glow = torch). `Tabs` list is a chamfer-edged track; active trigger is a `primary` hex. `Progress` track `ink`, indicator `primary`, square-ended with a 1px `ink` outline (no `rounded-full`). `Dialog`/`Sheet` content use a chamfer surface (`rock` fill, gold hairline, hard shadow); `Sheet` drops `rounded-t-sheet`; its top edge becomes the arch shape. `Toast` pill = `ink` fill with mint text. `Label` is unchanged except colours.

- [ ] **Step 1: Write failing tests:** per component, assert the new surface (shape and fill key) and that existing behaviours (selected state, `accessibilityState`, hitSlop, open/close) still pass; `Toast` text contrast pair is covered by Task 1's contrast test (add `inkText` pair `foreground` on `ink` ≥ 7).
- [ ] **Step 2: Run** `npx jest __tests__/components/ui` — Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: re-skin badges, chips, tabs, progress, dialogs, sheets, toast`

### Task 9: Game components and resource colours

**Files:**
- Modify: `src/components/game/ResourceTracker.tsx`, `AdjustSheet.tsx`, `EmptyState.tsx`, `HeaderNav.tsx`, `global.css` and `theme.ts` (`resource*` colours), `__tests__/components/game/*`, `__tests__/lib/contrast.test.ts`

**Interfaces:**
- Produces: the five `resource*` tints re-tuned so each is ≥ 3:1 against `background` and each pair is visibly distinct (add a test that all five hex values differ by ≥ 40 in RGB distance); `ResourceTracker` public props unchanged; terracotta stays the failure hue.

- [ ] **Step 1: Write failing tests:** the five resource tints are mutually distinct (RGB distance ≥ 40) and ≥ 3:1 on `background`; `EmptyState`/`HeaderNav` use the new tokens (assert class names that existed before still exist; no `useColorScheme` import, covered by Task 1's scan).
- [ ] **Step 2: Run** `npx jest __tests__/lib/contrast.test.ts __tests__/components/game` — Expected: FAIL.
- [ ] **Step 3: Implement** the tuning and any layout fixes the new fonts need.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: re-tune game components and resource tints for Night Vigil`

### Task 10: Screen sweep

**Files:**
- Modify: screens under `app/` and `src/features/`, `src/systems/` where text should be `narrative` or where tokens were bypassed; tests that assert removed class names

**Interfaces:**
- Consumes: `Text variant="narrative"`, `Card variant="hero"`, `Button variant="secondary"`.

- [ ] **Step 1: Write failing test:** `__tests__/lib/no-leftovers.test.ts` scans `app/` and `src/` for `font-display` on dense UI controls, `Fraunces`, `variant="highlight"`, `bg-highlight`, `rounded-full` on `Button`/`Input` usages; expects none.
- [ ] **Step 2: Run** `npx jest __tests__/lib/no-leftovers.test.ts` — Expected: FAIL if leftovers exist.
- [ ] **Step 3: Implement.** Move scene/description/transcript text to `narrative` (never below 16px); give content-detail and scene cards `variant="hero"`; fix layouts that break with Cinzel's wider letterforms at 2x font scale.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit:** `feat: sweep screens onto Night Vigil components and narrative type`

### Task 11: Verification and before/after capture

**Files:**
- Create: `docs/superpowers/screenshots/2026-11-02-night-vigil/` (before/after PNGs)

- [ ] **Step 1:** On `main` (use `git worktree add` to a temp folder), run `npm run web` and capture five screens (login, characters list, character sheet, content browser, one builder step) as `before-*.png`. Screens behind sign-in need a test account and `.env.local` Supabase keys (see `.env.local.example`); if none is available, capture what is reachable and ask the owner for the rest.
- [ ] **Step 2:** On this branch run `npm run web` and capture the same five as `after-*.png`; read them side by side against the mockup.
- [ ] **Step 3:** Run `npm test` — Expected: PASS. Run the app on one native target (`npm run ios`) and check Button press, Input focus, a hero Card and ScreenBackground; record anything not checked.
- [ ] **Step 4: Commit** the screenshots: `docs: Night Vigil before/after captures`. Then stop the brainstorm server (`bash $SUPERPOWERS/scripts/stop-server.sh`) and report to the owner for approval before any push or PR.
