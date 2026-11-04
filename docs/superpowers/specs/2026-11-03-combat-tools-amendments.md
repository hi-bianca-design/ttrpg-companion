# Party and GM Combat Tools: Proposed Amendments

**Date:** 2026-11-03
**Status:** Partly accepted. A0, A1 and A2 went into the Phase 2 plan (`plans/2026-11-03-battle-order-and-enemies.md`) and the PRD. A3 to A7 are deferred, kept here as evidence for later phases; nothing in them is decided.
**Amends:** `2026-11-03-party-and-combat-design.md` (on branch `claude/party-languages-dc-plan-c8b956`, built by the "Open session feature planning" session). That file is not edited here; each amendment names the section it changes.
**Evidence:** the Reddit pain-points research of 2026-11-03 (thread IDs below are Reddit base-36 IDs). It is a non-random sample of 34 threads, so it shows what people ask for, not how many.

---

## The outcome we are aiming at

A DM finishes a session and says: **"I spent more time storytelling than calculating."**

The combat PRD already removes the biggest chore, because players own their own numbers and the GM never types the party's HP. The amendments below remove the chores that are left on the GM's side of the table.

## What the PRD already covers (keep as is)

- Players enter and own their HP and conditions; everyone sees them live (research want #4, #10).
- A roll-call screen that auto-sorts the order as numbers go in; grouped enemies that share one roll with `×N`.
- A highlighted current turn and `Next turn`.
- Hidden enemies and GM-only enemy HP, enforced on the server (research want #11).
- Prepared encounters launched in one action.

## Principle change (A0)

**Changes:** "Design principles", item 1, and the "Non-goals" line about attack and damage automation.

Today: *"A scoreboard, not a referee... No rules automation (no damage maths, no saving throws)."*

Proposed: **"A scoreboard with a calculator, not a referee."** The app does arithmetic the GM would otherwise do in their head (subtract damage, add healing, sort, count rounds, expire timers). It never decides a rule: no hit or miss, no saving throws, no resistance or vulnerability, no choosing targets.

**Why:** the research's loudest DM request is that HP math is "the fiddliest part of running combat" (1v2mz64, score 14), and the tool praised for doing it was bookmarked. The PRD's own anti-goal ("any step that takes longer than saying it out loud") is not met if the GM does the subtraction in their head and then types the result.

**Still out of scope:** a dice roller, attack automation, saving throws, resistances, a rules engine. These stay non-goals.

---

## Amendments

Each one lists the section it changes, the requirement, how to check it, and where the evidence is. Priority: **P0** fits the current phase and removes calculating on its own; **P1** is worth doing in the same release if the builder has room; **P2** can wait.

### A1. Damage and heal entry (P0)

**Changes:** Phase 2, "Enemy rows (GM)": replaces "editable hit points (minus/plus)".

- Each enemy row has one number field and two buttons, **Damage** and **Heal**. Typing `7` and tapping Damage subtracts 7. The current HP updates and shows `current/max`.
- Temporary HP: a third action, **Temp HP**, sets or raises the enemy's temp HP. Damage uses temp HP first. Healing never raises temp HP.
- HP never goes below 0 or above max, and the row shows a clear "down" state at 0. The GM can still type an exact value to correct a mistake.
- Number-pad entry; one tap to focus the field; the field clears after Damage or Heal. Undo for the last change on that row.
- The same Damage / Heal entry is available on a player's own row (in combat, the PRD already lets a player nudge their own HP) so players do the same maths on their own character.

**Acceptance:** From a row at 22/30, typing 7 and tapping Damage gives 15/30; typing 20 gives 0/30 (not -5); tapping Undo restores the previous value. With 5 temp HP and 12 HP, 7 damage leaves 0 temp and 10 HP.

**Evidence:** 1v2mz64 (damage button, negative values for healing, "fiddliest part"); 1vpsyhg (trackers praised for HP and temp HP handling).

### A2. Bulk damage to several enemies (P0)

**Changes:** Phase 2, enemy rows.

- The GM can select several enemy rows (tap to select) and apply one Damage or Heal amount to all of them. The app subtracts per row. It does not roll saves or halve damage; if some targets take half, the GM applies those separately.
- A `×N` group gets a **Select group** shortcut so a fireball on "Goblin 1 to 4" is two taps plus the number.
- After the action, the selection clears.

**Acceptance:** Select Goblins 1 to 4 (HP 7 each), enter 5 and tap Damage: all four show 2/7. Adding a fifth goblin mid-fight does not change the others.

**Evidence:** 1vpsyhg ("bulk damage to several targets at once").

### A3. Conditions with timers and reminders (P1)

**Changes:** Phase 2, "Enemy rows (GM)" and the battle order cards; touches Phase 1 conditions display.

- A condition can carry an optional **duration**: a number of rounds, "until the end of the target's next turn", or "until the start of the source's next turn". Without one it stays until removed (the current behaviour).
- At the start or end of the affected row's turn, the GM sees a short prompt: "Torin: Frightened ends now. Remove?" with one-tap Remove or Keep. Nothing is removed without the GM's tap, so the table is never blocked.
- Applies to enemies (the GM sets it) and to player conditions (the owner sets it; the reminder is shown to the owner and the GM).
- A condition can name a **dependent**: removing "Grappled" from the source's row removes it from the targets, after a one-tap confirm.

**Acceptance:** Apply Frightened for 1 round to Goblin 2 when the round is 3. At the same point in round 4 the GM sees the prompt. Tapping Keep leaves it and asks again next turn.

**Evidence:** 1vpsyhg (end-of-turn reminders, dependent conditions clearing automatically). The PRD's own principle 1 argues for one-tap prompts, never auto-removal.

### A4. Pull a basic monster library forward (P1)

**Changes:** Phase 4 ("Monster library") moves a **first slice** into Phase 2 or 3. The "Shaping rule" stands (an enemy is a plain record that a library entry can pre-fill).

- First slice: SRD monster **name, HP, AC and speed** only, as a prefill in "Add enemy" and in encounter prep. No stat-block viewer yet; that stays in Phase 4.
- Adding by name from the library asks only for the count (`×N`). The GM can still type a custom enemy.
- The library is SRD content only (same licence boundary as the rest of the app; see `docs/legal/content-licensing.md`).

**Why:** typing a name, HP and AC for every monster is the main bookkeeping left on the GM. The PRD defers it because stat blocks are large, but a four-field prefill is small. If the SRD data can't be sourced cheaply, this stays in Phase 4 and A4 is dropped.

**Acceptance:** Adding "Goblin ×4" from the library creates four rows with the library HP and AC and the shared initiative option, with no other typing.

**Evidence:** 1x1xmrq, 1wi1zoo (homebrew entry is the pain, so prefill and duplicate beat blank forms); research ranking #3 (duplicate from SRD).

### A5. Initiative ties and stored modifiers (P1)

**Changes:** "Open questions", the tie question, and the roll-call screen.

- Default tie rule: higher stored initiative modifier first, then players before enemies, then the GM drags to break a remaining tie (the PRD's current default).
- Each party member's initiative modifier is read from their character (it exists on the sheet today). The GM can set a modifier on an enemy, or take it from the library entry in A4.
- Optional: a **Roll for the group** helper is *not* proposed. Dice stay physical (PRD principle 2).

**Acceptance:** Two rows at initiative 15, one with +3 and one with +1: the +3 row sorts first with no GM action.

**Evidence:** 1vpsyhg ("ties resolved by stored modifiers").

### A6. Quick rules lookup from the combat screen (P1)

**Changes:** new item under Phase 2, "What the GM and players can open from the battle order".

- A **Rules** button on the battle order opens a bottom sheet with search over **conditions** first, then spells and items from the SRD content already in the app. It does not require a character sheet and does not leave the screen.
- Free and unfiltered. SRD only.
- Tapping a condition on any row opens its description in the same sheet.

**Acceptance:** From the battle order, tap Rules, type "pron", see Prone and read the effect, then close the sheet and land on the same screen and scroll position.

**Evidence:** 1wxppk7 (score 50, conditions lookup without opening a sheet), 1tqc4vg, 1w2o6c7.

### A7. Visible save and connection state (P2)

**Changes:** "Requirements that cut across phases", and Phase 1's existing "reconnecting" marker.

- A small, quiet status that always shows one of: *Saved*, *Saving*, *Offline, will sync*. It appears on the battle order and on the encounter-prep and enemy forms.
- Edits made while offline are kept on the device and sent when the connection returns. The status never blocks input.
- Encounter prep forms keep a local draft so a failed save loses nothing.

**Acceptance:** Turn on airplane mode, change an enemy's HP, see *Offline, will sync*; turn it off and see *Saved* with the value on the other devices.

**Evidence:** 1x1xmrq (lost work, "failed to save"), 1w03atk and 1ej0fu9 (stale data and download failures); research ranking #4.

---

## What this does to the phases

| Phase | Today | With amendments |
|---|---|---|
| 1. Party page | Live stats, read-only for others | Unchanged. A7's status marker extends the existing "reconnecting" marker. |
| 2. Battle order | Roll call, enemies typed in, minus/plus HP, Next turn | Adds A1 (damage and heal), A2 (bulk), A3 (condition timers), A5 (ties), A6 (rules lookup). A4's library prefill if the data allows. |
| 3. Encounter prep | Typed-in enemies | Uses A4's library prefill. |
| 4. Monster library | Library with stat blocks | Reduced to the stat-block viewer, saved enemies and homebrew monsters, since the prefill slice moves earlier. |

## What this does not change

- Players own their numbers; the GM never edits a player's HP or conditions.
- Dice stay physical; there is no roller.
- No map, grid or tokens.
- Players never learn enemy HP, and hidden enemies stay off their devices (server-enforced).
- No red outside destructive and error uses; touch targets stay 44pt.

## Anti-goals added

- The GM does more taps for a common action than before (for example Damage takes more than two taps and a number).
- The app removes a condition, a turn or an enemy without the GM's tap.
- A "calculator" feature starts deciding rules (resistance, saves, hit or miss).

## Open questions

| Question | Blocking? |
|---|---|
| Can an SRD 2024 monster dataset (name, HP, AC, speed) be sourced and shipped under the existing licence boundary? | Blocks A4 only |
| Does damage entry also apply to a player's row on the party page, or only on their own Character tab? (Proposed: both, in combat only.) | No |
| Should "down at 0 HP" for a player character prompt death saves? (Proposed: no; out of scope, show the state only.) | No |
| Is a round counter wanted? A3's "ends in N rounds" needs one. | Blocks A3 only |
| Do we cap undo to the last change per row, or keep a short history? (Proposed: last change.) | No |

## Calls made while writing this (mine, not the owner's)

- Priority tags (P0, P1, P2) are my judgement from how often the research mentions each item and how much GM calculating it removes.
- The "one tap Remove or Keep" prompt in A3 is my reading of the PRD's "never blocks the GM" principle. Auto-removal would be faster but breaks that principle.
- A4 depends on data I have not checked. I assumed a small SRD monster set exists in a usable format.
- I did not edit the PRD or touch the other session's branch.
