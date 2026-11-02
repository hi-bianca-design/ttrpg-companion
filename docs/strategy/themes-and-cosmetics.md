# Themes and cosmetics

**Status:** **Decided** that themes are out of the first release (D7). Needs its own spec before any build.

## Why this is separate

Cosmetic themes are an attractive product: low price, no content licensing risk, near-zero marginal cost once the mechanism exists. But the app is currently built around exactly **one** palette, on purpose:

- The Night Vigil design system is one dark palette. Tests enforce it: `single-theme`, `theme-drift` and `contrast`.
- `THEME_COLORS` in `src/lib/theme.ts` is a module-level constant imported in about 57 places, and it mirrors the CSS variables in `global.css`.
- A token linter (`scripts/check-tokens.mjs`) forbids literal colours in feature code, which is good: it means colours already flow through tokens.

Making themes switchable means turning that constant into runtime state, and re-deciding what the contrast tests guarantee when there is more than one palette. That is a design-system change, not a shop feature.

## What a theme spec needs to answer

1. **What can vary?** Palette only, or also texture, typography and shape language? A palette-only theme is far cheaper and safer.
2. **Contrast.** Every theme must meet the same legibility bar (the existing contrast test guards 4.5:1 for text on the sky bands). Do contrast checks run per theme, in CI, as part of publishing a theme?
3. **How do web and native apply it?** CSS variables work on web; NativeWind needs a runtime variables mechanism on native.
4. **JS-side colours.** Navigation, SVG gradient stops and shape fills read `THEME_COLORS` directly. They must read from the active theme.
5. **Does it follow the OS?** No. The app is dark-only; themes are variations within that, not a light mode.
6. **Where does a theme's data live?** In a `theme`-kind pack, as JSON in its row (the schema already allows `packs.kind = 'theme'`).
7. **Preview before buy.** A user should see the theme live before purchase, and revert without a restart.

## Proposed path

1. Write the spec (brainstorm, then a plan): theme model, provider, contrast rules.
2. **Refactor with no visible change**: make Night Vigil the default theme served through a provider, and keep all existing tests green.
3. Add the entitlement check: a theme is selectable if the user owns its pack, using the existing `pack_entitlements`.
4. Ship one extra theme as the first paid cosmetic.

Cosmetic packs also double as marketing: a seasonal theme gives a reason to announce and to bring lapsed users back.

## Other cosmetics (later)

- **Dice skins and roll effects**, if a dice roller is added.
- **Sheet frames and portrait frames.**
- **Token sets**, tied to the art-pack pipeline.

All of these ride on the same pack and entitlement machinery. None needs a new payment mechanism.
