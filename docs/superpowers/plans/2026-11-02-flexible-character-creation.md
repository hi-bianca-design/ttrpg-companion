# Flexible Character Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the character wizard non-blocking with open inputs and official suggestions, replace per-class screens with one data-driven "Class features" step, and prove it with a thin Daggerheart flow.

**Architecture:** The wizard keeps one section per screen. `isComplete` on a step becomes an informational "filled in" flag; Create is gated only by a new `GameSystem.builder.canCreate(draft)`. A class's level-1 choices (Fighting Style, Weapon Mastery, Expertise, Order) live in a table (`classChoices.ts`) and are stored as free strings on the class pick's `state.choices`, so there is no `content_id` foreign-key problem. Sheet rules read those strings and apply mechanics when a string matches an official option by name (case-insensitive). The tracker PRs (#13 to #18) are re-based onto `main` first and independently of the rest.

**Tech Stack:** Expo / React Native, expo-router, zustand, Zod, Jest (`jest-expo`), TypeScript. Verify with `npx tsc --noEmit` and `npx jest <path>`; `npm test` also runs the token lint.

**Spec:** `docs/superpowers/specs/2026-11-02-flexible-character-creation-design.md`

## Global Constraints

- Class and name are required to create a character; everything else is optional (spec, "My calls").
- A typed value matching an official option by name, compared case-insensitively, applies that option's mechanics; any other value is stored and shown as text with no effect.
- A step is "filled in" when every field on it has a value (typed, suggested, or accepted preset). It never blocks Continue.
- The "Class features" table covers exactly: Fighting Style, Weapon Mastery, Expertise, Divine/Primal Order.
- Existing saved characters must load and behave as today; no stored-shape migration and no schema change.
- Use existing Night Vigil components (`Card`, `Chip`, `ChoiceCard`, `StepIntro`, `Text`, `Button`); no visual redesign. `npm test` runs `lint:tokens`, so use theme tokens, not raw colors.
- Nothing is pushed, force-pushed, or retargeted, and no PR is closed, until the owner confirms (their global instructions).

## Review Focus

1. A Fighter who types a fighting style that is not in the list (e.g. "Pike and Shield") creates the character, sees it on the sheet, and gets no AC change.
2. Typing `defense` (lowercase) or ` Defense ` (padded) gets the Defense +1 AC bonus when armored.
3. Switching class after filling class choices clears them; the old class's choices never leak onto the new class.
4. A character with every optional step skipped gets valid defaults (all abilities 10, HP from class hit die, no spells, no equipment) and the sheet renders.
5. Expertise typed for a skill the character is not proficient in does not double anything and does not break passive Perception.
6. A Daggerheart character with only a name and class text saves and its sheet loads.

---

### Task 1: Re-base the tracker PRs (#13 to #18) onto `main`

Independent of every other task; it touches no files of this plan's own work, only the existing PR branches.

**Files:** none (git operations on `claude/second-wind`, `claude/rage`, `claude/bardic-inspiration`, `claude/innate-sorcery`, `claude/favored-enemy`, `claude/lay-on-hands`).

**Interfaces:**
- Produces: six branches each based on the previous, the first based on `origin/main`, with the #9 to #12 commits removed. Task 8's merge relies on `featureResources`, `featuresFor`, `rechargedFeature`, `grownFeatures` from `src/systems/dnd5e-2024/features.ts` existing on `main`.

- [ ] **Step 1: Work in a throwaway worktree, not this one.** `git worktree add ../dnd-rebase origin/main --detach`, `git fetch origin`.
- [ ] **Step 2: Re-base the stack** with `git rebase --onto origin/main origin/claude/class-orders claude/second-wind` (drops the #9 to #12 commits; resolve the import-line conflicts in `draft.ts` and `rules.ts` by removing `findOrder, orderOptions` from the imports, which `main` does not export). Then for each next branch in order (rage, bardic-inspiration, innate-sorcery, favored-enemy, lay-on-hands): `git rebase --onto <previous rebased branch> <previous original tip> <branch>`. Record each original tip first with `git rev-parse origin/<branch>`.
- [ ] **Step 3: Verify the tip** `claude/lay-on-hands`: `npx tsc --noEmit` and `npx jest` pass. Expected: no type errors; all suites pass (the wizard-only tests from #9 to #12 are gone).
- [ ] **Step 4: Stop and ask the owner** before `git push --force-with-lease` of the six branches and `gh pr edit 13 --base main` plus retargeting each of #14 to #18 to its predecessor. Do not push without their yes.
- [ ] **Step 5: After the owner approves and pushes,** `gh pr close 9 10 11 12` is a separate confirmed action in Task 9, not here.

---

### Task 2: Non-blocking steps and a `canCreate` gate

**Files:**
- Modify: `src/systems/types.ts` (add `canCreate` to `GameSystem['builder']`)
- Modify: `src/systems/dnd5e-2024/draft.ts`, `src/systems/dnd5e-2024/builder.ts`, `src/systems/daggerheart/index.ts`
- Modify: `app/(app)/characters/new/[step].tsx`
- Test: `__tests__/systems/dnd5e-2024/steps.test.tsx`, `__tests__/features/characters/builder.store.test.ts`, `__tests__/app/characters.test.tsx` (follow its existing render helpers)

**Interfaces:**
- Produces: `builder.canCreate(draft: Draft): boolean` on `GameSystem`; `canCreate` exported from `src/systems/dnd5e-2024/draft.ts` as `(draft: Draft) => boolean` (true iff `class_id` is a non-empty string and `name.trim()` is non-empty). Daggerheart gets a stub `() => false` until Task 8. `BuilderStepDef.isComplete` keeps its signature but is documented as "filled in" status only.

- [ ] **Step 1: Write failing tests.** In `steps.test.tsx`/draft tests: `canCreate({...initialDraft()})` is false; with `class_id: 'x'` only is false; with `name: ' '` is false; with `class_id: 'x', name: 'Mira'` is true. In `__tests__/app/characters.test.tsx`: on the Class step with nothing chosen, the "Continue" button is enabled (`accessibilityState.disabled` falsy), and on the last step "Create character" is disabled until the draft has a class and a name, with the helper text "Choose a class and add a name to create your character." Also in the draft tests: `toCharacter` for a draft holding only `class_id`, `class_name: 'Fighter'`, `hit_die: 10`, `name: 'Mira'` returns all six stats `10`, `resources.hp.max` of `10 + CON modifier` (10), no spell slots tiers, `items: []`, and `picks` containing just the class pick.
- [ ] **Step 2: Run** `npx jest __tests__/systems/dnd5e-2024/steps.test.tsx __tests__/app/characters.test.tsx` and confirm they fail.
- [ ] **Step 3: Implement.** Add `canCreate` to the type and both systems. In `[step].tsx`, remove `disabled={!current.isComplete(draft)}` from Continue; replace `allComplete` with `system.builder.canCreate(draft)` for Create, rendering the helper text above when false. In `Checklist`, show every not-filled-in step as a pressable row labelled "Skipped" instead of "Finish" (accessibility label `${s.title}, not filled in`).
- [ ] **Step 4: Run the same tests plus `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: wizard steps never block; only class and name are required to create`.

---

### Task 3: Open ability scores

**Files:**
- Modify: `src/systems/dnd5e-2024/steps/AbilityScoresStep.tsx`, `src/systems/dnd5e-2024/draft.ts`, `src/systems/dnd5e-2024/builder.ts`
- Test: `__tests__/systems/dnd5e-2024/steps.test.tsx`

**Interfaces:**
- Produces: `abilitiesFilled(draft: Draft): boolean` in `draft.ts` (true iff all six keys hold a finite number); `abilitiesAssigned` is removed and the Ability Scores step's `isComplete` becomes `abilitiesFilled`. Bonus-picking (`bonusesComplete`) stays but no longer feeds `isComplete`.

- [ ] **Step 1: Write failing tests.** `abilitiesFilled` is false with one null, true with six numbers outside the standard array (e.g. 16, 8, 14, 10, 12, 18). In the step test: typing `16` into the Strength field calls `update({ strength: 16 })`; typing `25` clamps to `20`; typing `0` clamps to `1`; a "Use standard array" button assigns `[15,14,13,12,10,8]` to the six abilities in order.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** Replace the tap-to-assign row picker with a numeric `TextInput` per ability (integer, clamped 1 to 20, empty = `null`), keep the modifier and background-bonus display, and add a "Use standard array" `Button` that fills the six keys in `ABILITY_KEYS` order. Keep the existing `StepIntro` with updated copy: "Type each score, or use the standard array to start."
- [ ] **Step 4: Run tests and `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: type ability scores freely, standard array as a preset`.

---

### Task 4: Class choices table, draft storage, and rules

**Files:**
- Create: `src/systems/dnd5e-2024/classChoices.ts`
- Modify: `src/systems/dnd5e-2024/rules.ts`, `src/systems/dnd5e-2024/draft.ts`, `src/features/characters/sheet/ActionsList.tsx`, `src/systems/dnd5e-2024/sheet/ProficienciesSection.tsx`, `src/systems/dnd5e-2024/steps/ClassStep.tsx`
- Test: `__tests__/systems/dnd5e-2024/rules.test.ts`, `__tests__/systems/dnd5e-2024/classChoices.test.ts` (new), `__tests__/features/characters/sheet/sheetLogic.test.ts`

**Interfaces:**
- Produces in `classChoices.ts`:
  - `type ChoiceKey = 'fighting_style' | 'weapon_mastery' | 'expertise' | 'order'`
  - `type ClassChoice = { key: ChoiceKey; label: string; help: string; count: number }`
  - `classChoicesFor(className: string, level1Features: string[]): ClassChoice[]` (Fighting Style count 1 when level-1 features include "Fighting Style"; Weapon Mastery count from `weaponMasteryCountFor`; Expertise count 2 when level-1 features include "Expertise"; Order count 1 when `orderOptions(className).length > 0`; labels "Fighting Style", "Weapon Mastery", "Expertise", and `orderFeature(className)`).
  - `sameName(a: unknown, b: unknown): boolean` (trimmed, case-insensitive string equality; false for non-strings).
- Produces in `rules.ts`: ported from `git show origin/claude/class-orders:src/systems/dnd5e-2024/rules.ts`: `weaponMasteryCountFor`, `canMaster`, `OrderOption`, `orderFeature`, `orderOptions`, `findOrder`, `orderSkillBonus`, `skillProficiencyBonus`; plus new `classChoice(picks: PickRecord[], key: ChoiceKey): string[]` reading the class pick's `state.choices[key]` (non-string entries dropped). Changed: `findOrder(className, value)` matches an option's `key` or `label` via `sameName`; `proficiencies(picks)` returns `expertise` built from `classChoice(picks,'expertise').map(skillKey)` filtered to skills the character is proficient in; `armorClass` adds +1 when armored and `classChoice(picks,'fighting_style').some(v => sameName(v,'Defense'))`; `orderSkillBonus` reads `classChoice(picks,'order')[0]`.
- Produces in `draft.ts`: draft keys `class_features: string[]` (level-1 features cached by `ClassStep`, default `[]`) and `class_choices: Record<string, string[]>` (default `{}`); `extraCantrips(draft)` returning 1 when `findOrder(class_name, class_choices.order?.[0])?.cantrip`; `pruneDraft` clears `class_choices` on class change and re-fits spells when `class_choices` changes; `toCharacter` writes class pick `state: { skills, choices }` where `choices` holds only non-empty arrays (omitted when none). `spellsWithinLimits` and `fitSpells` add `extraCantrips`.
- `ActionsList.buildEntries`: mastery meta shows only for weapons whose name matches one of `classChoice(picks,'weapon_mastery')` via `sameName`, or for every weapon when that list is empty (unchanged behavior for characters without choices).

- [ ] **Step 1: Write failing tests**, adapted from the PR tests (`git show origin/claude/class-orders:__tests__/systems/dnd5e-2024/rules.test.ts`) but driving choices through class-pick `state.choices`:
  - `classChoicesFor('Fighter', ['Fighting Style','Second Wind','Weapon Mastery'])` returns keys `['fighting_style','weapon_mastery']` with counts `[1,3]`; Rogue with `['Expertise','Sneak Attack','Weapon Mastery']` returns `expertise` count 2 and mastery count 2; Wizard returns `[]`; Cleric returns an `order` choice labelled "Divine Order"; Druid "Primal Order".
  - `sameName(' Defense ', 'defense')` is true; `sameName(undefined,'x')` is false.
  - Armor Class: armored with `choices.fighting_style: ['defense']` is base+1; unarmored is unchanged; typed `['Pike and Shield']` is unchanged.
  - Expertise `['Stealth']` on a Stealth-proficient character doubles the proficiency bonus; typed `['Underwater Basket Weaving']` and a non-proficient skill change nothing, and `derived()` passive Perception stays correct.
  - `findOrder('Cleric','Thaumaturge')` and `findOrder('Cleric','thaumaturge')` both resolve; `orderSkillBonus` returns `['arcana','religion']` and `max(1, wisMod)` for it; a typed `'Warlord'` returns no skills.
  - `buildEntries`: with `choices.weapon_mastery: ['longsword']` only the Longsword shows `Mastery · …`; with no list every weapon shows it.
  - `pruneDraft`: a class change empties `class_choices`; setting an order with `cantrip: true` raises the cantrip cap by one.
- [ ] **Step 2: Run** `npx jest __tests__/systems/dnd5e-2024 __tests__/features/characters/sheet/sheetLogic.test.ts` and confirm failure.
- [ ] **Step 3: Implement** the interfaces above. `ClassStep` caches `class_features: cls.data.features.level_features?.['1'] ?? []` when a class is picked (replacing the PRs' `class_fighting_style` approach). `ProficienciesSection` applies `skillProficiencyBonus` and the Order bonus exactly as in `origin/claude/class-orders`, with the expertise a11y suffix ", expertise".
- [ ] **Step 4: Run the same tests, `npx tsc --noEmit`, then full `npx jest`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: class choices as data, applied by the sheet when they match an official option`.

---

### Task 5: Open choice field and the Class features step

**Files:**
- Create: `src/systems/dnd5e-2024/steps/OpenChoiceField.tsx`, `src/systems/dnd5e-2024/steps/ClassFeaturesStep.tsx`
- Modify: `src/systems/dnd5e-2024/builder.ts`
- Test: `__tests__/systems/dnd5e-2024/steps.test.tsx`

**Interfaces:**
- Consumes: `classChoicesFor`, `ClassChoice`, `sameName` (Task 4); `draft.class_features`, `draft.class_choices`; `useDndContent` and `StepIntro`, `Chip`, `QueryState` from `steps/shared.tsx`; `canMaster`, `orderOptions`, `proficientSkills` (Task 4 / `draft.ts`; port `proficientSkills` from `origin/claude/rogue-expertise`).
- Produces: `OpenChoiceField(props: { label: string; help: string; count: number; values: string[]; suggestions: string[]; onChange(values: string[]): void }): JSX.Element` (renders `count` text inputs prefilled from `values`, a row of suggestion `Chip`s that fill the first empty input, selected when matching a value via `sameName`, tapping a selected chip clears it). Builder step `{ id: 'class-features', title: 'Class features', component: ClassFeaturesStep, isComplete, skip }` placed after `ability-scores` and before `spells`, with `skip: (d) => classChoicesFor(str(d.class_name), strList(d.class_features)).length === 0` and `isComplete` true when every choice has `count` non-empty values.

- [ ] **Step 1: Write failing tests.** For a Fighter draft: the step shows a "Fighting Style" field with 1 input and a "Weapon Mastery" field with 3 inputs; tapping the suggestion chip "Defense" calls `update` with `class_choices: { ...existing, fighting_style: ['Defense'] }`; typing "Pike and Shield" stores it; tapping a selected chip clears it; the step is absent from `visibleSteps` for a Wizard; Continue is never disabled with empty fields.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** Suggestions: Fighting Style from `useDndContent('feat')` names, filtered the same way `FightingStyleStep` does in `origin/claude/fighting-style`; Weapon Mastery from `useDndContent('item')` weapons passing `canMaster(className, item.data)`; Expertise from `proficientSkills(draft)` mapped to skill labels (`SKILLS`); Order from `orderOptions(className)` labels (show each option's description under its chip). Each field sits in a `SectionHeader`-style block with `help` as caption text.
- [ ] **Step 4: Run tests and `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: data-driven Class features step with open fields and suggestions`.

---

### Task 6: Open equipment, weapons and inventory

**Files:**
- Modify: `src/systems/dnd5e-2024/steps/EquipmentStep.tsx`, `src/systems/dnd5e-2024/draft.ts`
- Test: `__tests__/systems/dnd5e-2024/equipment.test.ts`, `__tests__/systems/dnd5e-2024/steps.test.tsx`

**Interfaces:**
- Produces: typed items append to `draft.equipment_other` (already written to `details.other_gear`). `toCharacter` writes `other_gear` and `gold` whenever either has content, not only when `equipment_option` is a number. `equipmentComplete` stays but is informational.

- [ ] **Step 1: Write failing tests.** With no `equipment_option` and `equipment_other: ['Grandfather's sword']`, `toCharacter(draft).details.other_gear` equals that array; in the step, typing "Rope, 50 ft" and pressing "Add item" appends it; each entry has a remove button; picking an official option still resolves items as before and keeps typed entries (typed entries are not overwritten when `choose` runs).
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** Below the option cards add a "Your own items" section: a text input and "Add item" button (ignores empty or duplicate-after-trim), and a list with remove buttons. Track typed entries separately from option-resolved `other` entries by storing them in a new draft key `equipment_custom: string[]` (default `[]`) and merging both into `other_gear` in `toCharacter`.
- [ ] **Step 4: Run tests and `npx tsc --noEmit`.** Expected: pass.
- [ ] **Step 5: Commit** `feat: add your own items and weapons in the equipment step`.

---

### Task 7: Step intros as first-timer help, final D&D wiring

**Files:**
- Modify: `src/systems/dnd5e-2024/steps/*.tsx` (copy only), `src/systems/dnd5e-2024/builder.ts`
- Test: `__tests__/systems/dnd5e-2024/step-intro.test.tsx`, `__tests__/features/characters/builder.store.test.ts`

**Interfaces:**
- Produces: final D&D step order `class, origin, skills, equipment, ability-scores, class-features, spells, details, personality, review`.

- [ ] **Step 1: Write failing tests.** `visibleSteps` for a Fighter equals `['class','origin','skills','equipment','ability-scores','class-features','details','personality','review']` (update the existing expectation in `builder.store.test.ts`); for a Wizard `class-features` is absent and `spells` present; every step's intro mentions it is optional where it now is ("You can skip this and come back").
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** the order in `builder.ts` and adjust `StepIntro` descriptions on Ability Scores, Class features, Spells, Equipment, Details, Personality to say the step is optional and suggestions are only suggestions.
- [ ] **Step 4: Run full `npm test` and `npx tsc --noEmit`.** Expected: all pass.
- [ ] **Step 5: Commit** `feat: final D&D step order and first-timer intros`.

---

### Task 8: Thin Daggerheart creation flow

**Files:**
- Create: `src/systems/daggerheart/builder.ts`, `src/systems/daggerheart/draft.ts`, `src/systems/daggerheart/steps/{HeritageStep,ClassStep,TraitsStep,DomainCardsStep,VitalsStep,DetailsStep,ReviewStep}.tsx`
- Modify: `src/systems/daggerheart/index.ts` (wire builder, remove `hidden: true`), `src/systems/daggerheart/schemas.ts`, `src/systems/types.ts` only if a shared step helper is needed
- Test: `__tests__/systems/daggerheart/stub.test.ts` (rewrite), `__tests__/systems/daggerheart/builder.test.ts` (new)

**Interfaces:**
- Consumes: `OpenChoiceField` (Task 5), `StepIntro`, `canCreate` contract (Task 2). The `game_systems` row for `daggerheart` already exists in `supabase/seed.sql`; confirm it is present in the target Supabase project before manual testing.
- Produces: steps `heritage` (ancestry text, community text), `class` (class text, subclass text, required), `traits` (six numeric inputs bounded -5 to 8, with a "Use suggested array" preset of +2, +1, +1, 0, 0, -1 in `TRAIT_KEYS` order, default 0), `domain-cards` (up to 2 typed card names via `OpenChoiceField`), `vitals` (Hit Points default 6, Armor default 3, Evasion default 10, all editable integers ≥ 0; Stress fixed at 6 and Hope 2 of `HOPE_MAX` per the core rules, shown read-only), `details` (name required, two Experience text inputs), `review`. `daggerheartDetailsSchema` gains optional `ancestry`, `community`, `class_name`, `subclass_name`, `domain_cards` (string array) and `backstory`. `canCreate`: `class_name.trim()` and `name.trim()` non-empty. `toCharacter(draft)` returns `NewCharacter` with `system_id: 'daggerheart'`, `level: 1`, traits in `stats`, `resources` `{ hp: {tiers:{'1':{max,used:0}}}, stress: {tiers:{'1':{max:6,used:0}}}, armor: {tiers:{'1':{max,used:0}}}, hope: {current:2,max:HOPE_MAX} }`, `details` including `evasion`, `experiences`, and the typed heritage and class text, and `picks: []`.

- [ ] **Step 1: Write failing tests.** `toCharacter` output parses against `daggerheartStatsSchema`, `daggerheartResourcesSchema` and `daggerheartDetailsSchema`; a draft with only name and class text still produces a valid character (all traits 0, HP 6, Armor 3, Evasion 10); `canCreate` false without class or name; the traits preset produces `{agility:2,strength:1,finesse:1,instinct:0,presence:0,knowledge:-1}`; `visibleSystems()` now includes Daggerheart and `getSystem('daggerheart').builder.steps.map(s=>s.id)` equals the list above. Replace the stub test's `hidden`/`steps toEqual([])` assertions accordingly.
- [ ] **Step 2: Run** `npx jest __tests__/systems/daggerheart` and confirm failure.
- [ ] **Step 3: Implement** the files above using the same `Draft`/`BuilderStepProps` contract as D&D. Starting values (HP 6, Armor 3, Evasion 10, Hope 2, Stress 6) are defaults the player can edit for HP, Armor and Evasion; confirm them against the Daggerheart reference when implementing and adjust the defaults if the core rules differ.
- [ ] **Step 4: Run `npm test`, `npx tsc --noEmit`, then start the app (`npx expo start --web`), create one D&D and one Daggerheart character end to end, and open each sheet.** Expected: both save; the Daggerheart sheet shows its four resource trackers and traits. Report honestly if the sheet needs a missing piece (e.g. `derived` returning `[]`).
- [ ] **Step 5: Commit** `feat: thin Daggerheart creation flow on the shared step system`.

---

### Task 9: Merge, clean up the discarded PRs

**Files:** none.

- [ ] **Step 1:** Merge `origin/main` into this branch via the app's `sync_with_base_branch` (after the owner has merged the tracker PRs from Task 1); resolve conflicts in `draft.ts`, `rules.ts`, `types.ts`, keeping both the tracker additions (`featureResources`, `featuresFor`) and Task 4's choices; run full `npm test` and `npx tsc --noEmit`.
- [ ] **Step 2: Ask the owner** before pushing this branch and opening its PR (body per their PR conventions, ticket link if one exists).
- [ ] **Step 3: Ask the owner** before closing #9 to #12 with a comment pointing to the new PR ("superseded by the flexible creation flow; rules logic ported in …"). Do not close without their yes.
