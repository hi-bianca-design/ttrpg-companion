# Flexible character creation: design

Date: 2026-11-02. Status: draft, awaiting approval.

## Intent

The app began because a first-time DM and first-time players could not tell what a D&D character needs. The step-by-step wizard fixed that. It has since grown a hardcoded screen per class (Fighting Style, Weapon Mastery, Rogue Expertise, Divine/Primal Order, with more planned), and each one blocks Continue until an official-rules choice is made. Two problems follow:

- **Homebrew doesn't fit.** Many tables play modified classes. A flow built around the official class is rigid for them.
- **Other rule sets don't fit.** A Daggerheart one-shot showed that character creation can be a simple walk through a sheet, with the DM answering questions and the player writing down what suits their play.

The goal is to keep what works, one part of the sheet per screen, and make it flexible: every input is open, the official rules are offered as suggestions, and a rule set is a list of steps plus data rather than a coded flow per class.

## Goals

1. **One section of the sheet per screen.** Steps follow the sheet: class, origin, ability scores, equipment and weapons, spells where the class has them, class features, details, personality, review. First-timers still get a clear "what's next".
2. **Open inputs, official suggestions.** Anywhere the official rules offer a choice (fighting style, weapon masteries, expertise skills, order, equipment options, ability scores), the player can pick a suggestion or type their own value.
3. **Nothing blocks.** Continue is always enabled and any step can be skipped and revisited. A step shows whether it has been filled in, but never gates. The only thing required to create a character is a name (the database requires one).
4. **Class-specific choices are data, not screens.** A class's level-1 choices (the things PRs #9 to #12 each built a screen for) appear in one generic "Class features" step, driven by a table of what each class offers. Adding or changing a class's choices means editing the table.
5. **First-timer help stays.** Each step keeps a short plain-language intro and shows the suggested options, so someone who doesn't know what to write can follow the suggestions end to end.
6. **A second rule set proves the design.** Daggerheart gets a thin creation flow built from the same step system. The flow is ancestry, community, class, traits, domain cards, details and personality, review, all open entry, with no new content seeding required.

## Non-goals

- Rule sets beyond D&D 5e (2024) and Daggerheart.
- Automatic mechanics for homebrew. The sheet's calculated effects (Defense AC, doubled expertise, mastery labels, Order skill bonus, extra cantrip) apply only when the choice matches a known official rule. A typed homebrew value is stored and shown as text.
- Redoing level-up, the in-play sheet, campaigns, or the visual design.
- Adding limited-use feature resources to characters that already exist.

## Anti-goals (this would be a failure even if it technically works)

- The wizard turns into one long form or an empty sheet that overwhelms a new player.
- A first-timer can no longer finish a character by following suggestions.
- A homebrew table still needs a code change to represent their class.
- Existing characters break or need a data migration.

## Constraints

- The existing stack stays: Expo / React Native, expo-router, Supabase, zustand for the draft, the `GameSystem` contract in `src/systems/types.ts`.
- The data model is already rule-set-agnostic (`characters` with JSON `stats` / `resources` / `details`, `character_picks`, `character_items`, and a `content` table that supports homebrew). Prefer no schema change. If one proves necessary, call it out in the plan.
- `character_picks` and `character_items` require a `content_id`. A typed value that matches no content row needs a home (a homebrew content row, or the character's `details`). The builder chooses, see "Left to the builder".
- No visual redesign: use the existing Night Vigil components.
- Not verified on device: only `tsc` and the Jest suite (758 passing at the top of the stack).

## Decisions made with the owner

- Keep the wizard feel, one section per screen. A full open sheet was shown and rejected as overwhelming.
- Open inputs with suggestions for classic play.
- Scope is the D&D rework plus a thin Daggerheart flow, with Daggerheart as the cuttable part if D&D runs long.
- Triage of the open PR stack (#9 to #18):
  - **Keep and re-base onto `main`:** #13 (limited-use feature system with Second Wind) and #14 to #18 (Rage, Bardic Inspiration, Innate Sorcery, Favored Enemy, Lay On Hands). They are sheet-side and only lightly touch wizard code.
  - **Discard the step screens** in #9 to #12 (FightingStyleStep, WeaponMasteryStep, ExpertiseStep, OrderStep and their edits to `ClassStep`/`builder.ts`/`draft.ts`).
  - **Keep the rule logic** from #9 to #12: Defense +1 AC with armor, per-class weapon-mastery rules (Fighter 3, Barbarian melee only, Rogue finesse/light), doubled proficiency and passive Perception for expertise, the Order skill bonus and extra cantrip, and the Actions list showing mastery only for mastered weapons.
  - Nothing is closed or merged until the plan is approved.

## My calls (not yet confirmed by the owner)

- **Class and name are required; everything else is optional.** The owner's group picked a class before starting, and the sheet, HP and rule functions all key off the class. "Nothing blocks" applies to every other input. A character with no ability scores uses the system's defaults (10 each in D&D); with no equipment or spells it simply has none. Revisit if a table wants classless characters.
- **A typed value that matches an official option is treated as that option**, compared case-insensitively on the name (so typing "Archery" as a fighting style applies Archery's rules). Anything that doesn't match is stored and shown as text with no automatic effect.
- **A step counts as filled in when every field on it has a value**, whether the player typed it, chose a suggestion, or accepted a preset (such as the standard array). The status is informational only and never blocks.
- **The "Class features" table covers the four choices PRs #9 to #12 built** (Fighting Style, Weapon Mastery, Expertise, Divine/Primal Order). Other classes' choices are added later as table entries.
- Existing saved characters are untouched, since the stored shape does not change.
- Daggerheart appears in the system picker once its flow works.

## Facts the builder can rely on

- **Tracker PRs depend only lightly on the wizard PRs.** #13's edits to `draft.ts`, `rules.ts` and `types.ts` are three small hunks (a `featureResources(...)` spread in `toCharacter`, a recharge loop in `rest`, a call in `levelUp`, and an optional `group` flag on resources). The only link to #12 is that it was branched from #12's tip, so a re-base conflicts on nearby import lines at most. #14 to #18 each add one entry to `features.ts` plus tests.
- **The rule logic worth keeping from #9 to #12 lives in `rules.ts`, `draft.ts`, `ActionsList.tsx` and `ProficienciesSection.tsx`.** The step screens to discard are separate files (`FightingStyleStep`, `WeaponMasteryStep`, `ExpertiseStep`, `OrderStep`) plus their wiring in `ClassStep.tsx` and `builder.ts`.
- **Daggerheart today is a hidden stub.** `src/systems/daggerheart/` has traits, resources (HP, Stress, Armor, Hope), content-kind metadata and Zod schemas. It has no steps, and its `toCharacter` throws. The step contract (`BuilderStepDef`: component, `isComplete`, `skip`) is already generic. The one change it needs is that `isComplete` stops gating Continue, which is part of the D&D rework, so Daggerheart is built after it.

## Left to the builder

- How a typed value is stored (a `details` entry, or a homebrew `content` row so picks and items keep their foreign key), and how the rule functions read either form.
- How the "Class features" table is shaped, and how it is shared with the sheet-side feature tracker from #13.
- Whether ability scores keep the standard array as a suggested preset next to manual entry, and how manual entry is bounded.
- How custom equipment, weapons and spells are added.
- The Daggerheart steps' exact fields, taken from the existing stub in `src/systems/daggerheart/`.
- Re-basing the tracker PRs: order, branch strategy, and how to close the discarded ones.
- Test coverage for the changed step contract.
