# Flow A Tickets: GM Runs a Fight

**Date:** 2026-11-06
**Source:** `2026-11-06-flow-a-gm-runs-a-fight-ux.md` (approved decisions) and `2026-11-06-gm-table-redesign-prd.md`.
**Status:** Draft, ready to move into Linear (`session-zero-app` workspace, project "GM MVP"). Not yet created there: the Linear connection in the session that wrote this was a different workspace.
**Format:** Problem, Change, Acceptance, Out of scope, Depends on. Suggested build order is the numbering.

Product rules that apply to every ticket: players see a monster's name only (no stats, HP or XP); hidden enemies and prepared encounters are never sent to players (server-enforced); the GM is on web (laptop or tablet landscape) first; dice stay physical.

---

## FA-1 Extend the enemy record for cards

**Problem.** The existing enemy is name, hit points, optional AC and notes. A card needs more, and Flow B's flexible stat block must be able to build on it without a rework.
**Change.** Add optional fields to the enemy record: a defense label (so armor class can read differently per system), a list of attacks (name, to-hit, damage), and an XP value. Keep it a plain record that library or scan data only pre-fills.
**Acceptance.** An existing enemy loads unchanged. A new enemy can store a defense label, attacks and XP. Players' reads of an enemy still return only its name.
**Out of scope.** Free-form sections and the full flexible stat block (Flow B).
**Depends on.** none.

## FA-2 Saved-encounter list as a launch entry point

**Problem.** The GM needs a way to start a prepared fight before the branching map exists.
**Change.** A GM-only list of the campaign's saved encounters. Selecting one opens the review screen (FA-3). It never starts combat.
**Acceptance.** Empty list shows a clear next step. Selecting an encounter opens review and changes nothing. Players cannot read the list.
**Out of scope.** Authoring encounters (Flow B). The map's fight chip (Flow C) opens the same review screen later.
**Depends on.** none (encounters may be seeded or created through Flow B work).

## FA-3 Review screen before combat

**Problem.** A GM must confirm they picked the right fight before starting it.
**Change.** One screen showing three GM-only story notes (how the players got here, why the encounter exists, what happens after), the enemies as the cards they will be in the fight, and the initiative order (FA-4). A Back control leaves with nothing changed; **Enter combat** starts combat. Empty story notes are hidden. Launching creates fresh copies of the enemies.
**Acceptance.** Opening review does not start combat. Back leaves the saved encounter and all state unchanged. Enter combat starts combat with the copies and the chosen order. Story notes never reach a player device. Hidden can be toggled on an enemy here.
**Out of scope.** Writing the story notes (Flow B or C; location still open).
**Depends on.** FA-1, FA-2, FA-4.

## FA-4 Drag-only initiative ordering

**Problem.** Typing each initiative number is tedious; the GM would rather drag.
**Change.** On the review screen, enemies and players are one list the GM drags into order. Every row has move up and move down buttons. Players who have not joined show as waiting and can be placed; if they join before combat starts they take their place. The order is a plain sequence with no stored numbers. Retire the number-entry roll-call screen.
**Acceptance.** Reordering by drag and by buttons give the same result. The order the GM sets is the order combat starts in. Ties cannot occur. No number-entry roll-call remains reachable.
**Out of scope.** Reordering during combat (FA-8).
**Depends on.** none.

## FA-5 GM combat screen: enemy cards

**Problem.** Players can attack any enemy at any time, so enemy numbers must be visible at a glance, and not only on that enemy's turn.
**Change.** Replace the GM's combat view with fixed-size enemy cards side by side. A card shows name, the main defense value large, health with a bar and quick damage and heal, condition chips, key attacks, XP (FA-7), and an expander for the full stat block. Identical enemies share one card with separate health per creature. Three or four cards across on a laptop; more wrap, then scroll; downed enemies collapse. Works in landscape on a tablet. The players' battle order is unchanged.
**Acceptance.** All enemies' defense and health are visible without a tap. Cards do not resize during a fight. A group card tracks each creature's health separately. A downed enemy collapses. Hidden enemies are marked for the GM and omitted for players. Players see names only.
**Out of scope.** The flexible stat block's free-form sections (Flow B).
**Depends on.** FA-1.

## FA-6 Damage, heal, conditions and undo on cards

**Problem.** The existing damage and heal tools were built for the old rows.
**Change.** Bring the existing behavior onto the cards: one number field with Damage and Heal, temp HP absorbed first, health clamped between 0 and max, a Down state at 0, typed exact correction, undo of the last change per card, and bulk damage across selected cards. Condition chips use the system's list; no timers.
**Acceptance.** From 22/30, 7 damage gives 15/30 and 20 damage gives 0/30. With 5 temp HP and 12 HP, 7 damage leaves 0 temp and 10 HP. Undo restores the previous value. Bulk damage applies the same amount to each selected card.
**Out of scope.** Resistances, saves and any rules automation.
**Depends on.** FA-5.

## FA-7 XP on cards and the running XP-earned total

**Problem.** The GM wants to see what each enemy is worth and what the party has earned.
**Change.** Show each enemy's XP on its card, only when the campaign or system awards kill XP; it is optional per enemy and editable. A total at the top of the screen counts each enemy's XP when it reaches 0 HP and removes it if the enemy is healed above 0 or the change is undone. XP is GM-only.
**Acceptance.** Taking an enemy to 0 adds its XP to the total; undo or healing subtracts it. No XP value or total is readable by a player.
**Out of scope.** Crediting XP to characters, level-up readiness, milestone-leveling setting.
**Depends on.** FA-1, FA-5, FA-6.

## FA-8 Initiative strip and Next turn

**Problem.** The GM needs the order and the current turn always in view, and a fast way to advance.
**Change.** A slim strip showing everyone in order with the current turn highlighted (not by colour alone) and a round counter. **Next turn** advances and starts a new round at the wrap, and skips enemies at 0 HP automatically; the GM can tap a downed enemy to stop on it. Players who are down are never skipped automatically. The GM can drag a name to a new place or use move buttons mid-fight. The strip reads from the same order data as the players' view. The players' "Your turn" banner, battle order and hidden-enemy handling stay as built.
**Acceptance.** Next turn skips a downed enemy but not a downed player. A hidden enemy's turn leaks nothing to players. Reordering mid-fight updates players' view.
**Out of scope.** Timers and automatic condition expiry.
**Depends on.** FA-5.

## FA-9 Quick-add an enemy mid-fight

**Problem.** Players go off-script and the GM needs an enemy in seconds.
**Change.** An **Add enemy** control with three paths: copy an enemy already in the fight (a "+1" on a card, at full health), search and pick from the campaign library and SRD monsters, or a blank enemy with name and health only. The new enemy lands at the bottom of the order; the GM drags it into place. It is not saved to the library unless the GM taps **Save for later**.
**Acceptance.** Each path adds a working card in a few taps. Players see only the new enemy's name. A blank enemy can be filled in later.
**Out of scope.** Scan-based adding (Flow B).
**Depends on.** FA-5, FA-10 for the search path.

## FA-10 Cmd/Ctrl+K search

**Problem.** The GM loses time hunting for rules, spells, NPCs and lore while the table waits.
**Change.** Cmd+K (Ctrl+K elsewhere) and a click on the top bar open search from anywhere in the GM's screens. It searches the campaign library and the SRD rules and spells, grouped by type. Results open in a side panel next to the cards (overlay on a narrow tablet). Escape closes and returns to exactly where the GM was. When scenes exist, items linked to the current scene rank first.
**Acceptance.** Search opens and closes from the keyboard without losing combat state. A result opens without hiding enemy numbers on a laptop-width screen. Search works offline against cached content (FA-11).
**Out of scope.** Searching other books; scanned-book content from other users.
**Depends on.** none for the shell; Flow B for the full library.

## FA-11 Offline-tolerant enemy cards and sync on return

**Problem.** A dropped connection must never leave the GM without enemy numbers mid-fight.
**Change.** The cards keep showing the last known numbers and accept damage, heal, condition and turn edits while offline, with a quiet Offline marker. Changes sync on return. The campaign library and SRD are cached on the device for search and review. Conflicts: a player's own numbers always win for their character; the GM's edits win for enemies. The GM sees a brief notice when a value changed on reconnect. Players never receive enemy data.
**Acceptance.** With the connection cut, the GM can apply damage, change turns and read every card; on reconnect the edits appear on other devices within about 2 seconds. A player's own HP change made during the outage is not overwritten by the GM's device.
**Out of scope.** Offline behavior for party and session data outside combat (Flow E).
**Depends on.** FA-5, FA-6, FA-8.

## FA-12 End combat summary

**Problem.** The GM needs a clear end to the fight and a view of what it earned.
**Change.** **End combat** discards the enemies and order as today and shows a short summary: rounds fought and XP earned. When every enemy is down, the screen suggests ending but does not end automatically. XP is not credited to characters.
**Acceptance.** Ending combat clears the cards and returns the GM to the campaign. The summary shows the right round count and XP.
**Out of scope.** Per-character XP, saving combat history.
**Depends on.** FA-7, FA-8.

---

## Open items carried from the UX spec

- Where the three story notes are authored: on the encounter (Flow B) or on its map scene (Flow C). Blocks the Flow B and C specs, not these tickets.
- Whether XP carries across the session or per character.
- Which systems show XP, and a milestone-leveling setting.
