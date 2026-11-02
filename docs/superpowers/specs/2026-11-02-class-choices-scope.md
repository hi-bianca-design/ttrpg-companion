# Class choices in the character builder: scope

**Date:** 2026-11-02 · **Status:** Scope for review (no code written)

## Problem

A new Fighter leaves the builder with 11 HP, AC 12, no actions and an empty pack. The class's
level-1 decisions are never asked: skill picks, Fighting Style, Weapon Mastery and starting
equipment. The player has to rebuild those by hand on the sheet.

## What already exists (so this is mostly UI plus wiring)

- Every class in `class.json` already carries `features.skill_choices` (`{count, from}`) and
  `features.starting_equipment_options` (free-text strings, "Option A: Chain Mail, Greatsword, ..."). 
- The sheet already reads chosen skills from pick `state.skills` (`proficiencies()` in `rules.ts`) and
  AC from equipped item rows (`armorClass()`), and it already marks proficient skills with a diamond.
- Fighting Style feats (Archery, Defense, Great Weapon Fighting, Two-Weapon Fighting) are in `feat.json`
  with `prerequisites: {feature: "Fighting Style"}`.
- `createCharacter` writes picks only; items live in `character_items` (`quantity`, `equipped`).

## Proposed change, in slices (each its own PR)

1. **Skill picks, all 12 classes.** New "Class choices" step after Origin. Choose `count` skills from the
   class's `from` list. Skills the background already grants are shown as taken and not selectable
   (SRD: pick another). Stored on the class pick as `state.skills`. Step completes when the count is met.
   Smallest slice, works for every class, fixes the "skills look wrong" gap by itself.
2. **Starting equipment.** Choose Option A, B or C (gold only). Needs the option strings parsed into
   structured `{item, qty}` plus gold, resolved against `item.json` by name. Written to `character_items`
   at creation; armor and the main weapon created equipped so AC and Actions are right on the first view.
   Gold needs a home (no currency field today; a `details.gold` or an item is a decision).
3. **Fighting Style (Fighter, level 1).** Pick one of the four Fighting Style feats; stored as a `feat`
   pick. Defense's +1 AC should feed `armorClass()`. The other three are display-only for now.
4. **Weapon Mastery (Fighter, Barbarian, Paladin, Ranger, Rogue).** Choose N weapons (Fighter: 3) to
   master from `item.json` weapons that have a `mastery` property; stored as pick state; ActionsList
   already shows `Mastery · <name>`, so mastered weapons can be flagged there.
5. **Later, not now:** Second Wind as a tracked resource, and the other classes' level-1 specials
   (Rage, Expertise, Divine Order, etc.).

## Out of scope

Subclasses at level 3+, multiclassing, leveling-up choices (`LevelUpSection` is separate), custom/homebrew
class choice schemas.

## Decisions for you

- **Order:** slice 1 first (skills, all classes), then 2. OK? Fighter-only items (3, 4) can wait.
- **Gold:** where does it live: `details.gold`, or ignore until an inventory currency exists?
- **Structured equipment:** parse the existing strings at build time, or add structured data to the seed
  (cleaner, needs a migration/seed rebuild)? I'd lean to structuring the seed.
- **Wizard length:** this adds a step for every class (7 steps). Alternatively fold it into the Class step.

## Risks

- Equipment names must match `item.json` exactly ("Dungeoneer's Pack", "8 Javelins", "Quiver" may be
  missing from the 51 seeded items); unmatched entries need a fallback.
- The wizard keeps earlier steps mounted, so a new step's `isComplete` must prune cleanly when the class or
  background changes (`pruneDraft`): changing class must clear skill picks.

## Tests

Draft pruning (class/background change clears picks), skill-count completeness, background-overlap
exclusion, equipment option -> items mapping, and `toCharacter` output. Verify in the browser per slice.
