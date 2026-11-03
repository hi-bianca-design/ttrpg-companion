# Design

How the app looks, feels and reads.

## What's here

- [Paywall and upgrade UX](paywall-and-upgrade-ux.md): when and how we ask for money
- [Shop and pack presentation](shop-and-pack-presentation.md): the shop, pack detail, owned and locked states
- [Themes and cosmetics](themes-and-cosmetics.md): why paid themes need their own spec
- [Reddit pain points](reddit-pain-points.md): what players and DMs complain about in tabletop apps, 34 threads read, with product implications (research, 2026-11-03)
- [Market research rerun](market-research-rerun.md): an independent second run of the market research (competitors, market size, licensing, monetization, name check), 2026-11-03
- [Market research comparison](market-research-comparison.md): first round vs rerun vs a Gemini report, what agrees, what conflicts, and the three findings to act on

## The design system

The app's visual language is **Night Vigil**: one dark palette, posterized shapes, token-only styling. It's documented outside this folder:

- Spec: [night-vigil-design-system-design](../superpowers/specs/2026-11-02-night-vigil-design-system-design.md)
- Plan: [night-vigil-design-system](../superpowers/plans/2026-11-02-night-vigil-design-system.md)
- Mockups: `docs/superpowers/mockups/` and screenshots in `docs/superpowers/screenshots/`

Rules enforced in code: colours and spacing only through tokens (`scripts/check-tokens.mjs`, run by `npm test`), and tests for a single dark palette, drift between `global.css` and `src/lib/theme.ts`, and contrast.

## Still to write

- [ ] **Component inventory**: every shared component (`src/components/ui`, `src/components/game`), what it's for and when not to use it
- [ ] **Accessibility checklist**: minimum targets (44pt), contrast, screen reader labels, and how to test
- [ ] **Voice and copy guide**: how the app talks (calm, specific), error copy, button labels, with examples from the app
- [ ] **Art direction**: the look commissioned art must match (see [Artist commissioning](../content/artist-commissioning.md))
- [ ] **Motion**: the screen-to-screen wipe and reduced-motion behaviour
- [ ] **Empty, loading and error states**: the standard patterns in one place
- [ ] **Figma or mockup index**: where design files live and which are current
