# Foundation Rebuild — Design

**Date:** 2026-11-01
**Branch:** `rebuild/foundation` (baseline snapshot: `7b07974`)
**Status:** Draft for approval

## 1. Intent

The app works but has no foundation to build on. The UI is messy: 25 screens built from raw
React Native views with Catppuccin hex values and ad-hoc spacing typed inline, an installed but
unused Gluestack setup, and two competing `components/` folders. The database has no clear
logic: duplicate tables for the same job (`character_equipment` vs `character_inventory`),
"either-this-or-that" foreign-key pairs everywhere because homebrew lives in a separate generic
bucket, and schema fixes interleaved with 7,000 lines of seed data across 15 migrations.

At the same time the product direction has changed: it should be a **generic TTRPG companion**,
not a D&D app. D&D 5e (2024 SRD) is the first system; **Daggerheart** is the second and is the
test of whether the model is genuinely generic.

This project rebuilds the foundation — design system, data model, code structure — and rebuilds
the existing screens on top of it, so every later feature (Daggerheart, Session Console) starts
clean.

## 2. Goals, non-goals, anti-goals

**Goals**
- A real design system (the "Moss blend", §4) implemented as shadcn-style components, with every
  colour, spacing value and text style coming from tokens.
- A system-agnostic data model where a game system is data + a small code module, not table
  structure (§5).
- A clean, from-scratch migration set and reproducible seed data; `supabase db reset` rebuilds
  everything.
- Every screen that exists today rebuilt on the new components and data model, with feature
  parity.
- Clear code structure by feature, D&D rules isolated in one system module with unit tests.

**Non-goals (this project)**
- Daggerheart content, rules module or screens — that is the follow-up project. This project only
  has to make Daggerheart *easy to add* (verified by the Daggerheart stub check in §7).
- Session Console, realtime sync, initiative, item gifting, or any other feature not already in
  the app — except the three gap-fills listed under §3 "Additions".
- Android polish (it should still build; it is not a verification target).
- Preserving any existing database data — it is all test data and will be wiped.

**Anti-goals (would be a failure even if it technically works)**
- A universal rules engine that tries to express any game's mechanics as data. Systems get a
  small TypeScript rules module; the data model only has to make adding one easy.
- Screens that still set their own colours, font sizes or spacing values.
- A "generic" model that is really D&D with renamed columns (e.g. six fixed ability-score
  columns on `characters`).
- Swapping one unused component library for another unused one: the shadcn components must be
  what screens are actually built from.

## 3. Constraints and current state

- **Stack (kept):** Expo SDK 54, React Native 0.81, Expo Router 6, NativeWind 4 / Tailwind 3,
  Supabase (remote project `rptykudqeeimpibezxxz`, MCP connected), Zustand, phosphor icons, Jest.
- **Platforms:** iOS is the primary verification target (simulator). Web must keep working
  (`app.json` has a web config). *(my call)*
- **Licensing:** D&D content is the 2024 SRD 5.2 (CC-BY-4.0). Daggerheart content (later) is
  published under the Darrington Press Community Gaming License. Each `game_systems` row records
  its licence/attribution.
- **Existing routes to rebuild** (feature parity):
  - Auth: `(auth)/login`, `(auth)/signup`
  - Characters: list, builder wizard (`new/` — class, origin, ability-scores, spells, details,
    personality, review), sheet tabs (`[id]/` — character, actions, inventory, campaign),
    level-up
  - Content (homebrew): list, create, detail/edit
- **Wizard baseline** (decided): the builder wizard is rebuilt to match the *behaviour* of the
  unmerged overhaul in commit `25b2099` on branch `claude/nice-wescoff-08e860`, not the older
  wizard on this branch: "Step X of N" progress with segmented bar; classes grouped by role with
  hit-die badge, tagline and expand-on-select details; tap-to-expand ability rows with inline value
  picker and live modifier; 3×3 alignment grid; field hints; live spell search with
  Ritual/Concentration badges; keyboard-safe details step with name preview; review hero card with
  quick stats and a checklist; character list cards with HP bar and empty state. Its styling
  (emoji, class colours, `rounded-2xl`) is **not** carried over — everything uses §4. D&D-specific
  pieces (role grouping, alignment grid) come from the D&D system module, so other systems can
  omit or replace them. Read that commit with `git show 25b2099`; the worktree can be removed once
  the rebuild is merged.
- **Additions** (decided: in scope, because the data model work touches them anyway):
  - **Resource tracking on the sheet:** spend/restore spell slots (and any slot-style resource the
    system declares) with the glowing `ResourceTracker`, stored in `characters.resources`.
    Long/short rest restores per the system rules module.
  - **Add item to inventory:** a picker over `content` items (SRD, my homebrew, and the
    campaign's items) with quantity, writing `character_items`.
  - **Campaigns:** create a campaign (choosing its system), share an invite code, join by code,
    pick which of my characters (same system) plays in it, see members. Replaces the "coming
    soon" placeholder on the sheet's Campaign tab, plus a campaigns entry point in the main tabs.
    GM tooling beyond that (campaign items UI, sessions) stays out of scope.
- **Existing PRDs** in `docs/superpowers/specs/2026-05-15-*` are D&D-specific in their data
  sections. This document supersedes their data-model and UI-styling parts; their feature
  descriptions still stand.
- **Housekeeping found during review:** three old Claude worktrees under `.claude/worktrees/`
  (one, `claude/nice-wescoff-08e860`, has commits not on `main`). Inspect before removing.

## 4. Design system — "Moss blend"

Source: the Moss Design System and character-sheet screens in Figma
(`oHjzVWL7C2lnyslND0gPbz`), blended as agreed in brainstorming. Approved mockups live in
`.superpowers/brainstorm/11401-1793535283/content/` (`blend-v4.html`, `spacing-type-v1.html`).

### 4.1 Principles
- Moss provides the *system*: three typefaces, pill shapes, warm stone neutrals, earthy accents,
  light + dark modes.
- The retro-fantasy screens provide the *character*: dark mode uses forest-teal surfaces rather
  than charcoal, a painted-sky glow at the top of every screen (both modes), ochre reserved for a
  single hero action per screen, uppercase mono labels, diamond pips.
- Every card has a hairline border in both modes.
- Unused (available) slot-style resources glow; spent ones are quiet outlines.

### 4.2 Colour tokens (shadcn semantic names)

| Token | Light | Dark |
|---|---|---|
| `background` | Cream `#FBF8F3` | Forest teal `#173832` |
| `glow` (top-of-screen radial) | Ochre haze `#F3DDA0` | Olive haze `#5A5F36` |
| `foreground` | Ink `#1E1A12` | Cream `#F5E4C3` |
| `muted-foreground` | Stone 600 `#7A6F5E` | `#A9BFB4` |
| `label` | Stone 500 `#9B8F7C` | `#8FB3A6` |
| `card` / `muted` | Stone 100 `#F0EAE0` | Cream @ 6% on teal |
| `border` (all cards) | Moss @ 16% `rgba(63,122,84,.16)` | Cream @ 10% `rgba(245,228,195,.10)` |
| `rule` (section dividers) | Stone 200 `#E5DDD0` | Cream @ 14% |
| `primary` / `primary-foreground` | Moss `#3F7A54` / cream | Moss lifted `#5B9268` / `#112D28` |
| `accent-foreground` (green text) | Moss `#3F7A54` | Sage `#B5C995` |
| `highlight` / `-foreground` *(new, one hero action per screen)* | Ochre `#E8B547` / ink | Ochre `#ECC15B` / ink |
| `highlight-text` *(ochre for text, e.g. the HP number)* | `#8F5E0E` (4.65:1 on card; mockup `#C88A1E` is 2.47:1) | `#ECC15B` (6.44:1 on card) |
| `destructive` | Terracotta `#D96A47` | `#E68763` |
| `resource` tints | Sky `#4F8FB8`, Plum `#8B4A5E`, Sage, Ochre… | Sky `#BFE0F2` (+glow), lifted variants |
| `resource-terracotta` (+`-glow`) *(death-save failures; the destructive hue as a resource tint)* | `#D96A47` / `rgba(217,106,71,.55)` | `#E68763` / `rgba(230,135,99,.7)` |
| `tinted` *(tinted badge surface: active conditions)* | Plum @ 10% `rgba(139,74,94,.10)` | Plum lifted @ 14% `rgba(215,154,174,.14)` |
| `tinted-foreground` | Plum `#8B4A5E` (5.4:1 on `tinted` over background) | `#D79AAE` (4.8:1) |
| `tinted-border` | Plum @ 35% `rgba(139,74,94,.35)` | `rgba(215,154,174,.35)` |

Exact dark-mode surface values for `card`, `popover`, `input` etc. are the builder's to derive
from these, checked against WCAG AA for text.

### 4.3 Spacing — one 4-pt scale, fixed jobs
Tailwind's default spacing scale is **replaced** (not extended) so only these values exist:

| Token | px | Job |
|---|---|---|
| `1` | 4 | Tightly coupled lines (name ↔ subtitle, label ↔ stat) |
| `2` | 8 | Siblings in a group (tiles, chips, buttons, list rows) |
| `3` | 12 | Section header → content; compact card padding |
| `4` | 16 | Screen side gutter; standard card/sheet padding |
| `6` | 24 | Between sections; top of screen |
| `8` | 32 | Between major page regions (rare) |

Fixed sizes: touch targets ≥ 44, icon buttons 32 with a 44 hit area. Radius: card 16,
sheet/modal 20, small 8, buttons/chips/inputs pill.

### 4.4 Typography — nine roles
Tailwind's font-size scale is replaced by these roles, exposed as `<Text variant="…">`:

| Role | Font · size/line | Use |
|---|---|---|
| `display` | Fraunces 600 · 32/38 | Hero moments (empty states, "Your turn") |
| `title` | Fraunces 600 · 24/30 | Screen title, character name |
| `heading` | Fraunces 600 · 20/26 | Sheet/modal title |
| `subhead` | Inter 600 · 16/22 | Card title |
| `body` | Inter 400 · 16/24 | Descriptions, rules text |
| `body-sm` | Inter 400 · 14/20 | Secondary lines, metadata, button text |
| `stat` | Fraunces 600 · 24/28, tabular figures | Numbers in tiles and trackers |
| `label` | IBM Plex Mono 500 · 11/14, uppercase, +0.08em | Section headers, stat labels, chips |
| `caption` | Inter 400 · 12/16 | Helper/error text |

Nothing below 11px. *(My calls: headings use Fraunces rather than the Moss preview's Inter, to
match the screens; stat numbers use tabular figures.)*

Invite codes use `stat` with the Plex Mono family (`font-plex`) so the code reads as a fixed-width
value at stat size; no separate code role.

### 4.5 Components
- **Base layer:** react-native-reusables (shadcn/ui for React Native, on NativeWind +
  `@rn-primitives`). Components are copied into `src/components/ui/` and restyled to the tokens:
  Button (primary, outline, ghost, highlight, destructive; pill), Input, Label, Card, Badge/Chip,
  Tabs (segmented pill, as in the Actions/Bonus/Reactions mock), Select, Dialog, bottom Sheet,
  Collapsible, Progress, Separator, Text.
- **Game layer** (`src/components/game/`), built only from the base layer:
  `ScreenBackground` (glow), `SectionHeader` (mono label + rule + collapse chevron), `StatTile`,
  `ResourceTracker` (variants: `pips` for slot-style with glow on available, `bar` for HP-style,
  `counter` for numeric pools), `ContentCard` (icon, title, meta line, tag chips, optional action),
  `AdjustSheet` (the Adjust HP / Conditions / XP bottom-sheet pattern from Figma).
- **Removed:** Gluestack provider and config, `react-aria`, `react-stately`, `@legendapp/motion`,
  `tailwind-variants`, `@expo/html-elements`, the Catppuccin and Gluestack colour scales in
  `tailwind.config.js`, the `safelist`, and the `react-dom-stub` if nothing needs it afterwards.
- **Fonts:** Fraunces, Inter, IBM Plex Mono via `@expo-google-fonts/*`, loaded in the root layout.
- **Theme mode:** follows the OS setting. *(my call; a manual override can come later)*
- **Glow on native:** radial gradient via `react-native-svg` (already installed). Pip glow via
  iOS shadow; Android may render without colour glow — acceptable.

### 4.6 Enforcement
- A check script (run in CI/`npm test`) fails if app code under `app/` or
  `src/features/` contains hex/rgb colour literals, inline `style` colours/sizes, or arbitrary
  Tailwind values (`p-[13px]`, `text-[#…]`). Token files and `src/components/ui` are exempt.
- Navigation chrome (tab bars, headers) reads colours from the theme, not literals.

## 5. Data model — system-agnostic

### 5.1 Core idea
A **game system** is described in two places:
1. **Database:** a `game_systems` row (id, name, licence) so content, characters and campaigns
   can reference it, plus that system's content rows.
2. **Code:** a module `src/systems/<id>/` that defines the system's stats, resources, content
   kinds, builder steps, and derived-value rules, with Zod schemas for the JSON shapes it stores.

Tables are generic; JSON columns hold system-specific shapes, validated by the system module on
write and on read.

### 5.2 Tables

**`profiles`** (replaces `public.users`) — `id` → `auth.users`, `username` (unique),
`display_name`, `avatar_url`, timestamps. Created by trigger on sign-up.

**`game_systems`** — `id text` primary key (`dnd5e-2024`, later `daggerheart`), `name`,
`version`, `license`, `attribution`. Seeded.

**`content`** — every piece of game content, SRD and homebrew alike:
- `id`, `system_id` → `game_systems`, `kind text` (system-defined: `class`, `subclass`,
  `species`, `background`, `feat`, `spell`, `item`, `magic_item`; later `ancestry`, `community`,
  `domain_card`, …), `name`, `slug`, `summary`, `description`, `data jsonb` (shape per
  system+kind), `parent_id` → `content` (e.g. subclass → class), timestamps.
- Ownership: `owner_id` → `profiles` (null = official SRD), `campaign_id` → `campaigns`
  (non-null = a GM's campaign-scoped item; replaces `campaign_items`).
- Uniqueness: `(system_id, kind, slug)` unique among official rows; `(owner_id, system_id, kind,
  slug)` unique for homebrew.
- Replaces: `classes`, `subclasses`, `species`, `backgrounds`, `feats`, `spells`, `equipment`,
  `magic_items`, `campaign_items`, `user_content`.

**`characters`** — `id`, `owner_id`, `system_id`, `name`, `level`, `portrait_url`,
`stats jsonb` (e.g. D&D: six ability scores; Daggerheart: six traits), `resources jsonb`
(keyed by resource id: `{ current, max, temp? }` or slot arrays — e.g. `hp`, `spell_slots`,
`hit_dice`, `death_saves`; later `stress`, `hope`, `armor_slots`), `conditions text[]`,
`details jsonb` (alignment, personality, appearance — system-defined), `notes`, timestamps.
No D&D-specific columns. Derived values (modifiers, AC, proficiency, passive perception) are
computed by the system module, not stored.

**`character_picks`** — what a character *is* and *knows*: `character_id`, `content_id`,
`kind` (denormalised from content for querying), `state jsonb` (e.g. spell `prepared`, domain
card `loadout|vault`, chosen options), `acquired_at_level`. Replaces `character_spells` and the
`class_id`/`species_id`/`background_id`/`custom_*_id` columns on characters.

**`character_items`** — what a character *carries*: `character_id`, `content_id`, `quantity`,
`equipped`, `attuned`, `notes`, timestamps. Replaces `character_equipment` and
`character_inventory`. One FK, no either/or columns.

**`campaigns`** — `id`, `system_id`, `gm_id` → `profiles`, `name`, `description`,
`invite_code`, timestamps. A campaign has exactly one system; characters joining must match it.

**`campaign_members`** — `campaign_id`, `user_id`, `role` (`gm`|`player`), `character_id`
(nullable), `status` (`invited`|`active`), timestamps.

**Sessions:** the old `sessions` / `session_characters` tables are **not** recreated. The Session
Console project will add its own tables against this model. *(my call: no dead tables)*

### 5.3 Conventions
snake_case; plural table names; `uuid` ids (except `game_systems.id`); `created_at` /
`updated_at` on every mutable table with a shared `set_updated_at()` trigger; explicit
`on delete` on every FK; an index on every FK and every column used in an RLS policy; check
constraints for enums rather than Postgres enum types (easier to extend per system).

### 5.4 Security (RLS)
- `content`: read if official, or owned by me, or campaign-scoped to a campaign I'm a member of.
  Write only my own homebrew, or campaign items in campaigns where I'm GM.
- `characters` and their `character_picks` / `character_items`: full access for the owner; read
  for the GM and fellow members of a campaign the character is in.
- `campaigns` / `campaign_members`: read for members; write for the GM; a player can update
  their own membership row (accept invite, pick character).
- Helper SQL functions (`is_campaign_member`, `is_campaign_gm`) marked `security definer`
  with a fixed `search_path`, to avoid recursive policy lookups.
- Supabase security and performance advisors must report no errors after reset.

### 5.5 Migrations and seed
- The 15 existing migrations are deleted and replaced by a small ordered set, e.g.:
  `0001_foundation.sql` (extensions, helper functions, triggers), `0002_profiles_systems_content`,
  `0003_characters`, `0004_campaigns`, `0005_rls`.
- SRD content leaves migrations entirely. Its source of truth becomes JSON files per system and
  kind (e.g. `supabase/seed/dnd5e-2024/spells.json`), converted once from the existing seed SQL.
  A script generates `supabase/seed.sql` from them; `supabase db reset` loads schema + seed.
  *(builder chooses script language/location)*
- The remote project is reset to the new schema (all data is test data — confirmed).
- `src/types/database.types.ts` is regenerated from the new schema; hand-written types that
  duplicate it are deleted.

## 6. Code structure

```
app/                         routes only — thin screens composing feature components
src/
  components/ui/             shadcn (react-native-reusables) base components
  components/game/           game-layer components (§4.5)
  features/
    auth/                    provider, hooks, service
    characters/              queries, mutations, builder state, sheet sections
    campaigns/
    content/                 homebrew list/create/edit
  systems/
    types.ts                 GameSystem interface (stats, resources, kinds, builder steps, rules)
    registry.ts              id → module
    dnd5e-2024/              definition, Zod schemas, rules (modifiers, AC, slots by level…), tests
  lib/                       supabase client, theme, utils (cn)
  types/database.types.ts    generated
```

- The root `components/` folder (Gluestack) and `src/modules/`, `src/stores/` are folded into the
  above.
- **Server state:** TanStack Query for fetching/mutating Supabase data (caching, loading and
  error states in one place). Zustand stays only for client state (builder draft, collapsed
  sections). *(my call — new dependency)*
- **Validation:** Zod, for system JSON shapes and forms. *(my call — new dependency)*
- **Generic screens, system-specific pieces:** screens render from the system definition
  (e.g. the sheet's Vitals section renders whatever stats/resources the system declares). Where
  layout must differ per system, the system module may export a section component; the default is
  the generic one.
- Builder wizard: steps are declared by the system (D&D: class → origin → ability scores →
  spells → details → personality → review). Generic step types: pick content of kind X, assign
  stats, free-text details, review.

## 7. Verification ("done")

- `npx supabase db reset` (local) builds schema and seed from scratch with no errors; remote reset
  matches; advisors clean.
- `npx tsc --noEmit` clean; `npm test` green, including:
  - D&D rules unit tests (modifiers, proficiency, spell slots by level, HP on level-up);
  - service/query tests updated to the new tables;
  - the token-enforcement check (§4.6);
  - **the Daggerheart stub check** *(my call)*: a minimal `src/systems/daggerheart/` definition
    (six traits; HP, Stress and Armor as slot resources; Hope as a pool; Evasion; content kinds
    `ancestry`, `community`, `class`, `subclass`, `domain_card`) that type-checks against the
    `GameSystem` interface, plus a test that validates a sample Daggerheart character and a sample
    domain card through its Zod schemas and maps them to `characters` / `content` row shapes
    without any schema change. No Daggerheart content seed or screens.
- On the iOS simulator, in light and dark mode, end-to-end: sign up → log in → create a D&D
  character through every builder step → sheet tabs render (Character, Actions, Inventory,
  Campaign) → adjust HP, spend/restore spell slots, toggle a condition → add/equip an item →
  level up → create, edit and use a homebrew spell → create a campaign and join it with the
  character.
- Web: app loads and the character sheet renders.
- Visual check of the rebuilt sheet against the approved mockups (`blend-v4`,
  `spacing-type-v1`).
- **Design reviews after the screens are rebuilt** (requested): two independent reviewer passes
  over iOS simulator screenshots of every rebuilt screen in light and dark mode, plus the code:
  - **UX review:** flows, hierarchy, empty/loading/error states, touch targets, copy, the
    builder wizard and the new campaign and resource flows.
  - **UI review:** adherence to this design system (§4): tokens, spacing scale, type roles,
    borders, glow, one ochre hero action per screen, light/dark consistency.

  Each pass produces a prioritised findings list. High/medium findings are fixed (or
  explicitly deferred with the user's OK) before the project counts as done.

## 8. Left to the builder
- Exact derived dark-mode surface values and contrast tuning (§4.2).
- Which react-native-reusables components are needed beyond the list in §4.5.
- Seed generator script language and location (§5.5).
- Exact JSON shapes per D&D content kind, as long as each has a Zod schema in the system module.
- Task ordering, as long as the design system and schema land before screens are rebuilt.
- Cleaning up the old worktrees after confirming nothing else in them is still needed (the
  wizard overhaul in `25b2099` is the one known item worth keeping — see §3).

## 9. Follow-up project (not this one)
**Add Daggerheart:** `src/systems/daggerheart/` (traits, HP/Stress/Armor slots with thresholds,
Hope, Evasion, GM Fear; content kinds ancestry, community, class, subclass, domain card; builder
steps), its SRD content seed, and any system-specific sheet sections (domain-card loadout/vault).
No schema changes should be needed — if some are, the model in §5 has failed its test.
