# Custom Class, Species and Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player make their own class, species or background in the character wizard (name, description, optional extras), one-off on the character by default, with an option to add it to their homebrew library.

**Architecture:** A custom entry is held in the wizard draft until Create. At Create, `createCharacter` first inserts an owner-scoped `content` row for each pending entry (flagged `data.one_off: true` unless the player chose the library), then writes the character's picks pointing at those rows, so the sheet and rules read them exactly like official content. Library and picker lists hide one-off rows with a client-side filter.

**Tech Stack:** Expo / React Native, expo-router, Supabase, Zod, zustand, Jest (`jest-expo`). Verify with `npx tsc --noEmit` and `npx jest -c <override> <path>` (the repo `jest.config.js` ignores `.claude/worktrees/`, so use a config override with `rootDir` set to the worktree); `npm run lint:tokens` rejects off-scale spacing utilities such as `w-10` and `pr-10`.

**Spec:** `docs/superpowers/specs/2026-11-03-custom-class-species-background-design.md` (extends `2026-11-02-flexible-character-creation-design.md`).

## Global Constraints

- Name is the only required field of a custom entry; class and name remain the only requirements to create a character.
- A one-off entry is an owner-scoped content row flagged `data.one_off`, hidden from the Homebrew library and from every picker; "Add to my homebrew library" clears the flag. No database migration unless unavoidable (then say so).
- The content row is created when the character is created, not while the form is open; backing out, changing class or abandoning the wizard leaves no stray rows.
- Empty extras are written as explicit defaults so the row always passes the kind's Zod schema: class hit die 8, no skill picks, no saves, no primary abilities; species speed 30, size Medium; background no skills.
- Class skill picks: the "comes from" list is a picker over the 18 SRD skills; the count is clamped to the list length and never blocks. Origin feat and tool proficiency are free text.
- A custom name matching an official one (case-insensitive) shows a non-blocking note ("An official class has this name; picking it applies that class's rules"); custom rows always get a unique slug.
- The library choice is offered in the form only. Official classes, species, backgrounds and existing homebrew keep their current behavior.
- Use existing Night Vigil components and theme tokens only; nothing is pushed without the owner's go-ahead.

## Review Focus

1. A custom class with every extra empty creates a character with a d8 hit die and hit points from it, no skill picks, and a content row that passes `classData`.
2. A one-off entry never appears in the Homebrew library list or in any picker for other characters; a library entry does.
3. Switching from a custom class to an official one (and back) leaves no content row, no stale cached class fields (`class_skills`, skill options, hit die), and no stale pending entry.
4. An empty or whitespace-only custom name cannot be submitted and does not crash; a very long name is capped at 80 characters.
5. Two custom entries with the same name (one-off) both save (unique slugs); a custom class named "Fighter" shows the collision note and still works.
6. If creating a custom row or the picks fails, the character is not left half-created (existing rollback) and created rows are removed best-effort.

---

### Task 1: Data layer for one-off entries

**Files:**
- Modify: `src/systems/dnd5e-2024/schemas.ts` (add `one_off: z.boolean().optional()` to `classData`, `speciesData`, `backgroundData`)
- Modify: `src/systems/dnd5e-2024/definition.ts` (class kind `homebrew: true`)
- Modify: `src/features/content/content.api.ts` (`SaveHomebrewInput.slug?: string`; `listContent` hides one-off rows for scopes `'mine'` and `'pickable'`)
- Test: `__tests__/systems/dnd5e-2024/schemas.test.ts`, `__tests__/features/content/content.api.test.ts`

**Interfaces:**
- Produces: `SaveHomebrewInput.slug?: string` (used verbatim instead of `slugify(name)` when given); `listContent` unchanged signature but excludes rows whose `data->>one_off` is `'true'` for `'mine'` and `'pickable'`; D&D class, species and background `data` may carry `one_off?: boolean`.

- [ ] **Step 1: Write failing tests.** Schemas: `dnd5eContentSchemas.class.parse({hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [], one_off: true})` keeps `one_off: true` (and likewise species and background); old data without it still parses. Content API (follow the file's existing supabase mock): `saveHomebrew({..., slug: 'my-class-ab12'})` inserts with that slug; `listContent` for `'mine'` and `'pickable'` adds a filter excluding one-off rows (assert the filter string passed to the query builder includes `data->>one_off`); `'official'` and campaign scopes are unchanged. Definition: `getSystem('dnd5e-2024').contentKinds.class.homebrew` is `true`; update any existing test that asserts the homebrew kind list.
- [ ] **Step 2: Run** `npx jest -c <override> __tests__/systems/dnd5e-2024/schemas.test.ts __tests__/features/content/content.api.test.ts` and confirm failure.
- [ ] **Step 3: Implement.** The filter is `data->>one_off.is.null,data->>one_off.neq.true` applied as an `or` (NULL rows must stay visible, which a plain `neq` would drop); verify it combines with `pickableFilter`'s own `or` as an AND (separate `or` parameters) and note the verification in the commit message.
- [ ] **Step 4: Run the same tests plus `npx tsc --noEmit`.** Expected: pass, no new type errors.
- [ ] **Step 5: Commit** `feat: one-off flag for custom content, classes become homebrew-able`.

---

### Task 2: Custom entry module

**Files:**
- Create: `src/systems/dnd5e-2024/customEntries.ts`
- Test: `__tests__/systems/dnd5e-2024/customEntries.test.ts`

**Interfaces:**
- Produces:
  - `type CustomKind = 'class' | 'species' | 'background'`
  - `type CustomEntry = { name: string; description: string; library: boolean; extras: Record<string, unknown> }` (extras keyed by field key; class also uses `skill_count: number` and `skill_from: string[]`)
  - `customExtraFields(kind: CustomKind): FieldDef[]` (from `DND_CONTENT_KIND_META[kind].fields`, all treated as optional; for `class` also exposes `skill_count` and `skill_from` over the 18 `SKILLS` keys)
  - `customData(kind: CustomKind, extras: Record<string, unknown>, oneOff: boolean): unknown` returning data that passes `dnd5eContentSchemas[kind]` with explicit defaults (class `hit_die` 8, `features.skill_choices` only when count > 0 with count clamped to `skill_from.length`; species speed 30, size 'Medium'; background `skill_proficiencies: []`), and `one_off: true` when `oneOff`
  - `cachedClassFields(entry: CustomEntry): { class_name: string; hit_die: number; class_skill_count: number; class_skill_options: string[]; class_features: string[]; class_equipment_options: string[] }` (the draft cache that `ClassStep` fills for an official class; features and equipment options empty)
  - `collidesWithOfficial(name: string, officialNames: string[]): boolean` (trimmed, case-insensitive)
  - `cleanName(name: string): string` (trim, collapse inner whitespace, cap 80)

- [ ] **Step 1: Write failing tests.** For each kind, `customData(kind, {}, true)` parses against `dnd5eContentSchemas[kind]` and equals the defaults above plus `one_off: true`; `customData('class', {hit_die: '10', skill_count: 5, skill_from: ['stealth','arcana']}, false)` has `hit_die` 10 (number) and `skill_choices` `{count: 2, from: ['stealth','arcana']}` and no `one_off`; `cachedClassFields` of an entry with no extras gives hit die 8, count 0, empty arrays; `collidesWithOfficial(' fighter ', ['Fighter'])` is true; `cleanName('  A   B  ')` is `'A B'` and a 100-char name is cut to 80.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** the signatures above; keep it pure (no React, no network).
- [ ] **Step 4: Run tests and `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: custom class, species and background data helpers`.

---

### Task 3: Draft, pruning and character conversion

**Files:**
- Modify: `src/systems/dnd5e-2024/draft.ts`, `src/systems/types.ts` (`NewCharacter.custom`)
- Test: `__tests__/systems/dnd5e-2024/rules.test.ts` (draft tests live there), `__tests__/features/characters/builder.store.test.ts`

**Interfaces:**
- Consumes: `CustomEntry`, `CustomKind`, `customData`, `cachedClassFields` (Task 2).
- Produces:
  - `NewCustomContent = { kind: CustomKind; name: string; description: string; data: unknown; library: boolean; pick: { state: Record<string, unknown>; acquired_at_level: number } }` and optional `NewCharacter.custom?: NewCustomContent[]` in `types.ts` (system-agnostic: `kind: string`).
  - Draft keys `class_custom`, `species_custom`, `background_custom`: `CustomEntry | null` (default `null`).
  - `pruneDraft`: choosing an official id (`class_id`/`species_id`/`background_id` non-null in the patch) sets the matching `*_custom` to null; setting a `*_custom` sets the matching id to null; a change of `class_custom` counts as a class change (clears `class_skills`, `class_choices`, spells fit) exactly like an id change; custom background sets `bg_abilities: []` and `bg_skills` from its extras.
  - `canCreate(draft)`: true iff (non-empty `class_id` OR `class_custom` with a non-blank name) AND a non-blank `name`.
  - `toCharacter` emits picks only for official ids and, for each non-null `*_custom`, one `custom` entry (`name` via `cleanName`, `data` from `customData(kind, extras, !library)`, pick state `{ skills, choices }` for the class using the same values the official class pick gets, `{}` for species and background; acquired level 1).

- [ ] **Step 1: Write failing tests.** `canCreate` with only `class_custom: {name:'Warden',...}` and a name is true; blank custom name false. `pruneDraft` from an official class with `class_skills` and `class_choices` then `update({class_custom: entry, class_id: null})` clears both; the reverse sets `class_custom` null; a custom class with `skill_count: 2, skill_from: ['stealth','arcana']` caches skill count 2 and options. `toCharacter` for a custom class and species: `picks` has no class or species pick, `custom` has two entries with the expected `kind`, `pick.state`, and `data` passing `dnd5eContentSchemas`; HP uses the custom hit die (default 8 when empty). Official-only drafts produce `custom` empty or absent and the same `picks` as before (existing tests keep passing).
- [ ] **Step 2: Run** `npx jest -c <override> __tests__/systems/dnd5e-2024 __tests__/features/characters/builder.store.test.ts` and confirm failure.
- [ ] **Step 3: Implement** per the interfaces; document the new draft keys in the draft-keys comment.
- [ ] **Step 4: Run the same tests plus `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: wizard draft holds custom class, species and background`.

---

### Task 4: Create custom content rows with the character

**Files:**
- Modify: `src/features/characters/characters.api.ts` (`createCharacter`), `src/features/content/content.api.ts` (export a helper if needed)
- Test: `__tests__/features/characters/characters.api.test.ts`

**Interfaces:**
- Consumes: `NewCharacter.custom` (Task 3), `saveHomebrew` with `slug` (Task 1).
- Produces: `createCharacter(input)` creates, after the character insert and before the picks insert, one owner-scoped content row per `input.custom` entry via `saveHomebrew({ systemId, kind, name, description, data, slug })` with `slug = \`${slugify(name)}-${suffix}\`` (`suffix` 6 random lowercase alphanumerics), then inserts picks for official ids plus one pick per created row `{ content_id: row.id, kind, state: entry.pick.state, acquired_at_level: entry.pick.acquired_at_level }`. On any failure it deletes the character (existing rollback) and best-effort deletes the content rows it created.

- [ ] **Step 1: Write failing tests** (follow the file's supabase mock): with `custom: [class entry]` the insert order is character, content row (slug starts with `slugify(name) + '-'`, `data.one_off` true when `library` is false and absent when true), then picks containing the new row's id and the entry's state; two entries with the same name get different slugs; a picks failure removes the character and deletes the created row(s); official-only input behaves exactly as before.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** `createCharacter` as specified.
- [ ] **Step 4: Run the same tests plus `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: create custom content rows when a character is created`.

---

### Task 5: Custom entry form

**Files:**
- Create: `src/features/characters/builder/CustomEntryForm.tsx`
- Test: `__tests__/features/characters/CustomEntryForm.test.tsx`

**Interfaces:**
- Consumes: `FieldDef` (`src/systems/types.ts`), `collidesWithOfficial`, `cleanName` (Task 2 helpers are injected by props so this component stays system-agnostic).
- Produces: `CustomEntryForm(props: { kindLabel: string; fields: FieldDef[]; initial?: { name: string; description: string; library: boolean; extras: Record<string, unknown> }; officialNames: string[]; onSubmit(entry: { name: string; description: string; library: boolean; extras: Record<string, unknown> }): void; onCancel(): void })`. Renders: name `Input` (required to enable the Save button), multiline description, one control per `FieldDef` (text → `Input`, number → numeric `Input`, boolean → toggle `Chip`, select → `ToggleChip` row, multiselect → `ToggleChip` row), a toggle "Add to my homebrew library" (default off), and the collision note when `collidesWithOfficial(name, officialNames)`. The collision note never disables Save.

- [ ] **Step 1: Write failing tests:** Save is disabled for empty and whitespace-only names and enabled otherwise; Save calls `onSubmit` with the trimmed name, description, `library: false` by default, and extras containing only fields the user filled; toggling the library chip submits `library: true`; typing an official name shows the note text "An official class has this name; picking it applies that class's rules" (the sentence uses the `kindLabel` lowercased) and Save stays enabled; a 100-character name is capped at 80; `initial` values prefill; Cancel calls `onCancel`.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** with existing components (`Input`, `Button`, `ToggleChip`, `Text`, `SectionHeader`) and tokens only.
- [ ] **Step 4: Run tests, `npm run lint:tokens` and `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: form for making your own class, species or background`.

---

### Task 6: Wizard steps and Review

**Files:**
- Modify: `src/systems/dnd5e-2024/steps/ClassStep.tsx`, `src/systems/dnd5e-2024/steps/OriginStep.tsx`, `src/systems/dnd5e-2024/steps/ReviewStep.tsx`
- Test: `__tests__/systems/dnd5e-2024/steps.test.tsx`

**Interfaces:**
- Consumes: `CustomEntryForm` (Task 5), `customExtraFields`, `customData`, `cachedClassFields`, `CustomEntry` (Task 2), draft keys and `pruneDraft` behavior (Task 3).
- Produces: in each of the Class step, the Background section and the Species section, a "Make your own" card at the end of the list that opens `CustomEntryForm` inline; submitting calls `update` once with `{ class_custom: entry, class_id: null, ...cachedClassFields(entry) }` (species: `{ species_custom: entry, species_id: null }`; background: `{ background_custom: entry, background_id: null, bg_abilities: [], bg_skills: <skill extras> }`). A pending custom entry shows as a selected `ChoiceCard` with a "Custom" badge and Edit and Remove actions (Remove sets the `*_custom` key to null and clears the cached fields). Class cards for the user's saved homebrew classes show the "Homebrew" badge like species and backgrounds. `ReviewStep` shows the custom entry's name in the hero card and badges (the class line uses `draft.class_name`, which `cachedClassFields` fills).

- [ ] **Step 1: Write failing tests** (follow the file's harness and content mocks): the Class step lists "Make your own"; filling the form (name only) and saving calls `update` with `class_custom` named as typed, `class_id: null`, `hit_die: 8`, `class_skill_count: 0`, `class_features: []`; picking an official class afterwards calls `update` with the official id and (via `pruneDraft`) leaves `class_custom` null; Remove clears the custom entry; the same save/remove flow for species and for a background with two typed skills (`bg_skills` has them); a saved homebrew class shows the Homebrew badge; Review shows the custom class name; a custom class with skill picks makes the Skills step appear with its options (use `visibleSteps`), and one with no extras skips it.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** per the interfaces, reusing `OpenChoiceField`/`ChoiceCard` patterns already in the steps.
- [ ] **Step 4: Run the full suite, `npm run lint:tokens` and `npx tsc --noEmit`.** Expected: everything passes; no new type errors.
- [ ] **Step 5: Commit** `feat: make your own class, species or background in the wizard`.

---

### Task 7: End-to-end checks

**Files:**
- Test: `__tests__/systems/dnd5e-2024/custom-entries.flow.test.ts`

**Interfaces:**
- Consumes: `initialDraft`, `pruneDraft`, `toCharacter`, `canCreate` (Task 3), `createCharacter` (Task 4), `listContent` filter (Task 1).

- [ ] **Step 1: Write the flow tests** (no new production code; fix only what they reveal): (a) a draft with a custom class (all extras empty), a custom species and a custom background, a name, and nothing else: `canCreate` true, `toCharacter` HP equals `8 + CON modifier`, `custom` has three entries whose `data` all parse, `picks` empty of those kinds; (b) with a mocked supabase, `createCharacter` on that input writes three content rows then picks pointing at them, and the one-off flag is present on all three; with `library: true` on the class it is absent on that row only; (c) `listContent` for `'mine'` and `'pickable'` excludes rows flagged one-off and includes library rows; (d) switching custom class → official class → custom class leaves exactly one pending class entry and no stale `class_skills`/`class_choices`; (e) two custom classes with the same name produce different slugs; (f) a custom class named " fighter " keeps working (class name matching is by trimmed, case-insensitive name) and `collidesWithOfficial` reports it.
- [ ] **Step 2: Run** `npx jest -c <override> __tests__/systems/dnd5e-2024/custom-entries.flow.test.ts`; fix any production bug it exposes in the owning file and say so in the commit message.
- [ ] **Step 3: Run the full suite, `npm run lint:tokens` and `npx tsc --noEmit`.** Expected: pass, no new type errors.
- [ ] **Step 4: Commit** `test: end-to-end checks for custom class, species and background`.
