# Flow A: GM Runs a Fight (UX Spec)

**Date:** 2026-11-06
**Status:** Draft (for review)
**Parent:** `2026-11-06-gm-table-redesign-prd.md` (principles, business shape and decisions are there and are not repeated)
**Amends (without editing them):** `2026-11-03-party-and-combat-design.md` Phase 2 (the GM's roll-call becomes a review screen with drag-only ordering; the GM's combat view becomes enemy cards) and Phase 3 (encounter launch).
**Review method:** the five parts below were walked through with the product owner one at a time. Decisions are marked **decided**; everything marked *my call* or *guess* needs a check.

---

## Scope

The GM's screens from "I'm about to start this fight" to "the fight is over":

1. Launching a prepared fight, and the review screen before it starts.
2. The combat screen: enemy cards, initiative strip and turn control.
3. Quick-add for an improvised enemy.
4. Search, always one keystroke away.
5. Behavior when the connection drops.

Out of scope here: authoring encounters and their story notes (Flow B), the branching map itself (Flow C), the player's own screens (Flow D, unchanged), and scanning (Flow B).

**Device:** web first, laptop or tablet in landscape, paper alongside (decided in the PRD). A phone is a fallback and not designed for here.

## The flow at a glance

```
Encounter list (now)  ─┐
Map ⚔ chip (Flow C)   ─┴→  Review screen  →  [Enter combat]  →  Combat screen  →  [End combat]
                                                                  │      ▲
                                                  Add enemy ──────┘      │
                                                  Cmd/Ctrl+K search  ────┘ (any time)
```

## 1. Launch and review (decided)

**Entry points.** A GM starts a fight by picking its encounter. Until the map exists (Flow C) that is a plain list of saved encounters in the campaign. Once the map exists, it is the ⚔ chip on the current scene. Both open the same review screen.

**Tapping an encounter never starts combat.** It opens the review screen. Combat starts only when the GM taps **Enter combat**.

**Review screen, one screen, three jobs:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back            Goblin Ambush at the Camp                [Enter combat] │
├────────────────────────────┬─────────────────────────────────────────┤
│ STORY (GM only)            │ INITIATIVE ORDER  (drag to set)         │
│ How they got here          │  ⠿ ↑↓  Elara (Player, waiting)          │
│  The party followed the    │  ⠿ ↑↓  Goblin Boss                      │
│  tracks from the road.     │  ⠿ ↑↓  Wolf 1                           │
│ Why this fight exists      │  ⠿ ↑↓  Wolf 2                           │
│  The goblins guard the map.│  ⠿ ↑↓  Thorin (Player)                  │
│ What happens after         │                                         │
│  The map leads to the cave.│  [+ Add enemy]                          │
├────────────────────────────┴─────────────────────────────────────────┤
│ ENEMIES (same cards as in the fight, not live yet)                   │
│ [Goblin Boss AC17 HP21 XP 200] [Wolf ×2 AC13 HP11 each XP 50] …      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Story panel (decided):** three GM-only notes written at prep: how the players got here, why the encounter exists, what happens after. They let the GM confirm they picked the right fight. Players never receive them (server-enforced, same as prepared encounters today). If a note is empty it is hidden, not shown blank.
- **Enemy cards (decided):** a quick look at the monsters as they will appear in combat.
- **Initiative (decided): drag only. No typing.** The GM drags enemies and players into order on this screen. Every row also has move up and move down buttons for anyone who cannot drag. The order is a sequence with no stored numbers, so ties never occur. This replaces the roll-call's number entry.
- Players who have not joined show as **waiting** and can be placed. If they join before combat starts they take their place. *(my call)*
- The GM can mark an enemy **Hidden** here before combat, exactly as today. *(carried over)*
- **Back** leaves with nothing changed. The saved encounter is never edited by what happens here.
- Launching makes **fresh copies**; hit points lost never change the saved encounter, and the same encounter can be launched again or added mid-fight for reinforcements (carried over from the existing spec).

## 2. Combat screen

### 2a. Enemy cards (decided: layout B, all enemies visible)

Enemy numbers are visible to the GM at all times, not only on that enemy's turn.

```
┌ Round 3 ──────────────── XP earned: 250 ───── [⌘K Search] [+ Add enemy] ┐
│ ┌─ Goblin Boss ─────────┐ ┌─ Wolf ×3 ───────────┐ ┌─ Bugbear ─────────┐│
│ │ AC 17        XP 200   │ │ AC 13        XP 50  │ │ AC 16     XP 200  ││
│ │ HP ████████░ 17/21    │ │ W1 11/11 [−][+]     │ │ HP ██████████ 27  ││
│ │ [−][+][ amount ]      │ │ W2  4/11 [−][+]     │ │ [−][+][ amount ]  ││
│ │ (Prone) (+ condition) │ │ W3  down            │ │ (+ condition)     ││
│ │ Scimitar +4 · 1d6+2   │ │ Bite +4 · 2d4+2     │ │ Morningstar +4 …  ││
│ │ ▸ Full stat block     │ │ ▸ Full stat block   │ │ ▸ Full stat block ││
│ └───────────────────────┘ └─────────────────────┘ └───────────────────┘│
│ Order: Elara · ▶ Goblin Boss · Wolf 1 · Wolf 2 · Thorin    [Next turn]  │
└──────────────────────────────────────────────────────────────────────────┘
```

**A card shows (decided, including XP):** name; the main defense value, large (armor class in D&D); health with a bar and quick damage and heal; condition chips; the key attacks, ready to read out; **XP value for that enemy**; and an expander for the full stat block.

- **Identical enemies** share one card with separate health per creature ("Wolf ×3"). Damage and heal apply to one creature at a time; the existing bulk-damage feature (select several rows, one amount each) remains.
- **Fixed-size cards** so the screen does not shift mid-fight. Three or four across on a laptop. With more enemies, the cards wrap into rows, then scroll; a downed enemy collapses to a thin row. *(my call)*
- **Damage and heal** follow the existing rules: one number field, **Damage** and **Heal**, temp HP absorbs damage first, health clamped between 0 and max, a **Down** state at 0, a typed exact correction, undo of the last change on that card.
- **XP (decided):** shown only for systems or campaigns that award kill XP, and optional per enemy. It prefills from the library or a scan and the GM can edit it. **GM only: players never see XP.** The **XP earned** total at the top counts each enemy when it goes down. *(my call: if the enemy is healed above 0 or undone, its XP leaves the total.)*
- **Players see the monster's name only (decided):** no stats, no HP, no XP. Hidden enemies are omitted entirely (unchanged, server-enforced).
- Conditions: tap **+ condition**, pick from the system's list. No timers (unchanged).

### 2b. Initiative strip and turn control (decided)

- A slim bar along the bottom: everyone in order, the current turn highlighted (not by colour alone), and the round counter at the top.
- **Next turn** is one large button. It moves down the order and starts a new round when it wraps.
- **Downed enemies are skipped automatically.** The GM can tap a downed enemy in the strip to stop on it. Players who are down are never skipped automatically (skipping stays the GM's choice, as decided before).
- **Changing the order mid-fight:** drag a name to a new spot (covers delay, skip and surprise turns), with the move buttons as the alternative.
- **The players' "Your turn" banner stays as built (decided)**, along with the players' battle order by name and the hidden-enemy handling. Players' End Turn still passes to the next row.
- The strip reads from the same battle order data as the players' view; it is not a second tracker. *(my call)*

### 2c. Ending combat

- **End combat** (GM) discards the enemies and the order, as today, and shows a short summary: rounds fought and **XP earned**. XP is not credited to characters automatically. *(my call; see open questions)*

## 3. Quick-add (decided)

One **Add enemy** button opens a box with three paths, fastest first:

1. **Copy an enemy already in the fight:** a "+1" on a card adds another at full health.
2. **Search and pick:** type a few letters; results come from the campaign library, the SRD monsters and anything scanned. The enemy appears as a complete card.
3. **Blank enemy:** a name and health only. Everything else is optional and can be filled in on the card later.

A new enemy lands at the bottom of the order and the GM drags it into place. Players see only its name. It is not saved to the library unless the GM taps **Save for later** on the card.

## 4. Search (decided: Cmd+K)

- **Cmd+K on Mac, Ctrl+K elsewhere,** from anywhere in the GM's screens, opens search. The bar at the top also opens it on click. *(Cmd+K is decided; the bar is my call.)*
- **Searches:** the campaign library (NPCs, monsters, locations, lore, scenes) and the SRD rules and spells, grouped by type. The product owner has not yet said which of these the GM looks up most, so the first release includes both. *(my call)*
- **Results open in a side panel next to the cards,** so enemy numbers stay visible. On a narrow tablet the panel overlays them. *(my call)*
- **Scene-aware:** items linked to the current scene appear first once the map exists. *(my call)*
- **Escape closes search** and returns to exactly where the GM was.

## 5. When the connection drops (decided in the PRD)

- The cards keep showing the **last known numbers** and accept damage, heal and condition edits and turn changes. A quiet **Offline** marker shows; nothing else blocks.
- Changes **sync when the connection returns.** The campaign library and the SRD are cached on the device so search and the review screen keep working. *(caching approach is my call)*
- **Conflicts** (for example a player changed their own HP while the GM was offline): player-owned numbers always win for a player's own character; GM edits win for enemies. *(my call)* The GM sees a brief notice when a value changed on reconnect.
- Players never receive enemy data while offline or after, as before.

## States and edge cases

| Situation | Behavior |
|---|---|
| Encounter has no story notes | Story panel is hidden; the rest of the review screen fills the space. |
| No saved encounters (before Flow B ships) | The list is empty with a clear way to create one or quick-add enemies on an empty combat screen. |
| A player leaves or has no character mid-fight | They stay in the order, marked; the GM can remove them. |
| All enemies down | The screen suggests **End combat** but does not end it automatically. |
| More than about 8 enemies | Cards wrap and scroll; downed enemies collapse. |
| Long names and many conditions | Names truncate with the full name on expand; condition chips wrap within the card. |
| The GM taps Enter combat with an empty order | Allowed; they can add enemies and players as they go. |
| Two devices edit the same enemy | Last write wins for enemies, and the card shows who changed it only if both are GM devices. *(my call; one GM expected)* |

## Accessibility (carried from the existing spec)

Touch targets 44pt; the current turn is not shown by colour alone; the turn change is announced to screen readers; health values are text, not only bars; every drag has a button alternative; search and Next turn are keyboard reachable.

## Data this implies (for the plan, not a design)

- An enemy remains a plain record. New optional fields: a defense label, a list of attacks, XP, and free-form sections (the flexible stat block is Flow B; Flow A builds the minimal shape from the PRD).
- An encounter gains three GM-only story notes. Authoring them is Flow B or C; Flow A only displays them.
- The order is a sequence; the old stored-number initiative is no longer needed for ordering.

## Decisions made in review

| Decision | Source |
|---|---|
| Launch from the encounter map; tapping never starts combat | Product owner |
| Review screen with story notes, enemy cards and drag-ordering on one screen | Product owner |
| Initiative is drag only, no typing | Product owner |
| Card shows XP; running XP-earned total; GM-only stats and XP; players see names only | Product owner |
| Quick-add with three paths (copy, search, blank) | Product owner (approved a proposal) |
| Next turn auto-skips downed enemies; GM can stop on one | Product owner |
| "Your turn" banner stays | Product owner |
| Cmd+K opens search | Product owner |

## Open questions

| Question | Owner | Blocking? |
|---|---|---|
| What does the GM look up most mid-fight: rules and spells, or their own campaign material? Decides what search ships first. | Product | No (v1 includes both) |
| Should XP be tracked across the session and per character, with a "ready to level up" signal? The XP-earned total is decided; carrying it further is not. | Product | No |
| Which systems show XP, and does a campaign get a setting for milestone leveling? | Product | No |
| Where are the three story notes authored: on the encounter (Flow B) or on its map scene (Flow C)? | Product | Yes for Flow B and C specs |
| Is a conflict ever shown in more detail than a brief notice? | Product | No |

## Calls I made while writing this (check them)

Players joining late take their place in the order; a downed enemy collapses; the XP total drops if an enemy is revived; the bar at the top also opens search; both rules and campaign search ship in v1; results open in a side panel; scene-aware ordering; the offline conflict rule (players win for their own numbers, the GM for enemies); the strip reads the shared order; XP is not credited to characters automatically.

## Next

Review this spec. When it's approved, write Flow A's tickets from it. Then start Flow B's UX spec.
