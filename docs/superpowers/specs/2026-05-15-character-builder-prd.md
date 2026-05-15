# Character Builder — PRD
**Date:** 2026-05-15
**Status:** Approved
**Module:** Character Builder (Creation Wizard · Character Sheet · Level-Up)

---

## Overview

The Character Builder covers three connected flows: the **Creation Wizard** (guided character creation), the **Character Sheet** (day-to-day and in-session reference), and the **Level-Up Flow** (between-session progression). All three share the same soft-enforce rules philosophy: invalid choices are warned, never blocked, to accommodate homebrew play.

---

## Creation Wizard

### Navigation & Structure

A 7-step wizard (PHB 2024 order) that encourages linear progression but allows full non-linear access.

**Progress bar:** A horizontal row of 7 step indicators pinned to the top of the screen. Each indicator shows one of three states:
- **Not started** — no input on this step yet
- **In progress** — step has been visited but not all required fields are filled
- **Complete** — all required fields filled (optional fields do not affect completion state)

Tapping any indicator jumps directly to that step. Step 5 (Spells) is hidden from both the bar and the drawer when a non-spellcasting class is selected — it appears only when a spellcasting class is chosen, and disappears again if the user switches to a non-spellcasting class (with selective clear, see Cascade section).

**Slide-out step drawer:** A swipe-right gesture (or hamburger icon) opens a full list of all applicable steps with their completion state and a short label. The drawer is the primary mechanism for non-linear navigation; the progress bar is the at-a-glance status.

Navigation is **fully non-destructive** — going back or jumping to a previous step never clears choices. All changes require explicit user action.

### Step Content & Rules

**Starting level** is the first field in Step 1. The wizard dynamically expands to accommodate all cumulative level-up choices. Within each affected step, choices are grouped into level-divided sections (e.g. for a Fighter starting at level 5, Step 1 shows: *Level 1 — Class*, *Level 3 — Subclass*, *Level 4 — ASI or Feat*). Sections for levels not yet reached are hidden.

**Rules enforcement is soft throughout.** Invalid or unmet choices (feat prerequisites, spell slot counts, proficiency requirements) remain visible and selectable but show an inline warning chip — e.g. *"Requires STR 13 · current: 10"*. No choices are blocked; the user can proceed with warnings present. This covers homebrew scenarios where standard rules don't apply.

**Spells step** appears only when a spellcasting class is selected. It adapts per class: cantrip count, spells known vs. prepared distinction, and available spell list all reflect the chosen class and level.

### Steps

| Step | Content |
|---|---|
| 1 | Choose a Class — hit die, proficiencies, primary abilities; starting level selection |
| 2 | Determine Origin — Background and Species; both affect ability scores |
| 3 | Ability Scores — Standard Array / Point Buy / Roll; source breakdown per score |
| 4 | Alignment & Personality — alignment, traits, ideals, bonds, flaws |
| 5 | Spells *(conditionally shown for spellcasting classes only)* |
| 6 | Remaining Details — name, age, appearance, backstory, starting equipment, illustrations |
| 7 | Review & Finalize — full sheet preview before saving |

### Step 6: Remaining Details & Illustrations

Step 6 includes two optional illustration upload slots: **Profile View** and **Full Body View**.

Each slot supports:
- **File upload** — JPEG or PNG, max 5MB, max 2048×2048px. UI hint recommends portrait crop (1080×1920) for full body art.
- **URL upload** — the app validates the URL resolves to a valid JPEG or PNG before accepting it. An inline error is shown immediately if validation fails.

On the character sheet, both images are accessible as tappable thumbnails. Tapping either opens a full-screen modal covering the majority of the screen with a close button. Unset slots show a placeholder with an "Add illustration" prompt.

### Save, Draft & Exit Behavior

Progress is **auto-saved continuously** as the user makes choices — no manual save required.

Incomplete characters appear in the character list as **Drafts**, visually distinct from complete characters (Draft badge, dimmed appearance). Exiting the wizard mid-way — via back gesture, navigation, or closing the app — shows no prompt. The draft is preserved and the user returns to the character list. Resuming a draft re-opens the wizard at the last visited step with all prior choices intact.

**Finalizing (Step 7):** If required fields on earlier steps are missing, a warning sheet slides up listing the incomplete steps with jump links. The user can return to complete them or tap **"Create Anyway"** to finalize with gaps (for homebrew flexibility). On confirmation the character graduates from Draft to active in the character list.

### Live Preview

A **sticky bottom sheet** is anchored to the bottom of every wizard step. Collapsed, it shows the most relevant stats for the current step (e.g. ability score totals on Step 3, hit die and proficiencies on Step 1). The user can swipe it up at any time to expand the full character preview — all choices accumulated so far, updating in real time as the user interacts with the current step.

### Cascade & Change Behavior

When a user changes a foundational choice with downstream effects (class switch, ability score method switch), a **warning sheet slides up before any data is cleared**. The sheet names exactly what will be cleared — e.g. *"Switching to Fighter will remove your selected spells and clear your subclass choice."* The user must tap **"Confirm Change"** to proceed; dismissing the sheet cancels the change and preserves current state.

On confirmation, **only directly invalidated fields are cleared** — unaffected choices on other steps are preserved. Affected steps revert to In Progress or Not Started in the progress bar depending on what remains.

The same pattern applies within Step 3 when switching ability score methods (e.g. Point Buy → Standard Array): warning sheet, confirm, clear current assignments only.

### Post-Creation Editing

The character sheet has an **Edit** button that re-opens the creation wizard in edit mode. All fields are pre-filled with current values. The wizard behaves identically to creation — non-linear navigation, non-destructive by default, same cascade warnings on foundational changes. Saving from edit mode updates the character in place; no new draft is created.

---

## Character Sheet

### Modes

The sheet has two distinct modes — **out-of-session** and **in-session** — with the same 4-tab structure.

**Out-of-session mode** is read-focused. HP damage/heal/temp HP controls are accessible but tapping them triggers a bottom sheet warning: *"You're not in an active session — this change won't sync to your party."* The user must confirm before the change applies.

**In-session mode** activates when the DM starts a session. On entry, a notification banner appears: *"Session started — stats restored to last saved values for your party."* HP and conditions for all party members are restored from the last session. Combat controls are promoted and session-specific overlays (death save tracker at 0 HP) become active.

**Collapse state** for all collapsible sections persists across tab switches, sub-tab switches, and app backgrounding.

### Tab Structure

| Tab | Contents |
|---|---|
| Character | XP bar (header) · Combat sub-tab · Profile sub-tab |
| Actions | Attacks · Spells · Class Features · Bonus Actions · Reactions |
| Inventory | Equipped · Backpack · Custom Items · Currency · Encumbrance |
| Campaign | Campaign header · Party Members · Notes |

### Character Tab

**XP bar** is pinned to the top of the Character tab, always visible above the sub-tabs. Shows current XP, XP required for next level, and a tap-to-edit value. When XP reaches the next level threshold, a contextual Level Up prompt appears (see Level-Up section).

**Combat sub-tab** — collapsible sections:
- *Status* — HP bar with damage / heal / temp HP controls; death save tracker (replaces HP bar when HP hits 0 in-session)
- *Combat Stats* — AC, initiative, speed, proficiency bonus
- *Saving Throws* — all 6 with proficiency indicators
- *Conditions* — active conditions as badges; add/remove in-session

**Profile sub-tab** — collapsible sections:
- *Ability Scores* — all 6 scores with modifiers and source breakdown (base / background / species)
- *Skills* — full skill list with proficiency/expertise indicators and passive perception
- *Personality* — traits, ideals, bonds, flaws
- *Appearance* — age, physical description, character illustrations (profile view and full body view as tappable thumbnails opening a full-screen modal)

### Actions Tab

Scrollable view with collapsible sections:
- *Attacks* — weapon cards showing hit bonus, damage dice, damage type; tap to expand or roll
- *Spells* — grouped by spell level; each level header shows slots available / slots used with a tap-to-expend control in-session; cantrips shown at top as unlimited; each spell card shows school, casting time, range, components, tap-to-expand description. Spell slot tracking is live in-session (Supabase Realtime) and read-only out-of-session. Expended slots restore on long rest.
- *Class Features* — passive and active features from class and subclass; active features (e.g. Action Surge, Bardic Inspiration) show a use-tracker with charges and a short/long rest reset indicator
- *Bonus Actions* — surfaced from class features and spells
- *Reactions* — surfaced from class features and spells

### Inventory Tab

Scrollable list with collapsible sections:
- *Equipped* — items currently equipped; each card shows name, type, weight, relevant stats (damage dice/type for weapons, AC for armor); tap to expand full details; toggle to unequip
- *Backpack* — unequipped items; same card format; toggle to equip
- *Custom Items* — manually added items with a "Custom" badge; editable and deletable
- *Currency* — GP, SP, CP, EP, PP with inline increment/decrement controls
- *Encumbrance bar* — pinned to the top of the Inventory tab; shows current carry weight vs. capacity (STR × 15); color-coded green / yellow / red as the limit approaches

Adding items opens a bottom sheet: search SRD equipment or create a custom item inline.

### Campaign Tab

Visible when the character is part of a campaign. If no campaign is joined, the tab shows an empty state with two CTAs: **Create Campaign** and **Join Campaign** (via DM-sent link).

**Campaign header** — campaign name, DM name, current session count.

**Party Members** — a card per member showing name, level, class, HP, and active conditions. Out-of-session: values labeled *"Last session"*. In-session: values are live and sync in real time via Supabase Realtime. The DM's card carries a DM badge. Tapping a card expands it to show AC, speed, and passive perception — read-only for all players.

**Notes** — a Notion-like list of note entries. Each note has:
- Title
- Date (defaults to creation date, user-editable)
- Visibility toggle: **Private** (visible only to this player) or **Shared** (visible to all campaign members including the DM)
- Simple text body

Notes are listed in reverse chronological order by date. Tapping a note opens it in an inline editor. A "+" button creates a new note.

---

## Level-Up Flow

### Trigger

XP is tracked in the persistent bar at the top of the Character tab. When XP reaches the next level threshold, a **contextual banner** appears prompting the player to level up. If dismissed, a **Level Up button** remains visible on the Character tab until acted upon. The button is **disabled during an active session**.

### Multi-Level Jumps

If XP skips multiple level thresholds at once, a prompt asks: *"You gained X levels — level up one at a time or all at once?"*
- **One at a time** — the flow runs sequentially; a summary screen appears between each level
- **All at once** — choices for all skipped levels are batched in a single flow, grouped by level (same inline section style as the creation wizard)

### Flow Content

The flow surfaces only choices relevant to the new level:
- **HP increase** — two options: **Roll** (animated die roll, result applied automatically) or **Take Average** (fixed value for the class hit die)
- **New class features** — displayed from SRD or custom content; no choice required for passive features
- **Subclass selection** — shown only if the new level triggers it (varies by class)
- **ASI or Feat** — shown at levels 4, 8, 12, 16, 19
- **New spell slots and spells known/prepared** — shown for spellcasting classes

All choices follow the same soft-enforce rules as the creation wizard. The Level Up button is disabled during an active session.

---

## Edge Cases Summary

| Scenario | Behavior |
|---|---|
| User exits wizard mid-creation | Auto-saved as Draft; resumes at last visited step |
| Finalizing with incomplete required fields | Warning sheet lists gaps; "Create Anyway" allowed for homebrew |
| Class switched after downstream choices made | Warning sheet lists what will clear; confirm required; only invalidated fields cleared |
| Ability score method switched mid-Step 3 | Same warning + confirm pattern; only score assignments cleared |
| Non-spellcasting class selected | Spells step hidden from progress bar and drawer |
| Spellcasting class selected after non-spellcasting | Spells step appears; previously cleared spell choices not restored |
| HP edited out-of-session | Warning bottom sheet; confirm required before change applies |
| Session started | Banner notifies party; all HP and conditions restored from last session |
| Character reaches 0 HP in-session | Death save tracker replaces HP bar for player and DM |
| XP jumps multiple level thresholds | Player chooses one-at-a-time or all-at-once level-up |
| Level Up triggered during active session | Level Up button disabled; available after session ends |
| Illustration URL invalid | Inline error shown immediately; upload blocked until valid URL provided |
