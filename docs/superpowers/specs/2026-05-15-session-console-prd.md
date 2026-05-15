# Session Console — PRD
**Date:** 2026-05-15
**Status:** Approved
**Module:** Session Console (Live Session · Player Controls · DM Dashboard · Real-Time Sync)

---

## Overview

The Session Console is the live session experience for both players and the DM. It is not a separate screen — the campaign page transforms into session mode when the DM starts a session. All live state (HP, conditions, spell slots, initiative, death saves) syncs in real time via Supabase Realtime. A core design principle carried from the Campaign Manager: **players own their own stats** — the DM facilitates and monitors, not overrides. The one exception is character revival after death, which is the DM's narrative decision.

---

## Non-Goals

- **DM editing player HP or conditions** — the DM's party overview is read-only; players manage their own stats (except healing from allies)
- **Dice roller** — attack and spell cards show formulas; no in-app rolling in v1
- **NPC / monster full stat blocks** — NPCs in the initiative tracker have a name, initiative roll, and optional HP only; no AC, conditions, or ability scores
- **Offline play** — the session requires an active connection; there is no local-first or offline session mode
- **Spectator mode** — no read-only view for non-party observers in v1

---

## User Stories

### Player in a session

- As a player, I want to update my HP during combat so that my current state is always accurate for the party
- As a player, I want to apply healing to a downed ally so that I can use my healing spells without the DM manually adjusting stats
- As a player at 0 HP, I want to record my death save results so that the DM and party can see my status in real time
- As a player, I want to track and expend spell slots during the session so that I always know what I have left without counting on paper
- As a player, I want to see the full initiative order so that I know when my turn is without asking the DM
- As a player who loses connection, I want the app to reconnect silently and restore my session state so that a brief dropout doesn't kick me out

### DM running a session

- As a DM, I want the campaign page to transform into a session view so that I don't need to navigate to a separate screen to manage the session
- As a DM, I want to manage the initiative order including custom NPCs so that I can run combat without switching tools
- As a DM, I want to optionally track NPC HP in the initiative tracker so that I can manage enemy health without external notes
- As a DM, I want to see a highlighted alert when a player hits 0 HP so that I never miss a character going down
- As a DM, I want to revive a dead character with a custom HP amount so that I can accurately reflect any revival spell or narrative decision
- As a DM, I want to decide whether a late-arriving player joins the current session so that I control the pacing of the session

---

## Requirements

### P0 — Must Have

- **Campaign page session mode** — "Start Session" on the campaign page transforms the layout into session mode; session status bar appears for all participants; no separate screen or navigation required
  - *AC:* All participants see the session status bar immediately on session start; campaign page layout reorganises correctly for DM and player views
- **Real-time sync** — HP, temp HP, conditions, spell slots used, death saves, and initiative order all sync via Supabase Realtime on `session_characters`; updates reach all subscribers within ~100ms
  - *AC:* A HP change on one player's screen is reflected on the DM's party overview card within 100ms; initiative order advances for all participants simultaneously
- **Player HP self-edit** — players can damage and heal their own HP using the combat controls in the Character tab
  - *AC:* HP changes apply immediately and sync to all session participants
- **Player healing allies** — a "Heal" action on a party member's card in the Campaign tab lets a player enter an amount and apply it to the ally's HP
  - *AC:* Healing applies to the ally's HP and syncs immediately; players cannot decrease another player's HP
- **Spell slot tracking** — tap-to-expend per slot level in the Actions tab; live sync via Supabase Realtime; slots restore on rest
  - *AC:* Expending a slot updates the slot count immediately and syncs to all participants; long rest restores all slots; short rest restores slots per class rules
- **Death save tracker** — replaces HP bar when HP hits 0 in-session; player records own successes and failures; 3 successes = stabilised (tracker clears, HP stays at 0); 3 failures = dead (controls lock)
  - *AC:* Death save tracker appears immediately at 0 HP; successes and failures sync in real time to DM's party overview; stabilisation and death states apply correctly
- **DM party overview cards** — read-only cards per player showing live HP (if HP visibility is on), conditions, AC, and speed; expands with red highlight and read-only death save tracker when player hits 0 HP
  - *AC:* Cards update in real time; 0 HP triggers visual expansion and red highlight; death save state shown correctly
- **DM character revival** — when a character has died (3 failures), a Revive button appears on their party overview card; DM enters an HP amount and confirms; character is restored and death tracker clears
  - *AC:* Revive button only appears at 3 failures; restored HP applies to character record and syncs to all participants; death tracker clears on confirmation
- **Initiative tracker** — DM adds players and custom NPCs (name + initiative roll, optional HP); reorder, remove, and advance turns; syncs to all players in Campaign tab in real time
  - *AC:* Initiative order renders correctly for all participants; advancing a turn updates all views simultaneously; NPC HP tap-to-adjust works when HP is set
- **Player disconnection handling** — session screen stays visible; controls disabled with "No connection" banner; silent reconnect restores current session state
  - *AC:* Disconnected player sees the banner and cannot interact; on reconnect controls re-enable and state is current
- **DM disconnection handling** — session stays active; players can update their own stats and apply healing to allies; session-level actions unavailable until DM reconnects
  - *AC:* Players retain full self-edit and ally healing access during DM disconnection; initiative advancement and rest controls are unavailable

- **Item gifting** — player selects "Give Item" from an ally's action menu; bottom sheet shows their Backpack (equipped items excluded); receiver gets a confirmation modal; transfer applies on confirm; held pending if receiver is disconnected
  - *AC:* Equipped items do not appear in the Give Item sheet; items transfer correctly between inventories on confirmation; pending transfers are held and shown on receiver reconnect; session end cancels pending transfers

### P1 — Nice to Have

- **Mid-session late arrival flow** — DM prompt when a player joins during an active session; DM can admit now or defer to next session
- **NPC HP tracking** — optional max HP field when adding NPCs; tap-to-adjust HP control on NPC initiative cards
- **Ally healing via Campaign tab** — party member cards in the Campaign tab show a "Heal" button during sessions for quick access

### P2 — Future Considerations

- **Dice roller** — attack and spell cards expose a formula interface; a future roller can hook into these without redesigning the cards
- **Spectator mode** — read-only session view for observers (e.g. a DM's co-DM or a player waiting to join)
- **NPC full stat blocks** — extend NPC initiative cards with AC, conditions, and ability scores for more complete combat tracking
- **Session chat** — in-session text channel for out-of-character coordination without switching to Discord

---

## Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| When a player heals an ally and the ally is at 0 HP (dying), does the death save tracker clear automatically when HP goes above 0? | Engineering | Yes — needed before death save implementation |
| Can the DM add the same NPC multiple times (e.g. 3 goblins)? If so, are they distinguished by name suffix (Goblin 1, Goblin 2)? | Product | No |
| Is there a timeout for the rest confirmation prompt — what happens if a player doesn't respond? | Engineering | No — covered as an edge case; needs a default resolution |
| What happens if the DM closes the app entirely mid-session (not just a connection drop)? | Engineering | No |

---

## Structure & Entry

The Session Console is not a separate screen — the **campaign page transforms into session mode** when the DM taps "Start Session." The layout reorganises to surface session controls for the DM and shifts all player character sheets into in-session mode.

A **session status bar** appears at the top of the campaign page for all participants: campaign name, session number, and an active indicator.

- **DM view:** initiative tracker, read-only party overview cards, session controls (rest, XP, end session)
- **Player view:** character sheet in in-session mode; Campaign tab updated with live initiative order and live party member cards

---

## Real-Time Sync

All live session state syncs via **Supabase Realtime** on the `session_characters` table: HP, temp HP, conditions, spell slots used, death save successes and failures, and initiative order.

All subscribers receive updates within ~100ms. On reconnect, the client re-fetches current `session_characters` state to reconcile any missed updates.

**Player disconnection:** session screen stays visible; all controls are disabled with a "No connection" banner. The app reconnects silently when available, re-fetches current state, and re-enables controls.

**DM disconnection:** the session remains fully active. Players can update their own stats and apply healing to allies. Session-level actions (advancing initiative, calling rests, awarding XP) are unavailable until the DM reconnects.

---

## Player Controls

**HP controls:**
- Players can damage and heal their own HP freely via the Combat sub-tab
- Players can increase another party member's HP via a "Heal" action on the ally's card in the Campaign tab — enter an amount and confirm
- Players cannot decrease another party member's HP

**Death saves:**
- When HP hits 0, the death save tracker replaces the HP bar
- The player records their own successes and failures
- 3 successes: character is stabilised; death tracker clears; HP stays at 0
- 3 failures: character is dead; player controls lock

**Item gifting:**
- During a session, tapping an ally's party member card in the Campaign tab opens an action menu with "Heal" and "Give Item"
- Tapping "Give Item" opens a bottom sheet showing the player's own Backpack; equipped items are not giftable — the player must unequip first
- The player selects one or more items and taps "Give"
- The receiving player sees a confirmation modal: *"You have received [item name]"* or *"You have received X items"* with a recap of each item; they must tap "Confirm" to accept
- On confirmation, items move from the giver's Backpack to the receiver's Backpack and sync via Supabase Realtime
- If the receiving player is disconnected, the transfer is held pending until they reconnect and confirm

**Spell slots:**
- Tracked live via Supabase Realtime; tap-to-expend per slot level in the Actions tab
- Restore on rest per class rules

---

## DM Dashboard

The DM's campaign page in session mode, reorganised into three sections:

**Initiative tracker:**
- Add players (from active party) and custom NPCs/monsters (required: name + initiative roll; optional: max HP)
- If max HP is set on an NPC, a tap-to-adjust HP control appears on their initiative card
- Reorder, remove entries, and tap "Next Turn" to advance the active turn
- Full order syncs to all players in real time in their Campaign tab

**Party overview cards (read-only):**
- One card per player: live HP (if HP visibility is on), conditions, AC, speed
- When a player hits 0 HP: card expands with a red highlight and shows the death save tracker read-only
- When a character has died (3 failures): a **Revive** button appears; DM enters the HP amount the character returns with; on confirm the character is restored and the death tracker clears

**Session controls:**
- Short Rest / Long Rest — triggers prompted rest flow for all players with healing animation on confirm
- Award XP — grant XP to individual players or the whole party
- End Session — opens the three-step session end flow (condition review → XP confirmation → session summary)

---

## Mid-Session Events

**Late arrivals:** when a player joins the campaign while a session is active, a prompt appears on the DM's screen: *"[Player] wants to join the current session — admit them now or wait until the next session?"* If admitted, the player enters the session and the DM manually adds them to the initiative order. If deferred, the invite is accepted but the player doesn't appear in the active party until the next session.

**Ally healing:** a player taps an ally's card in the Campaign tab, taps "Heal," enters an amount, and confirms. The ally's HP updates immediately and syncs to all participants.

---

## Edge Cases Summary

| Scenario | Behavior |
|---|---|
| Player heals ally at 0 HP above 0 | Death save tracker clears; HP restored to healed amount; character re-enters play |
| Player disconnects mid-combat | Session screen stays; controls disabled with "No connection" banner; silent reconnect restores state |
| DM disconnects mid-session | Session stays active; players retain self-edit and ally healing; session controls unavailable until DM returns |
| Character stabilised at 0 HP takes damage again | Death save tracker reappears; new death save sequence begins |
| DM revives character with 0 HP entered | Validation error; minimum revival HP is 1 |
| Late-arriving player admitted mid-session | DM manually adds them to initiative order; their character sheet enters in-session mode immediately |
| NPC with HP tracking reduced to 0 | No automatic death state for NPCs; DM removes them from the initiative tracker manually |
| Rest confirmation not responded to by a player | After a timeout, the default rest outcome is applied (full HP restored on long rest; no Hit Dice spent on short rest) |
| Session ended while a player is disconnected | Session ends normally; disconnected player sees session-ended state on reconnect |
| Player attempts to give an equipped item | "Give Item" sheet only shows Backpack items; equipped items are not listed; player must unequip first |
| Receiving player is disconnected when gift is sent | Transfer held as pending; confirmation modal appears when receiver reconnects |
| Session ends while a gift transfer is pending | Pending transfer is cancelled; items remain in the giver's inventory |
| Player gives all copies of a stacked item (e.g. 10 arrows) | Quantity selector appears; player chooses how many to give; remaining quantity stays in their Backpack |
