# Character Builder — PRD
**Date:** 2026-05-15
**Status:** Approved
**Module:** Character Builder (Creation Wizard · Character Sheet · Level-Up)

---

## Overview

The Character Builder covers three connected flows: the **Creation Wizard** (guided character creation), the **Character Sheet** (day-to-day and in-session reference), and the **Level-Up Flow** (between-session progression). All three share the same soft-enforce rules philosophy: invalid choices are warned, never blocked, to accommodate homebrew play.

---

## Non-Goals

These are explicitly out of scope for v1:

- **Dice roller** — attack and spell rolls show formulas only; no in-app rolling mechanic in the Character Builder (may be added later in Session Console)
- **Mid-session leveling** — the Level Up flow is disabled during an active session; XP can be edited but leveling up requires leaving or ending the session
- **Character sharing / export** — characters are private to the owning user; no PDF export, share link, or transfer to another account
- **Offline mode** — all reads and writes require a network connection; no local-first sync
- **Homebrew rules templates** — the app accommodates homebrew through soft enforcement and "Create Anyway" affordances, but does not provide structured tools for defining or sharing house rules

---

## User Stories

### Player creating a character

- As a new player, I want a guided step-by-step wizard so that I can create my first character without needing to know the rules in advance
- As a player starting a campaign above level 1, I want to set my starting level at the beginning of the wizard so that all level-appropriate choices (subclass, ASI, spells) are surfaced inline
- As a player mid-wizard who gets interrupted, I want my progress auto-saved as a draft so that I can resume exactly where I left off without losing any choices
- As a player who changes their mind about their class, I want a clear warning of exactly what will be cleared before confirming so that I don't accidentally lose choices I want to keep
- As a player using homebrew rules, I want to finalize my character even with incomplete required fields so that I'm not blocked by rules the app can't model
- As a player multiclassing into a second class, I want to add a second class to my character and allocate levels between them so that my multiclass character is correctly built with features from both classes

### Player using the character sheet

- As a player in a session, I want my HP, conditions, and spell slots in a dedicated Combat view so that I can find and update them instantly without scrolling past reference information
- As a player outside a session, I want to edit my HP with a warning that it won't sync so that I can manage solo play or corrections without confusion
- As a player, I want my collapsible section states to persist across tab switches so that I don't have to re-open the same sections every time I navigate
- As a player, I want to see my party members' basic stats and conditions from my character sheet so that I have party context without switching to a separate screen
- As a player, I want to write private and shared notes on my campaign tab so that I can track personal reminders and share session recaps with my party

### Player leveling up

- As a player whose XP has hit the next level threshold, I want a contextual prompt to level up so that I don't miss the milestone
- As a player who skips several levels at once, I want to choose between leveling up one at a time or all at once so that I can review each level's choices at my own pace
- As a player increasing HP on level-up, I want to either roll an animated die or take the fixed average so that leveling up feels rewarding

---

## Requirements

### P0 — Must Have

These are required for the Character Builder to be usable. Nothing ships without these.

- **7-step creation wizard** with all steps per PHB 2024 order, starting level selection in Step 1, and level-divided inline expansion for higher starting levels
  - *AC:* All 7 steps render with correct required fields per class and level; spells step appears only for spellcasting classes
- **Non-destructive navigation** — progress bar with 3 completion states (not started / in progress / complete); slide-out step drawer; tapping any step jumps without clearing data
  - *AC:* Navigating between steps never clears existing choices; progress bar updates correctly as fields are filled
- **Auto-save as draft** — wizard progress persists continuously; drafts appear in character list; resuming reopens at last visited step
  - *AC:* Killing the app mid-wizard and reopening resumes correctly with all prior choices intact
- **Cascade warnings** — changing class or ability score method shows a bottom sheet naming what will be cleared; requires explicit confirm before clearing
  - *AC:* No data is cleared without a confirmation tap; dismissing the sheet leaves all data intact
- **Soft rules enforcement** — invalid choices show inline warning chips but are never blocked
  - *AC:* A feat with unmet prerequisites can be selected; the warning chip is visible but does not prevent selection
- **Character sheet — 4 tabs** (Character, Actions, Inventory, Campaign) with correct content per section
  - *AC:* All tab content renders accurately from character data; tabs are navigable without data loss
- **In-session / out-of-session modes** — HP controls accessible in both modes; out-of-session edit requires confirmation warning
  - *AC:* Out-of-session HP change shows warning sheet; change only applies after confirm
- **Session restore on entry** — banner on session start; HP and conditions restored from last saved values for all party members
  - *AC:* Entering a session shows the restore banner and all party member HP/conditions match last session values
- **Level-Up flow** — triggered by XP threshold; surfaces HP increase (roll or average), class features, subclass, ASI/feat, spells per level
  - *AC:* Level Up prompt appears when XP crosses threshold; all level-appropriate choices are shown; level increments correctly on completion
- **Post-creation editing** — Edit button on character sheet reopens wizard in edit mode with pre-filled values
  - *AC:* All existing values are pre-filled; saving updates the character in place with no new draft created
- **Multiclassing** — Step 1 supports adding a second (or third) class via "Add another class"; the user picks the additional class and allocates levels between classes; combined spell slots calculated automatically from the PHB multiclass table with user override allowed
  - *AC:* A character with Fighter 3 / Wizard 2 shows features and proficiencies from both classes; combined spell slots match the PHB multiclass table; overriding a slot count shows a soft warning; class features in Actions tab are correctly attributed per class

### P1 — Nice to Have

These significantly improve the experience but the core use case works without them.

- **Live preview bottom sheet** — sticky bottom sheet in wizard shows relevant stats for current step; expandable to full character preview
- **Animated dice roll** on HP increase during level-up
- **Character illustrations** — profile view and full body view upload slots in Step 6; URL validation; full-screen modal on character sheet
- **Death save tracker** — replaces HP bar at 0 HP in-session; syncs between player and DM
- **Encumbrance bar** — carry weight vs. capacity, color-coded, pinned to Inventory tab
- **Multi-level jump choice** — prompt when XP skips multiple thresholds; one-at-a-time or all-at-once options
- **Collapsible section persistence** — collapse state saved across tab switches and app backgrounding

### P2 — Future Considerations

Explicitly out of scope for v1 but should be kept in mind during architecture decisions.

- **Dice roller integration** — attack cards and spell cards should expose a formula interface that a future roller can hook into
- **Character export (PDF)** — character sheet layout should be structured in a way that maps cleanly to a printable format
- **Homebrew rules templates** — soft enforcement groundwork is already laid; future work would add structured rule overrides per character or campaign
- **XP awarded by DM in-session** — currently XP is player-edited; a future version could let the DM award XP directly from the Session Console

---

## Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| How is XP awarded — does the player manually enter it, or can the DM push XP from the Session Console? | Product | No — player manual entry ships first; DM award is P2 |
| Can a character belong to more than one campaign simultaneously? | Product | ~~Yes~~ **Resolved: one campaign at a time.** Campaign tab shows a single active campaign; joining a new campaign requires leaving the current one. |
| Is there a "delete character" action, and what are the guards? (e.g. block deletion if character is in an active session) | Product | No — but must be resolved before character list screen is built |
| What happens to a Draft character that is never finalized — is there a cleanup or expiry mechanism? | Product | No |
| How are custom content class features surfaced in the Actions tab — does the user manually enter them, or does the custom content system populate them? | Engineering | No — needed before Actions tab implementation |
| What is the maximum number of notes per character/campaign, if any? | Engineering | No |

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

**Spells step** appears only when at least one spellcasting class is selected. It adapts per class: cantrip count, spells known vs. prepared distinction, and available spell list all reflect the chosen class and level. For multiclass characters with two spellcasting classes, combined spell slots are calculated automatically from the PHB multiclass table and shown with a per-class breakdown; individual slot counts can be overridden with a soft warning.

### Steps

| Step | Content |
|---|---|
| 1 | Choose a Class — hit die, proficiencies, primary abilities; starting level selection; optional "Add another class" for multiclassing with level allocation between classes |
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

The **encumbrance bar** is pinned to the top of the Inventory tab (current carry weight vs. STR × 15 capacity; color-coded green / yellow / red).

Two **sub-tabs**: **Equipped** and **Backpack**.

Items are categorised into four types across both sub-tabs: **Equipment** (weapons, armor, gear), **Consumables** (potions, scrolls, ammunition), **Effect** (items with ongoing effects), and **Other**. Each sub-tab shows items grouped by category with collapsible category headers.

**Equipped sub-tab** — items currently equipped. Each card shows name, category, weight, and relevant stats (damage dice/type for weapons, AC for armor). Tap to expand full details. Toggle to unequip (moves item to Backpack).

**Backpack sub-tab** — unequipped items. Same card format. Toggle to equip (moves item to Equipped). Custom items show a "Custom" badge and can be edited or deleted. Items received from other players during a session appear here automatically on confirmed transfer.

**Currency** — GP, SP, CP, EP, PP with inline increment/decrement controls, shown at the bottom of the Backpack sub-tab.

**Adding items** opens a bottom sheet with two options:
- *Search SRD database* — searchable list of all SRD items categorised by type; selecting one adds it to the Backpack with pre-filled stats
- *Create custom item* — manual entry with name, category, weight, and description fields; saved with a "Custom" badge

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
| Second class added via multiclassing | Level allocation UI appears in Step 1; spells step shows combined slot table if both classes cast spells |
| Multiclass spell slot count overridden | Soft warning shown; override is preserved and not blocked |
| Second class removed after multiclass choices made | Cascade warning lists what will clear (second class features, reallocated levels); confirm required |
