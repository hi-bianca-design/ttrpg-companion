# Party Card: Languages and Spell Save DC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A character's languages and a caster's spell save DC exist as real data, show on the Character tab, and appear in the expanded party card.

**Architecture:** Spell save DC is computed, never stored: a class → spellcasting-ability table in `rules.ts` (official classes) with an optional `spellcasting_ability` on homebrew class data, `8 + proficiency bonus + ability modifier`, one result per casting class pick. Languages are stored: `details.languages: string[]` on the `characters` row (no migration), written by the builder at Create and editable on the Character tab; existing characters are "not set" until their owner saves. Both feed the `more: SummaryItem[]` list of the Phase 1 `partySummary` hook, so they ride on Phase 1's live `details` merge and its recompute of derived values.

**Tech Stack:** Expo Router, React Query, Zod, NativeWind, jest-expo. No database change.

**Spec:** `docs/superpowers/specs/2026-11-03-party-and-combat-design.md` (Phase 1: "Deferred: languages and spell save DC", and "Calls made while writing this"). Builds on `docs/superpowers/plans/2026-11-03-party-page-live-stats.md`; read both.

## Findings that shaped this plan (verified in the repo)

- **No language data exists, and none should be extracted.** 2024 species grant no languages; the 2024 background step grants Common plus two of the player's choice. The seed species and background rows are therefore correct as they are. `supabase/seed/dnd5e-2024/*.json` is not touched.
- **No mapping from class to spellcasting ability exists** (`rules.ts` has slot, cantrip and prepared tables only). All eight casting classes are in `SPELLCASTING_CLASSES`.
- **The app has no multiclassing.** One `class` pick; `slotsFor`, `hasSlots` and the builder all take a single class name. The DC function still returns a list, one entry per class pick, so a future multiclass character needs no reshape.
- **Subclass casters** (Eldritch Knight, Arcane Trickster) are not in the seed (the 12 seed subclasses have none), so they are out of scope.
- **Characters are written wholesale into `details`** (`update.mutate({ details: { ...character.details, … } })`, as inspiration does); `dnd5eDetailsSchema` is a non-strict object, so old rows without `languages` still parse.
- The Character tab (`app/(app)/characters/[id]/index.tsx`) renders system sections (`proficiencies`, `profile`); spell slots live on the Actions screen, not here.

## Decisions

| | Spell save DC | Languages |
|---|---|---|
| Source | Code table for official classes; `data.spellcasting_ability` (optional) on homebrew classes, which wins when present | `details.languages` (new, optional array of strings) |
| Stored? | No, derived on read (stat or level changes are picked up) | Yes, the full list the character knows |
| New characters | n/a | Builder writes Common + class-granted + species/background-granted + the player's choices |
| Existing characters | Nothing to do | "Not set": no migration, no silent write. The Character tab offers a prefilled editor (Common + class-granted) the owner confirms with one tap |
| Party card, unknown | Row omitted (non-caster, or homebrew class with no ability) | Row shown as `Not set` when unset or empty (every character knows Common, so an empty list always means "not recorded"); the owner's own Character tab prompts them to fill it in |
| Character tab | New `spellcasting` section: `Spell save DC 14` with `Wizard · Intelligence` | New `languages` section with an Edit button, owner only |
| Multiclass | One row per casting class, labelled by class when there is more than one | Union, deduped |
| Homebrew species/background | Not applicable | Optional free-text `Languages` field (comma separated) on the content form; builder reads it when picked, and for a "make your own" one-off |
| Editing | Not editable (derived) | Free text only, no fixed list. Editable on the Character tab at any time, not just at creation. Level-up never prompts for languages |

## Global Constraints

- **Phase 1 first for the party-card task.** Task 7 edits `partySummary` in `src/systems/dnd5e-2024/rules.ts` and the types from Phase 1 Task 2 (`SummaryItem`, `PartySummary`). Tasks 1-6 are independent of Phase 1 and can land earlier. Do not start Task 7 until Phase 1 Task 2 is on the branch.
- **No database change.** No migration, no seed regeneration, no write to any shared database. `npm run db:seed` output must be unchanged.
- **Free text only (owner decision).** No fixed language list and no chips of standard languages; players type them. `Common` is prefilled and class-granted languages (Druidic, Thieves' Cant) are added automatically.
- **Never blocks.** Language count is a hint ("2 chosen"), not a gate; `canCreate` stays name + class (existing rule). A homebrew class without a spellcasting ability just has no DC.
- **Read-only party page.** No control on `PartyCard` edits languages or anything else; editing is the owner's Character tab only.
- **Order of `more` on the card:** `passive_insight`, `passive_investigation`, `darkvision`, `spell_save_dc`, `languages`, `inspiration`. Item keys: `spell_save_dc`, or `spell_save_dc_<class lowercase>` when a character has more than one casting class; `languages`.
- **Language text rules:** entries trimmed, internal whitespace collapsed, case-insensitive dedupe keeping the first spelling, empties dropped, each entry at most 40 characters, at most 30 entries, `Common` always first.
- **Freshness (PRD call):** `details` changes (languages) arrive live; the DC is derived on the phone, so an ability-score change shows on other phones on the Phase 1 refresh (open, pull-to-refresh, 60 s), not instantly.
- Design system: tokens only, 44pt targets, no `rounded-full`, red only for destructive/error. Jest in a `.claude/worktrees` checkout runs through the CLI ignore-list override described in Phase 1's Global Constraints; the known `pr-10` lint failure at `app/(app)/characters/index.tsx:33` on `main` is tolerated, nothing else.
- Do not push, open a PR, or apply anything to a shared database without the owner's confirmation.

## Review Focus

1. **Existing characters.** A row with no `details.languages` parses, shows `Not set` on the party card, shows "No languages recorded yet" on the Character tab, and is never written to until the owner saves the editor. (Tasks 3, 5, 7)
2. **Right ability, right classes.** Cleric uses Wisdom (not Intelligence); Paladin and Ranger get a DC; Fighter, Barbarian, Monk and Rogue show no DC row at all (never "DC 8"). (Tasks 1, 6, 7)
3. **Homebrew with missing data.** A custom class with no `spellcasting_ability`, a custom species/background with no `languages`, and a one-off that is never saved to the library all build, create and render without a crash or a placeholder. (Tasks 1, 2, 3, 4)
4. **Messy language text.** `elvish`, `Elvish `, `ELVISH` collapse to one; blank entries vanish; a 200-character entry is cut; 40 languages cap at 30; `Common` stays first. (Tasks 3, 5)
5. **Shape for more than one class and long lists.** Two class picks yield two labelled DC rows; a character with 12 languages wraps on the expanded card without overflow. (Tasks 1, 6, 7)

---

## File Structure

- Create `src/systems/dnd5e-2024/languages.ts` (list, class grants, normalise, starting set), `src/systems/dnd5e-2024/sheet/LanguagesSection.tsx`, `LanguagesSheet.tsx`, `SpellcastingSection.tsx`.
- Modify `src/systems/dnd5e-2024/rules.ts` (DC), `definition.ts` (form fields), `schemas.ts` (class/species/background/details), `customEntries.ts` (homebrew data), `draft.ts` (keys, prune, `toCharacter`), `steps/OriginStep.tsx`, `steps/ReviewStep.tsx`, `index.ts` (register sections), `src/systems/types.ts` (`onSaveDetails` on `SheetSectionProps`), `app/(app)/characters/[id]/index.tsx` (mount, wire save).
- Tests under `__tests__/systems/dnd5e-2024/` (new: `spell-dc.test.ts`, `languages.test.ts`, `languages-section.test.tsx`, `spellcasting-section.test.tsx`, `party-summary-extras.test.ts`; extended: `schemas.test.ts`, `customEntries.test.ts`, `steps.test.tsx`).

### Task 1: Spell save DC rule

**Files:** Modify `src/systems/dnd5e-2024/rules.ts`; Test `__tests__/systems/dnd5e-2024/spell-dc.test.ts`.

**Interfaces:**
- Consumes: `getAbilityModifier`, `getProficiencyBonus`, `sameName`, `AbilityKey`.
- Produces: `SPELLCASTING_ABILITY: Record<string, AbilityKey>` (lowercase class name → ability: bard/paladin/sorcerer/warlock `charisma`, cleric/druid/ranger `wisdom`, wizard `intelligence`); `type SpellSaveDC = { className: string; ability: AbilityKey; dc: number }`; `spellSaveDCs(c: CharacterRecord, picks: PickRecord[]): SpellSaveDC[]` — one entry per `class` pick in pick order, `dc = 8 + proficiency(c.level) + mod(ability)`; a pick with `content.data.spellcasting_ability` set to a valid ability key uses that (homebrew), else the table by lowercase name, else is skipped. Missing stat counts as 10.

- [ ] **Step 1: Write the failing tests** (`spell-dc.test.ts`): Wizard L1 with Intelligence 16 → `[{ className: 'Wizard', ability: 'intelligence', dc: 13 }]`; same at level 5 → 14; Cleric with Intelligence 18 and Wisdom 12 → ability `wisdom`, dc 12 (level 1); table covers all eight classes with the abilities above; Fighter, Barbarian, Monk, Rogue → `[]`; no class pick → `[]`; homebrew class `{ name: 'Mystic', data: { spellcasting_ability: 'charisma' } }` with Charisma 14 at level 1 → dc 13; homebrew class with no ability → `[]`; homebrew data with an invalid ability string (`'luck'`) → `[]`; two class picks (Wizard then Cleric, synthetic) → two entries in pick order, both using total character level for the proficiency bonus; missing `intelligence` stat → treated as 10 (dc `8 + 2 + 0 = 10` at level 1); class name matching is case-insensitive (`'WIZARD'`).
- [ ] **Step 2: Run to verify they fail** (`spellSaveDCs` not exported).
- [ ] **Step 3: Implement** the table, type and `spellSaveDCs` in `rules.ts`. Reuse `asRecord` already in the file for `content.data`.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: spell save DC rule for D&D casters`.

### Task 2: Homebrew class spellcasting ability

**Files:** Modify `src/systems/dnd5e-2024/schemas.ts`, `definition.ts`, `customEntries.ts`; Test `__tests__/systems/dnd5e-2024/schemas.test.ts`, `customEntries.test.ts`.

**Interfaces:**
- Produces: `classData.spellcasting_ability?: AbilityKey` in the content schema (optional; invalid values rejected); a class form field `{ key: 'spellcasting_ability', label: 'Spellcasting ability', type: 'select', options: [...ABILITY_KEYS] }` (not required) in `DND_CONTENT_KIND_META.class`; `customData('class', extras, oneOff)` includes `spellcasting_ability` only when `extras.spellcasting_ability` is a valid ability key.

- [ ] **Step 1: Write failing tests:** the class schema accepts data with and without `spellcasting_ability: 'intelligence'` and rejects `'luck'`; every official seed class row still parses (existing seed-validation test must stay green); `customData('class', { spellcasting_ability: 'wisdom' }, false)` includes it; with `''`, `undefined` or `'luck'` it is omitted; the output always parses with the class schema; `customExtraFields('class')` contains the new field with `required: false`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the schema line, the META field (the content form in `src/features/content/ContentForm.tsx` and the wizard's make-your-own form both render from META, so check both show it and neither needs code), and the `customData` branch.
- [ ] **Step 4: Run to verify they pass**, then the full suite and `npm run db:seed` (generated seed unchanged).
- [ ] **Step 5: Commit** `feat: spellcasting ability on homebrew classes`.

### Task 3: Language data model and helpers

**Files:** Create `src/systems/dnd5e-2024/languages.ts`; Modify `schemas.ts`, `definition.ts`, `customEntries.ts`; Test `__tests__/systems/dnd5e-2024/languages.test.ts`, `schemas.test.ts`, `customEntries.test.ts`.

**Interfaces:**
- Produces in `languages.ts`: `CLASS_LANGUAGES: Record<string, string[]>` (`druid: ['Druidic']`, `rogue: ["Thieves' Cant"]`, lowercase keys); `normalizeLanguages(list: unknown): string[]` (Global Constraints rules; non-arrays and non-strings → `[]`); `startingLanguages(input: { className: string; species: string[]; background: string[]; chosen: string[] }): string[]` = `normalizeLanguages(['Common', ...classGrants, ...species, ...background, ...chosen])`; `characterLanguages(c: CharacterRecord): string[] | null` — `null` when `details.languages` is not an array (unset), else the normalised list (an explicit empty array → `[]`, which callers treat as unset for display).
- Schema: `dnd5eDetailsSchema.languages: z.array(z.string()).optional()`; `speciesData.languages` and `backgroundData.languages: z.array(z.string()).optional()`; META fields `{ key: 'languages', label: 'Languages (comma separated)', type: 'text' }` on species and background (not required); `customData` for species and background splits that text on commas, runs `normalizeLanguages` minus `Common`, and omits the key when nothing is left. Also `parseLanguageText(text: string): string[]` in `languages.ts` (split on commas and newlines, then `normalizeLanguages`).

- [ ] **Step 1: Verify the two class grants against SRD 5.2** (Druid → Druidic, Rogue → Thieves' Cant, and that no other SRD class or species grants a language); correct `CLASS_LANGUAGES` if they differ, and note the check in the commit message.
- [ ] **Step 2: Write failing tests:** `normalizeLanguages(['  elvish ', 'Elvish', 'ELVISH', '', '   ', 'Dwarvish'])` → `['elvish', 'Dwarvish']` (first spelling kept); a 200-char entry is cut to 40; 40 distinct entries cap at 30; `startingLanguages` puts `Common` first even when `chosen` lists `Elvish, Common`; Druid adds `Druidic`, Rogue adds `Thieves' Cant`, Fighter adds nothing, class matching is case-insensitive; species/background grants merge and dedupe; `characterLanguages` returns `null` for details `{}` and `{ languages: 'Elvish' }`, `[]` for `{ languages: [] }`, the normalised list otherwise; the details schema parses a row with and without `languages` and rejects `languages: [1]`; species/background schemas accept and omit `languages`; `customData('species', { languages: 'Elvish, Sylvan , elvish' }, false)` gives `languages: ['Elvish', 'Sylvan']`, and with blank or missing text omits the key; `parseLanguageText('Elvish,\nDwarvish')` → `['Elvish', 'Dwarvish']`.
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement** `languages.ts`, the schema lines, the META fields and the two `customData` branches.
- [ ] **Step 5: Run to verify they pass**, then the full suite and `npm run db:seed` (unchanged).
- [ ] **Step 6: Commit** `feat: language data model for D&D characters`.

### Task 4: Builder: choose languages at creation

**Files:** Modify `src/systems/dnd5e-2024/draft.ts`, `steps/OriginStep.tsx`, `steps/ReviewStep.tsx`; Test `__tests__/systems/dnd5e-2024/steps.test.tsx`, `custom-entries.flow.test.ts`, and a new `__tests__/systems/dnd5e-2024/draft-languages.test.ts`.

**Interfaces:**
- Consumes: `startingLanguages`, `normalizeLanguages`, `customData`.
- Produces: draft keys `languages_chosen: string[]` (the player's picks and typed extras; default `[]`), `species_languages: string[]` and `bg_languages: string[]` (grants cached when a species/background is picked, default `[]`, the same cache pattern as `bg_skills`). `pruneDraft`: a species change resets `species_languages` and a background change resets `bg_languages` unless the patch sets them; for a custom species/background entry they are taken from its extras via `customData`; `languages_chosen` is never pruned. `toCharacter` writes `details.languages = startingLanguages({ className: class_name, species: species_languages, background: bg_languages, chosen: languages_chosen })`. Documented in the draft-keys comment.

- [ ] **Step 1: Write failing tests:** `initialDraft()` has the three keys as `[]`; `toCharacter` for a Wizard with `languages_chosen: ['Elvish', 'Dwarvish']` has `details.languages` `['Common', 'Elvish', 'Dwarvish']`; a Druid draft adds `Druidic`; a draft with nothing chosen still has `['Common']`; changing class from Druid to Wizard removes `Druidic`; picking a homebrew species whose data has `languages: ['Sylvan']` (via the patch) and then another species resets `species_languages`; a custom species entry with `extras.languages: ['Sylvan']` flows into `details.languages`; a custom one-off background with no languages adds nothing; a draft loaded from before these keys existed (keys absent) builds without throwing; `OriginStep` renders a Languages section with `Common` shown as fixed and not removable, a text field that adds a typed language to `languages_chosen` (blank and duplicate input ignored), each added language shown as a removable chip, a caption `2 chosen` that is informational only (create stays enabled with zero chosen); `ReviewStep` lists the final languages.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the draft changes (`initialDraft`, `pruneDraft`, `toCharacter`, comment), the OriginStep section (an `Input` plus an `Add` button, chips for the added ones; no preset list), pick handlers that cache the grants (`data.languages ?? []`) for official content, and the Review row.
- [ ] **Step 4: Run to verify they pass**, then the full suite.
- [ ] **Step 5: Commit** `feat: choose languages in the character builder`.

### Task 5: Character tab: languages section and editor

**Files:** Create `src/systems/dnd5e-2024/sheet/LanguagesSection.tsx`, `sheet/LanguagesSheet.tsx`; Modify `src/systems/types.ts`, `src/systems/dnd5e-2024/index.ts`, `app/(app)/characters/[id]/index.tsx`; Test `__tests__/systems/dnd5e-2024/languages-section.test.tsx`, the existing character-screen test.

**Interfaces:**
- Consumes: `characterLanguages`, `startingLanguages`, `normalizeLanguages`, `AdjustSheet`, `ToggleChip`/chip styling (as `ConditionsSheet` does).
- Produces: `SheetSectionProps.onSaveDetails?: (patch: Record<string, unknown>) => void` (merge-patch into `details`; the screen implements it as `update.mutate({ details: { ...character.details, ...patch } }, onSaveError)`, the inspiration pattern); `LanguagesSection` registered as `sheet.sections.languages` — a collapsible `Languages` section listing the languages as chips, an `Edit languages` button (44pt) shown whenever `onSaveDetails` is passed (set or unset; editable at any time, never tied to level-up), and for an unset list the text `No languages recorded yet` plus an `Add languages` button; `LanguagesSheet({ open, onOpenChange, value, onApply })` — the current languages as removable chips (`Common` not removable), a text field to add one, `Apply` calls `onApply(normalizeLanguages(next))`. When unset, the sheet opens prefilled with `startingLanguages({ className, species: [], background: [], chosen: [] })` so one tap on `Apply` records Common and class-granted languages; nothing is written before `Apply`.

- [ ] **Step 1: Write failing tests:** a character with `details.languages` shows each language; with `details` `{}` shows `No languages recorded yet` and `Add languages`, and `onSaveDetails` is not called on render; without `onSaveDetails` no edit control renders; opening the sheet for an unset Druid shows `Common` and `Druidic` selected; applying calls `onSaveDetails({ languages: ['Common', 'Druidic'] })`; adding ` elvish ` then `Elvish` once yields one entry; removing a typed language drops it; the editor never allows removing `Common` (Common is always kept first); applying the unchanged list is a no-op or an identical write (assert one call, no error); a 200-character typed entry is cut to 40.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the section, sheet, type addition, registration and screen wiring; render the section after `Profile` on the Character tab, owner screen only.
- [ ] **Step 4: Run to verify they pass**, then the full suite and the lint wrapper.
- [ ] **Step 5: Commit** `feat: languages section on the character sheet`.

### Task 6: Character tab: spellcasting section

**Files:** Create `src/systems/dnd5e-2024/sheet/SpellcastingSection.tsx`; Modify `src/systems/dnd5e-2024/index.ts`, `app/(app)/characters/[id]/index.tsx`; Test `__tests__/systems/dnd5e-2024/spellcasting-section.test.tsx`.

**Interfaces:**
- Consumes: `spellSaveDCs` (Task 1).
- Produces: `SpellcastingSection` registered as `sheet.sections.spellcasting` — a collapsible `Spellcasting` section with one row per casting class: `Spell save DC`, the number, and `Wizard · Intelligence` as the sub-line (the class name is the label's qualifier only when more than one row); renders nothing for a non-caster. Mounted after `Proficiencies`.

- [ ] **Step 1: Write failing tests:** a level-5 Wizard with Intelligence 16 shows `14` and `Wizard · Intelligence`; a Fighter renders nothing (section header absent); a synthetic Wizard + Cleric shows two rows each naming its class; a homebrew class without an ability renders nothing; the number is plain text (screen-reader label `Spell save DC 14`).
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the section and mount it.
- [ ] **Step 4: Run to verify they pass**, then the full suite and the lint wrapper.
- [ ] **Step 5: Commit** `feat: spellcasting section on the character sheet`.

### Task 7: Party card items (after Phase 1 Task 2)

**Files:** Modify `src/systems/dnd5e-2024/rules.ts` (`partySummary`, from Phase 1 Task 2); Test `__tests__/systems/dnd5e-2024/party-summary-extras.test.ts`, and one case appended to Phase 1's `__tests__/features/party/PartyCard.test.tsx`.

**Interfaces:**
- Consumes: `spellSaveDCs`, `characterLanguages`, Phase 1's `SummaryItem` and `partySummary(c, picks): PartySummary`.
- Produces: in `more`, per Global Constraints order: one `{ key: 'spell_save_dc', label: 'Spell save DC', value: '14' }` per casting class (key `spell_save_dc_<class lowercase>` and label `Spell save DC (Wizard)` when more than one); `{ key: 'languages', label: 'Languages', value: 'Common, Elvish, Dwarvish' }` when `characterLanguages` is a non-empty list, otherwise `{ key: 'languages', label: 'Languages', value: 'Not set' }` (unset or empty). Neither item is ever in `glance`.

- [ ] **Step 1: Write failing tests:** a Wizard L5 Int 16 has `spell_save_dc` `14`; a Fighter has no DC item; a homebrew class with `spellcasting_ability` has one, without has none; two class picks give two keyed, labelled items; languages `['Common','Elvish']` → `Common, Elvish`; unset (`details: {}`) and `[]` → `languages` item with value `Not set`; the three-way ordering (`darkvision` < `spell_save_dc` < `languages` < `inspiration`) holds with all present; Phase 1's existing `partySummary` tests still pass unchanged; in the card test, a character with 12 languages renders the expanded value on multiple lines without truncation, and an unset one renders `Not set`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** by appending the two item groups to `more` in the documented order.
- [ ] **Step 4: Run to verify they pass**, then the full suite, `npx tsc --noEmit` and the lint wrapper.
- [ ] **Step 5: Commit** `feat: languages and spell save DC on the party card`.

### Task 8: Verify

- [ ] **Step 1:** Run the whole jest suite (ignore-list override), `npx tsc --noEmit`, the lint wrapper and `npm run db:seed`; confirm the generated seed has no diff.
- [ ] **Step 2:** In the simulator or browser with a local or the owner-approved project: create a Druid with two chosen languages and check the Character tab shows Common, Druidic and the two; open an existing character (no languages) and confirm the not-set state, then apply the prefilled editor; check a Wizard's DC against a hand calculation; open the Party page as a teammate and confirm both rows in the expanded card, and that a teammate's change to languages appears within about 2 seconds and an ability-score change on the next refresh.
- [ ] **Step 3:** Note in the PR what was not checked (device builds; Realtime needs the Phase 1 migration applied; SRD list verification outcome from Task 3).

## Self-Review

- **Spec coverage:** PRD Phase 1 deferrals → languages (Tasks 3-5, 7) and spell save DC (Tasks 1, 2, 6, 7). Per-detail questions: source, existing characters, unknown display, Character tab, multiclass, species/background-granted vs chosen, homebrew species: all in Decisions and tasks.
- **Level-up:** untouched on purpose; no languages prompt (owner decision).
- **Names:** `spellSaveDCs`, `SpellSaveDC`, `SPELLCASTING_ABILITY`, `startingLanguages`, `normalizeLanguages`, `characterLanguages`, `onSaveDetails`, draft keys `languages_chosen` / `species_languages` / `bg_languages`, `sheet.sections.languages` / `spellcasting` are consistent across tasks.
- **Risks to watch:** Phase 1 and this plan both touch `src/systems/types.ts` and `rules.ts` (different regions; Task 7 waits for Phase 1). `details` is replaced wholesale on save, so two simultaneous editors of one character's details could overwrite each other (existing behaviour, accepted for a single-owner sheet).

## Decided by the owner

- Languages are free text only. The party card shows `Not set` when a character has none recorded. Level-up never prompts for languages; the Character tab edits them at any time.

## Also decided by the owner ("go by your recommendations")

- **No backfill.** Existing characters are not written to; the owner confirms a prefilled editor (Common plus class-granted) when they choose.
- **Homebrew subclasses cannot declare a spellcasting ability** in this plan (a possible later follow-up).
- **No spell attack bonus** on the card.

## Questions for the owner

None open.
