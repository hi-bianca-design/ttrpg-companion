# Custom class, species and background: design

Date: 2026-11-03. Status: draft, awaiting approval. Extends `2026-11-02-flexible-character-creation-design.md` (PR #22), which made the wizard non-blocking and its inputs open but left the Class, Origin (species and background) steps as pick-from-list only.

## Intent

A table that plays a homebrew class, species or background should be able to make that character in the wizard without leaving it. Today the Class and Origin steps only offer official content (plus the user's saved homebrew species and backgrounds), so someone with their own take has to build it elsewhere first, or can't. The goal is to let a player make their own class, species or background right in the step: a name, a description, and optional extra fields.

## Goals

1. **Make your own in the step.** The Class step and the species and background pickers each offer "Make your own". Choosing it opens a short form: **name**, **description**, and **optional extra fields**.
2. **Optional extras feed the sheet when filled in.**
   - Class: hit die, primary abilities, saving throw proficiencies, number of skills to pick and the skills they come from.
   - Species: speed, size, creature type.
   - Background: skill proficiencies, origin feat, tool proficiency.
   - An empty extra uses a safe default (a class with no hit die uses d8 for hit points; no skills means no skill picks). Nothing blocks.
3. **One-off by default, library on request.** A custom entry lives only on this character unless the player chooses "Add to my homebrew library", which makes it reusable on other characters and visible in the Homebrew screen.
4. **Everything downstream keeps working.** The sheet, hit points, proficiencies, the Class features step and the rule functions keep reading the character's class, species and background picks, so a custom entry behaves like any other.
5. **Official still works as before.** Picking an official class, species or background is unchanged.

## Non-goals

- Subclasses, class features by level, and any automatic mechanics for custom entries beyond the optional fields above. A custom class does not get a Class features step unless a later change adds it.
- Editing a custom entry after the character is created (the Homebrew screen already edits library entries).
- Custom entries for Daggerheart (it has no content to pick from yet and is hidden).
- Sharing a one-off entry with other players beyond what campaign sheets already expose.
- Visual redesign; use existing Night Vigil components.

## Anti-goals

- The form becomes a long required form that a first-timer must fill in to continue.
- One-off entries clutter the Homebrew library or the pickers of every future character.
- A custom class breaks hit points, proficiencies or the sheet because a field was left empty.
- Existing characters, official content, or saved homebrew change behavior.

## Constraints

- Same stack as PR #22 (Expo / React Native, expo-router, Supabase, zustand draft, the `GameSystem` contract, Zod content schemas).
- A character's class, species and background are `character_picks` rows that require a `content_id`, and the sheet and rules read them. A custom entry therefore needs a content row.
- The existing homebrew path is `saveHomebrew` in `src/features/content/content.api.ts` (creates an owner-scoped content row validated by the kind's Zod schema); RLS lets a user insert rows they own.
- Current kind metadata (`src/systems/dnd5e-2024/definition.ts`): `species` and `background` are `homebrew: true`; **`class` is `homebrew: false`**, so classes cannot be homebrewed today and the Homebrew screen does not offer them.
- The class content schema (`classData` in `schemas.ts`) requires `hit_die`; extras left empty must still produce data that passes it.
- Prefer no database migration. If the one-off/library distinction cannot be done without one, call it out in the plan.
- Content that is in use by a character cannot be deleted (a migration makes the foreign key `restrict`), so one-off rows stay if their character is deleted unless cleaned up.

## Decisions made with the owner

- Custom entries have a name, a description and optional additional fields (confirmed for class; applied to species and background, which the owner also named).
- Default is one-off, on this character only; adding to the homebrew library is an explicit option.

## My calls (not yet confirmed by the owner)

- **Name is the only required field** of a custom entry, matching "class and name are the only create requirements".
- **A one-off custom entry is stored as an owner-scoped content row flagged as one-off** (a flag in the row's `data`, hidden from the Homebrew library and from every picker), and "Add to my homebrew library" clears the flag. This keeps the pick/rules path unchanged. The builder may choose another mechanism if it avoids a migration and keeps picks working.
- **Making `class` homebrew-able** (setting its kind metadata to `homebrew: true`) so the same form and the Homebrew screen can create classes.
- **Defaults for empty extras:** class hit die d8, no skill picks, no saves, no primary abilities; species speed 30, size Medium; background no skills.
- **Orphaned one-off rows are accepted** when a character is deleted (hidden and harmless); cleaning them up is a follow-up.
- **The same form component** is used for all three kinds, driven by the kind's existing field list in the system definition.
- **The content row is created when the character is created, not while the form is open.** The draft holds the pending custom entry, so backing out, changing class or abandoning the wizard leaves no stray rows. Review shows the pending entry's name.
- **Saved library classes appear in the Class step**, like saved homebrew species and backgrounds do, and the Homebrew screen can create classes. The Homebrew screen keeps its current required fields; only the wizard form makes extras optional.
- **Empty extras are written as explicit defaults** into the row's `data` (for example `hit_die: 8`) so it always passes the kind's Zod schema.
- **Custom class skill picks:** the "comes from" list is a picker over the 18 SRD skills, and the count is clamped to the list length (never blocks). Background skills use the same picker. Origin feat and tool proficiency are free text, as in the existing background fields.
- **Name collisions don't block.** A custom entry whose name matches an official one (case-insensitive) shows a short non-blocking note ("An official class has this name; picking it applies that class's rules"). Custom rows always get a unique slug so a row can't clash with an official one in storage. Rules that switch on the class name follow the name-match principle from PR #22: a custom class named "Wizard" gets Wizard's spell slots.
- **The library choice is offered in the form only.** One-off entries are hidden, so they are not edited later.

## Facts the builder can rely on

- **Campaign mates can already read a one-off row.** `content_select` RLS lets a user read rows they own, campaign-scoped rows for campaigns they belong to, and any row in `campaign_sheet_content_ids()` (content on the sheets of characters in their campaigns). Hiding one-off rows from lists is therefore a client-side filter only, and campaign sheets still render the custom class, species and background.
- **The wizard already adapts to the class.** The Skills step is skipped when the cached skill count is 0, the Spells step when the class has no slots (by class name), the Class features step when the cached level-1 features contain none of the four choices, and the Equipment step always shows. A custom class therefore reaches Review with the steps its extras imply, without changes to the step list.

## Left to the builder

- How the "Make your own" entry point looks in each step (a card in the list, a button, a sheet) using existing components.
- The exact one-off flag and the PostgREST filter that hides flagged rows from library and picker lists.
- Whether the form reuses `ContentForm` or a lighter wizard-specific form.
- How the draft stores a pending custom entry before the character is saved (for example the draft holds the entry and `toCharacter` creates the row), and what happens if the user backs out or changes class after creating one.
- How the Class step's cached fields (`class_features`, skill options, equipment options, hit die) are populated for a custom class, given that a custom class may have none.
- Test coverage, including a class with every extra empty.
