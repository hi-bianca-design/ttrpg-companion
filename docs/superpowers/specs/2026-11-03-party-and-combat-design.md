# Party Page and GM Combat Tools — PRD

**Date:** 2026-11-03
**Status:** Draft (for review)
**Builds on:** Open Session (PRs #21, #30, #32, #34 and the GM status line). The session, combat state and "Your turn" banner exist; this PRD adds the party view, the battle order, enemies and prep.
**Supersedes:** two non-goals in `2026-05-15-session-console-prd.md`: "NPCs are a name, an initiative roll and optional HP only" and "no full stat blocks". Monster detail comes back in a later phase (below).

---

## Why

A GM running combat at a live table is doing three jobs at once: narrating, tracking whose turn it is and who is hurt, and tracking their own monsters. Today the app gives them none of that. A GM has no character sheet, so the session and combat badges are not even visible to them on a sheet, and nothing in the app shows the state of the party. Players ask out loud ("who's next?", "how hurt is Torin?") and the GM answers from memory or paper.

The original design had a **Party** tab: party members seeing each other's stats and conditions at all times, which would transform during a fight to include the monsters. That tab was never built; today's Campaign tab shows member names only.

## Who it is for

- **The GM**, on a phone at the table, mid-improvisation, eyes on the players. Rushed, often interrupted. They want the app to hold the bookkeeping so they can keep talking.
- **Players**, on a phone at the table. They want to know the order, see how the party is doing, and update their own character quickly.
- Tables that roll **physical dice** and call numbers out loud. This is the live-play feel the app must support, not replace.

## Design principles

1. **A scoreboard with a calculator, not a referee.** The app does the arithmetic the table would otherwise do in their heads: subtract damage, add healing, sort the order, count rounds. It never decides a rule: no hit or miss, no saving throws, no resistance or vulnerability, no choosing targets. The GM can reorder, skip, delay and add enemies at any time.
2. **Dice stay physical.** No in-app dice roller. The GM types the numbers players call out.
3. **Players own their numbers; everyone sees them.** Only a character's owner edits their hit points and conditions. The GM and the rest of the party read them. The GM edits enemies, nothing else.
4. **One page that transforms, not new screens.** The Party page becomes the battle order when combat starts and reverts when it ends. The "Your turn" banner and the session/combat badges stay where they are.
5. **Players never learn enemy hit points.** They see enemy names in the order, and the GM can hide an enemy entirely until it is revealed. This must be enforced by the server, not just hidden in the interface.
6. **Fast at the table.** Entering initiative for a whole fight should take seconds, with number-pad entry and a cursor that moves on its own.

## Goals

1. Anyone in the party can see every member's hit points, conditions and key out-of-combat stats from one page, live.
2. A GM can run a fight (initiative, turn order, enemies, advancing turns) from the app without asking the table "who's next?".
3. A GM can prepare enemies before the session and launch them with one action.
4. Players never see anything the GM has chosen to keep hidden (prepared encounters, hidden enemies, enemy hit points).
5. The GM never has to type in the players' numbers.

## Non-goals

- A dice roller, attack automation, saving throws, resistances or any rules engine. (Applying a typed damage or healing amount is arithmetic, not automation, and is in scope.)
- A battle map, grid, tokens or positioning.
- Player-entered initiative (possible later as an opt-in time-saver; the default is the GM entering what is called out).
- A monster library or stat blocks (a later phase, see Phase 4). Phase 2 enemies are typed in.
- A "bloodied" marker for enemies at half hit points (possible later, as an option).
- Session chat, notes, XP or rewards.

## Anti-goals (a failure even if it technically works)

- The GM becomes a data-entry clerk for the whole party.
- The app slows the table down: any step during a fight that takes longer than saying it out loud.
- A spoiler leaks: a player's device receives a hidden enemy, an enemy's hit points, or a prepared encounter.
- The GM can overwrite a player's numbers, so players stop engaging with their own character.

## Phases

### Phase 1: Party page with live stats (first)

**What exists today.** The sheet's Campaign tab shows the campaign card and a member list of names, roles and statuses. A GM has no sheet and only the campaign screen. The database already lets campaign members read each other's characters. Updates reach other devices only by polling every 10 seconds.

**Requirements (P0)**
- **Party page** for players (replaces the content of the sheet's Campaign tab, keeping the campaign card) and for the GM (the campaign screen). One card per active member who has a character.
- **Card, always visible:** name, class and level, a hit-point bar with current/max, conditions, and compact chips for AC, passive perception and speed.
- **Card, expanded on tap:** passive insight and passive investigation, darkvision (read from the species' trait text), inspiration. *Deferred:* languages and spell save DC, because the app has no data for them today (no languages in the species or background content, no spellcasting-ability mapping per class); they follow when that data exists.
- **Read-only for everyone but the owner.** A player edits their own numbers on their Character tab; the party page never edits another member's.
- **Live:** a change on one phone is visible on the others within about 2 seconds, replacing the 10-second polling for this data, with a quiet "reconnecting" marker when the connection drops and a refetch on reconnect.
- **States:** loading (skeleton cards), empty ("No one has joined with a character yet"), a member with no character (listed by name only, marked), error with retry. Works with 1 to about 8 members and long names.
- **Works outside a session.** The party page does not require an active session.

**Acceptance.** A player lowers their hit points on their Character tab; the GM's campaign screen and every teammate's Party tab show the new value within about 2 seconds. A teammate cannot edit it. An invited (not yet active) member sees no party stats.

### Phase 2: Battle order with enemies

**The page transforms.** When combat starts, the Party page becomes the battle order: party members and enemies interleaved by initiative, the current turn highlighted, a round counter, `Round n`, that increases each time the turn wraps. In combat the cards shrink to name, hit points and conditions; extra info is one tap away. When combat ends it reverts.

**Requirements (P0)**
- **Anyone can start combat (decided).** Any active member can tap `Enter combat`, as today. If that happens before the order is set, combat is in a **"rolling initiative"** state: players' Party page shows "Combat is starting" and nothing else changes; the GM's page prompts for the roll call. Once the GM presses `Start combat` on the roll-call screen the page becomes the battle order. Only the GM can set the order.
- **Hidden enemies and the turn pointer (decided).** Players' battle order omits hidden enemies entirely. When a hidden enemy holds the turn, players see a generic **"GM's turn"** row with no name, no initiative and no hit points; the server must never send a player the identity or position data of a hidden enemy. Revealing an enemy makes it appear in the order at its place.
- **Initiative roll call (GM).** One screen with a row per party member and per enemy, each with a number field; enter moves to the next row; the order re-sorts as numbers go in; `Start combat` locks it in. The GM can still add enemies afterwards.
- **Enemies are typed in:** name, hit points, initiative; optional armor class and a notes line. A `×N` shortcut adds N copies named "Goblin 1, 2, 3"; by default they share one initiative roll, with a way to give them separate rolls.
- **Enemy rows (GM):** hit points edited with `Damage`, `Heal` and `Temp HP` over one number field (number-pad entry that clears after use): temp HP absorbs damage first, healing never raises temp HP, hit points are clamped to 0..max with a `Down` state at 0, a typed exact correction is available, and the last change on a row can be undone. Also notes, a `Hidden` toggle and remove. Enemy hit points are visible only to the GM.
- **Bulk damage (GM).** Select several enemy rows, or `Select group` for a ×N group, and apply one amount to each; the selection clears afterwards.
- **Players see:** enemy names in the order, never their hit points; hidden enemies do not appear until the GM reveals them. Teammates' hit points and conditions are visible and read-only.
- **Turn control.** `Next turn` (GM) moves the highlight down the list and loops with a new round. A player's `End Turn` passes the turn to the next row. The "Your turn" banner shows for the player whose row is current. When an enemy is current the GM narrates; no banner.
- **Never blocks the GM.** Drag a row to reorder, skip a turn, delay a turn, add or remove an enemy mid-fight.
- **A player's own row in combat has the same Damage / Heal / Temp HP entry** (the Character tab remains the full editor).
- **Replaces the manual turn picker.** The "Give turn to…" / "Clear turn" panel is retired once `Next turn` exists.

### Phase 3: Encounter prep

- Under the campaign, GM-only: create named **encounters** (a set of enemies with name, hit points, optional AC and notes, and counts). Edit and delete them. No session needed.
- Launching an encounter into combat creates **fresh copies**; hit points lost in a fight never change the prepared encounter, so it can be run again.
- Players can never read encounters or their contents (server-enforced).

### Phase 4 and later (not in scope here, shape the data now)

- **Monster library:** a `monster` content kind from the 2024 SRD (to be verified against the export source) with "Add from library" prefilling name, hit points and AC, and a tap-through stat block. The GM's own homebrew monsters live beside it through the existing homebrew system.
- **Saved enemies** ("save this goblin captain for next time").
- Player-entered initiative as an opt-in; a "bloodied" marker; a Realtime-backed presence indicator.

Considered and not planned for now: condition timers and reminders, monster-library prefill in Phase 2, stored initiative modifiers, an in-combat rules lookup, an offline save status.

**Shaping rule:** an enemy is a plain record (name, hit points, AC, notes, hidden) that a library entry can pre-fill. Do not couple the record to library data.

## What changes in what is built

- The "Give turn to…" panel and the manual turn picker are replaced by `Next turn` (Phase 2); the picker's database turn column is removed and turn state lives in the battle order.
- `End Turn` changes from "clear the turn" to "pass to the next in the order".
- The session and combat badges, the "Your turn" banner and the GM status line on the campaign screen remain. The GM's campaign screen gains the Party / battle-order page.
- The 10-second polling on session data gives way to live updates (Phase 1 for party data; the same mechanism should serve session and combat state).

## Requirements that cut across phases

- **Server-enforced privacy.** Enemy hit points, hidden enemies and prepared encounters must not be readable by non-GM members, whatever the client does. The builder chooses the mechanism.
- **Roles.** GM = the campaign's GM. Players are active members. Invited members and non-members see nothing.
- **Accessibility.** Touch targets 44pt; the current turn is not conveyed by colour alone; the turn change is announced to screen readers; hit-point values are text, not only bars.
- **Design system.** The existing tokens and components; no red except for destructive and error uses.

## Success (informal, a small app)

- A full fight runs from roll call to the last enemy without anyone asking "who's next?" out loud.
- The GM can answer "what's everyone's passive perception?" from one screen.
- No spoiler leaks in testing across a GM device and two player devices.
- Changes show on other devices within about 2 seconds.

## Calls made while writing this (mine, not the owner's; check them)

- **Systems.** The extra party-card fields are D&D 2024 only. Other systems (Daggerheart is only a stub today) fall back to name, a hit-point style bar if the system has one, and conditions. A per-system "party summary" hook on the system module is the builder's route.
- **What is live.** Live (about 2 seconds) means stored values: hit points, temporary hit points, conditions and inspiration. Derived values (AC, passive scores, speed, senses) are computed on the phone and refresh when the page opens, on a slower interval and on pull-to-refresh; they are not pushed live. Revisit if gear changes mid-session turn out to matter.
- **Who is the GM.** The campaign's GM (`campaigns.gm_id`, what `is_campaign_gm` checks). A co-GM role is out of scope; a member given role `gm` gets no extra powers. A GM has no character today (joining with one is refused), so the GM gets no row and no banner. Revisit if GMs ever get characters.
- **Enemy visibility.** To players, an enemy is a name and a position only. Armor class, notes and hit points are GM-only.
- **Encounters and combat.** An encounter can be launched at the roll call or into a running fight (reinforcements), and several can be combined: launching just adds enemies. Enemies and the order belong to the session's current combat. Ending combat discards them; ending the session also ends combat. Resuming an interrupted fight is out of scope.

## Open questions

| Question | Owner | Blocking? |
|---|---|---|
| ~~Initiative ties~~ Closed: the GM drags to break ties; a stored-modifier rule is not planned. | Product | Closed |
| ~~Skip of absent or downed players~~ Closed: only by the GM's choice. | Product | Closed |
| Should teammates' hit points show as numbers, or a bar only? (Draft shows both.) | Product | No |
| Does a GM who also has a character get a row and a banner like a player? | Product | No |
| What is the right live-update mechanism for characters, given row-level security? | Engineering | Yes for Phase 1 |
| How are hidden enemies and enemy hit points kept off players' devices while still sharing order and names? | Engineering | Yes for Phase 2 |
| ~~Round counter~~ Closed: included (`Round n`). | Product | Closed |

