# Night Vigil Design System — Design

**Date:** 2026-11-02
**Branch:** `claude/design-system-polish-f4c569`
**Status:** Draft for approval
**Supersedes:** the "Moss blend" visual layer of `2026-11-01-foundation-rebuild-design.md` §4 (colour, shape, typography, light/dark). Its structure (token pipeline, component set, nine type roles, spacing scale, token linter) is kept.

## 1. Intent

The current design system is clean but generic: flat pill buttons that only change opacity on press, an input whose placeholder is a lighter shade of the same text, soft cards, and a warm-stone / moss palette that could belong to any wellness app. It does not help the product's real job, which is to make a table of people feel like they are inside a story.

The target feeling, in the owner's words: *"almost tangible, like an old transcript with embellishments and magical,"* working equally for fantasy and sci-fi (Lord of the Rings, Star Wars, Horizon Zero Dawn, Game of Thrones). The owner supplied three reference images: 1970s/80s paperback fantasy cover art (screenprint-like, posterized teal night skies, mustard moons, torch-orange light spilling out of arched doorways, near-black blue rock masses, heavy film grain). The UI should read as if it were printed on that same stock: matte, flat, grainy, lit from within, not glossy and not a generic app with decoration pasted on.

Two concrete defects triggered the work:
1. Input placeholders look like real answers.
2. Buttons look too flat; they should feel slightly three-dimensional.

## 2. Goals, non-goals, anti-goals

**Goals**
- One dark palette ("Night Vigil", §4.1) replacing both current palettes. The app is dark only.
- A matte, screenprint look (§4.2): posterized bands, grain, vignette, hard offset shadows, lit-from-within glow used only for active/focused elements.
- Buttons and inputs with pointed hexagonal ends; cards with a lancet-arch top; tangible press feedback (§4.3).
- Placeholders unmistakably different from typed values (§4.4).
- New typography: Cinzel for display/labels/buttons, Cormorant Garamond for narrative text and input values, Inter kept for dense UI, Plex Mono kept for numbers and codes (§4.5).
- Every colour, shape and font flows through the existing token pipeline so that feature screens re-skin without per-screen edits.
- Contrast stays accessible (§6).

**Non-goals**
- Light mode, OS-theme following, or a theme toggle. All removed (§5).
- Layout, spacing scale, the nine type roles' sizes, navigation structure, data model, copy.
- Illustration or imagery assets (moon, ridge, gate art). The hero in the mockup is a reference for mood; building illustrated headers is a possible later project.
- Per-game-system theming (e.g. a different skin for Daggerheart). The theme is global for now.
- Animation beyond press feedback (§4.3).

**Anti-goals (would be a failure even if it "works")**
- Glossy gradients, bevels, or soft glows on resting elements. The look is matte.
- Red used for anything other than destructive actions and errors. Red primary buttons read as errors; this was tested and rejected.
- Literal fantasy clip art (swords, dragons, scrolls, rune fonts) or novelty fonts. Ornament stays abstract: arches, pointed ends, small spire markers.
- Decorative fonts on dense data (tables, stat grids, small form labels). Legibility wins.
- Anything that makes tap targets smaller than 44pt or hides state.

## 3. Constraints

- Stack is Expo 54 / React Native 0.81 / NativeWind 4 / react-native-web, with `react-native-svg` already installed. The app also ships as a Vercel web preview, so everything must render on iOS, Android and web.
- React Native has no `clip-path`, no CSS `filter`, no `mix-blend-mode`, and no per-edge hard shadows on Android. The mockups were built in CSS and use all of these; the build must reach the same look with RN-compatible means (§7 lists suggested approaches; the choice is the builder's).
- The token pipeline is: CSS variables in `global.css` → Tailwind colour names in `tailwind.config.js` → literals mirrored in `src/lib/theme.ts` for JS-only needs (navigation theme, SVG stops). `__tests__/lib/theme-drift.test.ts` enforces that `theme.ts` and `global.css` agree. `scripts/check-tokens.mjs` forbids hex/rgb literals, off-scale spacing and arbitrary values outside `src/components/ui/`, `src/lib/theme.ts`, `global.css`, `tailwind.config.js`. Both must keep passing (`npm test` runs `lint:tokens` then jest).
- Spacing scale (4/8/12/16/24/32 + 44 touch height), radii, and the nine type role sizes stay as defined in `tailwind.config.js`. New shapes must not require arbitrary values in feature code.
- Fonts come from `@expo-google-fonts/*` packages loaded in `app/_layout.tsx`.

## 4. The design

### 4.1 Palette: "Night Vigil" (dark only)

Values below are from the approved mockup and are **starting points**; the builder tunes them to meet §6. Token names marked * are new.

| Role | Value | Notes |
|------|-------|-------|
| Night (deepest bg, wells) | `#0B1D20` | bottom of screen gradient |
| Deep teal (mid bg) | `#12383A` | |
| Sky teal (top bg) | `#1F6361` | top of screen; posterized into bands |
| Ink* | `#070F15` | button/field outlines, hard shadows |
| Rock* | `#12212C` / `#0C1822` | card fill, ridge silhouettes |
| Moon gold | `#E3B130` | **primary** fill and card accent line. Flat; no gradient partner. |
| Mint ice | `#9BD3C4` | **secondary** fill, outline-button text/stroke, labels, subtitles |
| Bone | `#E6D9B6` | body text |
| Torch* | `#F0902F` | lit/active/focused only: focus ring and glow, active chip. Never a resting fill on buttons, inputs or chips. The one resting use is the warm light inside hero arch cards (§4.3). |
| Blood | `#B8321F` outline, `#3A110C` fill, `#F0B9A8` text | destructive and error only |
| Placeholder | `#6B8F8A` | italic light (see §4.4) |
| Typed text | `#FFE08A` | semibold |

Mapping onto existing tokens (my call; the builder may refine, but must keep the semantics): `primary` → moon gold with dark foreground; `accent-foreground` → mint ice; the Button `highlight` variant is renamed `secondary` with a new `secondary` token (mint ice fill, dark foreground), and the old `highlight` fill token is dropped; `highlight-text` stays, as a gold, for stat numbers and ochre text, so existing text usages do not change colour family; `destructive` → blood family; `ring` → torch; `background`/`glow`/`glow-mid` → the three teals; `card` → rock; `border`/`rule` → low-opacity mint or gold hairlines. The five `resource-*` colours (sky, plum, sage, ochre, terracotta) used by `ResourceTracker` must be re-tuned so all five stay distinguishable on the new teal; terracotta remains the destructive hue only where it already means failure (death saves).

There is exactly one palette. `.dark:root` selector disappears; the variables move to `:root`.

### 4.2 Surface treatment

- **Sky and screens** (`ScreenBackground`): posterized vertical bands (stepped fills, not a smooth gradient) from sky teal at the top to night at the bottom. Replaces the radial glow.
- **Grain:** a full-screen noise overlay at roughly 30-40% strength, on every screen. (The CSS mockup used `mix-blend-mode: overlay`; RN has no blend modes, so a pre-baked semi-transparent tiled noise image is the expected route.)
- **Vignette:** radial darkening toward the screen edges, framing a lit centre (like the rock walls in reference image 2).
- **Shadows:** hard, offset, ink-coloured (about 3px right and down, zero blur) on buttons, inputs and cards. No soft ambient shadows. Glow (torch-orange, soft) appears only on active or focused elements.
- **Dividers:** a thin gold line with a small centred spire/triangle marker replaces plain rules in screen headers (`SectionHeader`, `Separator`). Plain hairline remains for dense lists.

### 4.3 Shapes and components

| Component | Treatment |
|-----------|-----------|
| `Button` | Hexagonal pointed ends (left/right points, about 14px inset). 2px ink outline, flat fill, hard offset shadow. Cinzel, uppercase, letter-spaced. Variants: `primary` (moon gold, dark text), `secondary` (mint ice, dark text; renamed from `highlight`, all call sites updated), `outline` (mint stroke, dark fill, mint text), `ghost` (unchanged intent), `destructive` (blood outline, dark red fill, light red text). Press: translate down-right 2px and shrink the shadow to 1px (the button sinks into its shadow). Lit/active state: torch glow. Sizes `default`/`sm`/`icon` and the 44pt touch target (hitSlop on small sizes) are unchanged. |
| Tall surfaces (multiline input/textarea, any surface taller than about 56pt, wrapping or full-width multi-line buttons) | Do not use the hexagonal ends. They use a chamfered rectangle (corners cut about 8px) with the same outline, fill and hard shadow. Point depth is a fixed 14px on single-line surfaces; it does not scale with height. The shaped-surface primitive takes the shape from height, with an override. |
| `Input` | Same pointed ends; 2px mint-teal edge (torch when focused), recessed dark well with an inner top shadow, hard offset shadow. Focus: torch edge plus soft torch glow. Value text in Cormorant, semibold, typed colour. Placeholder per §4.4. |
| `Card` (+ `ContentCard`) | Lancet-arch top (pointed arch, about 54px rise) with a 2px gold edge; interior fill is rock with warm torch light rising from the bottom edge. Compact/dense cards (list rows, `StatTile`) may drop the arch and keep the flat chamfered shape. The arch is for hero/scene cards; builder decides which card usages qualify (§8). |
| `Badge`, `ToggleChip`, `Tabs`, `Progress` | Re-skinned with the same ink outline, flat fill, pointed ends where height permits; same variants and sizes as today. Active/selected may use torch glow. |
| `Dialog`, `Sheet`, `Toast` | Take the new surface colours, outline and hard shadow; sheet top edge may take the arch silhouette. |
| `Label`, `Text`, `Separator`, `Collapsible` | New fonts and colours only. |

### 4.4 Placeholder vs value (the original defect)

Placeholder and typed text must differ in **three** ways, not just colour: style (placeholder is italic, typed is upright), weight (placeholder light/regular, typed semibold), and colour (placeholder muted teal-grey, typed warm yellow). Applies to every text input, including search fields and any textarea.

### 4.5 Typography

| Use | Font |
|-----|------|
| `display`, `title`, `heading`, button labels, tab labels, and a new `eyebrow` variant (the small gold caption above a hero/scene card title; label metrics, letter-spaced) | **Cinzel** (replaces Fraunces) |
| `stat` (ability scores, HP, AC numbers in `StatTile`, the character sheet and trackers) | **IBM Plex Mono**, as in the mockup. Decorative fonts stay off stat grids (§2). |
| New `narrative` variant: story/transcript text, session notes, descriptions of scenes or content, input values | **Cormorant Garamond** (regular, semibold, italic) |
| `body`, `body-sm`, `subhead`, `caption` for dense UI (tables, form labels, settings, lists) | **Inter** (unchanged) |
| `label` role and invite codes | **IBM Plex Mono** (unchanged) |

Which existing screens' text moves from `body` to `narrative` is a per-screen judgement (my call): narrative content and descriptions yes; dense data and controls no. Cormorant is thin at small sizes, so `narrative` is not used below 16px. Fraunces is removed from the bundle.

## 5. What gets removed

- The light palette and the `:root`/`.dark:root` split in `global.css`; `THEME_COLORS` collapses from `{light, dark}` to one object; `GLOW_STOPS` is replaced by the banded-sky definition.
- OS-theme following: `colorScheme.set('system')` and `useColorScheme` in `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/(app)/content/index.tsx`, `app/(app)/characters/index.tsx`, `app/(app)/characters/new/[step].tsx`, `app/(app)/characters/[id]/_layout.tsx`, `src/features/auth/AccountMenu.tsx`, `src/components/game/ScreenBackground.tsx`, `src/components/ui/toggle-chip.tsx` (every place that picks `THEME_COLORS[mode]`). `src/lib/web-theme.ts` and its test go away. `tailwind.config.js` `darkMode` is simplified accordingly.
- `app.json` `userInterfaceStyle` becomes `dark`; status bar is light everywhere.
- `__tests__/lib/theme-drift.test.ts` becomes single-palette. Tests for `Button`, `Text`, etc. are updated to match new class names.

## 6. Accessibility requirements

- Body and typed text contrast at least 7:1 against their surface (stricter than AA because the app is used in dim rooms and on small screens). Large display text at least 4.5:1.
- Placeholder at least 4.5:1 against the input well (it is real text).
- Button labels at least 4.5:1 on their fills (the mustard fill with dark text, and the mint fill with dark text, both need verifying; torch-orange glow is decoration and never the only state indicator).
- Focus must be visible without relying on colour alone (the edge also thickens or glows).
- All interactive elements keep the 44pt touch target; pointed ends must not shrink the hit area.
- System font scaling cap of 2x stays; layouts must hold with Cinzel's wider letterforms.

## 7. How it gets made (my call, builder may override)

- Pointed-end shapes, lancet arch, and hard-shadow layers: draw with `react-native-svg` paths (already a dependency) or composed Views; do not rely on CSS clip-path or filters. A reusable shaped-surface primitive in `src/components/ui/` that accepts a shape (`hex`, `arch`), outline, fill and shadow, and that Button, Input, Card and others compose, would keep this out of every component.
- Grain: one tiled PNG in `assets/` rendered at low opacity over the screen root.
- New fonts: add `@expo-google-fonts/cinzel` and `@expo-google-fonts/cormorant-garamond`; load them in `app/_layout.tsx` beside Inter and Plex Mono; remove Fraunces.
- Keep existing Tailwind token names where possible so screens do not change; add `ink`, `rock`, `torch` and shape/shadow utilities only where needed. Respect `check-tokens` (no hex in feature code).

## 8. Left to the builder

- Exact hex tuning to hit §6, and the resource-colour set.
- Which card usages get the arch versus a flat shape, and which text moves to `narrative`. Hero/scene cards (a scene, a content entry) get the arch and the torch light inside; list rows, `StatTile` and other dense cards are flat rock with a chamfered shape.
- The shaped-surface implementation and the hard-shadow technique (it must look the same on every platform).
- Grain image generation and strength, and web vs native differences.
- Sequencing: suggested order is tokens and fonts, the shaped-surface primitive, Button/Input/Card, screen background, remaining `ui/` components, game components, then a sweep of screens.

## 9. Success

- Delivered as one branch, in staged commits following the §8 order, covering the primitives, every `ui/` and `game/` component, and every screen. Because screens use tokens, most re-skin automatically; the sweep fixes only the places that do not (the `check-tokens` linter keeps these few). The look is identical on iOS, Android and web (shapes are drawn with SVG, so there is no degraded Android path).
- A before/after capture of five screens (login, characters list, character sheet, content browser, one builder step), taken from the web preview, that the owner approves as matching the reference art. Approval by the owner is the gate before merge.
- Placeholder vs typed text visibly distinct in every input; buttons visibly press.
- `npm test` passes (`lint:tokens` and jest), including the updated drift test.
- Renders correctly on web preview and on at least one native target; anything not verified on a native device is said so.

## 10. References

- Reference art (owner-supplied): `docs/superpowers/mockups/ref-1-castle-stairs.webp`, `ref-2-hooded-figures.webp`.
- Approved mockup, "Screenprint": `docs/superpowers/mockups/2026-11-02-night-vigil-screenprint.html` (open in a browser). The mockup uses Fraunces as a stand-in; the §4.5 font decision overrides it. The mockup is a CSS prototype of the look, not an implementation.
- Chosen type pairing: Cinzel + Cormorant Garamond.
