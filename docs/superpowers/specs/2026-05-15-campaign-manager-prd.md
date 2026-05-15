# Campaign Manager — PRD
**Date:** 2026-05-15
**Status:** Approved
**Module:** Campaign Manager (Campaign Setup · Invites · Party Management · In-Session DM Controls · Session End · History)

---

## Overview

The Campaign Manager covers everything a DM needs to run a campaign: creating and configuring a campaign, inviting and managing players, controlling in-session flow (initiative, rests, XP), ending sessions cleanly, and reviewing campaign history. A core design principle: **players own their own stats** — the DM facilitates and monitors but does not override player HP or conditions.

---

## Non-Goals

- **DM editing player HP or conditions** — players are active participants; the DM's party view is read-only; this is by design, not a limitation
- **NPC / monster stat blocks** — the DM can add NPCs to the initiative tracker by name and roll, but full stat block management is out of scope for v1
- **Campaign notes separate from session notes** — notes live per-session in session history; there is no persistent DM wiki or campaign document
- **Multiple campaigns per character** — a character can only be in one campaign at a time (resolved in Character Builder PRD)
- **Campaign transfer** — DM ownership cannot be transferred to another player in v1

---

## User Stories

### DM setting up a campaign

- As a DM, I want to create a campaign with a name and description so that my players know what they're joining
- As a DM, I want to generate a shareable invite link so that I can drop it in our Discord and let players join without individually tracking down their emails
- As a DM, I want to optionally require character approval before players join so that I can ensure characters fit the campaign's rules
- As a DM, I want to control whether party members can see each other's HP so that I can match the transparency level of my table

### Player joining a campaign

- As a new player receiving an invite link, I want to see a preview of the campaign before signing up so that I understand what I'm joining before committing to creating an account
- As a player, I want to select which of my characters to bring into the campaign when accepting an invite so that I join with the right character
- As a player whose character is pending approval, I want to know the DM is reviewing my character so that I'm not left wondering if my invite is broken

### DM running a session

- As a DM, I want to manage the initiative order including custom NPCs so that I can run combat without switching to a separate tool
- As a DM, I want to call short and long rests for the party so that rest mechanics are handled in the app rather than verbally
- As a DM, I want to award XP during the session for milestone moments so that I don't have to remember everything at the end
- As a DM, I want to review and confirm all XP at session end so that I can make final adjustments before it's applied to character records

### DM closing a session

- As a DM, I want to review each player's active conditions and decide which ones persist to their permanent record so that temporary combat effects don't incorrectly carry over between sessions
- As a DM, I want a structured end-of-session flow so that nothing important (conditions, XP) is accidentally skipped

### Players during a session

- As a player, I want to see the full initiative order during a session so that I know when my turn is without asking the DM
- As a player, I want to be prompted to confirm a rest and spend Hit Dice myself so that I stay in control of my own character's recovery

---

## Requirements

### P0 — Must Have

- **Campaign creation** — DM sets name and description; two toggleable settings: character approval (on/off) and HP visibility (on/off)
  - *AC:* Campaign is created and immediately accessible to the DM; settings are editable after creation
- **Invite link** — DM generates a shareable link; link can be regenerated (invalidating the previous one); link is copyable to clipboard
  - *AC:* Copied link opens the campaign preview screen when tapped; regenerating the link makes the old link show an "invite no longer valid" message
- **Campaign preview screen** — public screen accessible without auth; shows campaign name, DM display name, party size, and description; CTAs for new and existing users
  - *AC:* Screen renders correctly without authentication; new users flow through sign-up then land on the invite screen; existing logged-in users land on the invite screen directly
- **Character selection on join** — player picks which character to bring when accepting an invite
  - *AC:* Player sees all their active characters as options; selecting one and accepting adds them to the party (or pending approval queue)
- **Character approval flow** — when approval is on, accepted invites appear as pending on the DM's campaign page; DM approves or rejects with notification sent to the player
  - *AC:* Pending requests appear at the top of the party list; approved players join the party; rejected players receive a notification and can resubmit with a different character
- **Party management** — DM can view any player's character sheet (read-only) and remove players; removal is soft (player loses access, history preserved)
  - *AC:* Removed player cannot access the campaign; their character appears correctly in past session history; a confirmation sheet is shown before removal
- **Initiative tracker** — DM adds players and custom NPCs/monsters (name + initiative roll), reorders, removes, and advances turns; full order visible to all players in their Campaign tab
  - *AC:* Initiative order renders correctly for all party members in real time via Supabase Realtime; DM advancing a turn updates all views simultaneously
- **Rest flow** — DM calls short or long rest; all players receive a prompt to confirm and make choices; DM sees "Waiting on players" until all confirm; healing animation plays on confirmation
  - *AC:* Rest prompt appears on all player screens; short rest surfaces Hit Dice spending; long rest restores HP and spell slots on confirmation; healing animation plays on each player's screen
- **In-session XP awards** — DM can award XP to individual players or the whole party at any point during a session
  - *AC:* XP is logged per award with a timestamp; awards are visible in the end-of-session XP summary
- **Session end flow** — three sequential steps: condition review (persist/clear per condition per player), XP confirmation (adjustable totals), session summary; session is added to history on close
  - *AC:* Condition choices are applied to character records correctly; XP is written to character records and triggers level-up prompt if threshold crossed; session appears in history immediately
- **Session history** — chronological list of past sessions; each entry expandable to show party snapshot (HP, level, conditions at session end), XP per player, and shared notes from that session
  - *AC:* History is read-only and accessible to DM and all active party members; past sessions from removed players are still visible

### P1 — Nice to Have

- **DM notes** — Notion-like notes list on the campaign page with private/shared toggle; same format as player notes (title, date, body); shared notes visible to all party members
- **In-session party overview cards** — read-only cards per player showing HP (if HP visibility is on), conditions, AC, and speed; updates in real time
- **Invite link expiry** — optional setting to make invite links expire after a set time (e.g. 7 days); useful for DMs who want to control campaign membership more tightly

### P2 — Future Considerations

- **DM campaign transfer** — ability to hand off DM ownership to another player; needs careful handling of permissions and settings
- **NPC / monster stat blocks** — structured stat block management for the DM; currently NPCs are name + initiative roll only
- **XP awarded by DM via Session Console** — currently XP is only awardable during a session; a future version could let the DM push XP directly from a campaign management view between sessions
- **Campaign archive** — ability to mark a campaign as completed/archived; hidden from the active campaign list but preserved in history

---

## Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Can a DM regenerate the invite link mid-session without disrupting active players? | Engineering | No |
| Is there a maximum party size per campaign? | Product | **Resolved: maximum 6 players per campaign.** |
| Can a player be in multiple campaigns (with different characters)? | Product | **Resolved in Character Builder PRD:** one campaign per character; a player can have multiple characters each in different campaigns |
| What happens to the campaign if the DM deletes their account? | Product | **Resolved in Auth PRD:** campaign persists with DM shown as "[Deleted User]"; no automatic DM transfer in v1 |
| Should the DM be able to lock the initiative order (prevent reordering mid-combat)? | Product | No |

---

## Campaign Creation & Settings

The DM creates a campaign with a name and description. Campaign settings configurable at creation and editable later:

- **Character approval** — toggle: on requires the DM to approve each player's character before they appear in the party; off lets players join immediately after accepting the invite
- **HP visibility** — toggle: on makes all party members' HP visible to each other in the Campaign tab; off shows HP only in the DM's read-only party overview

On creation the DM receives a **shareable invite link** they can regenerate at any time (invalidating the previous link).

---

## Invite & Join Flow

**DM side:** the campaign page shows an "Invite Players" button that generates and copies the invite link. The DM can regenerate the link at any time.

**Player side — new to the app:** tapping the link opens a **public campaign preview screen** showing campaign name, DM display name, party size, and description. Two CTAs: "Join" (goes to sign-up) and "Log in to join." After authenticating, the player is automatically redirected to the campaign invite screen.

**Player side — already logged in:** tapping the link takes them directly to the campaign invite screen with a character selector and Accept / Decline buttons.

**If character approval is on:** after accepting, the player's request appears in the DM's campaign page as "Pending approval" with the character name and a stat summary. The DM approves or rejects. On rejection the player is notified and can resubmit with a different character.

**If character approval is off:** the player joins the party immediately after accepting.

---

## Party Management

The campaign page shows all party members with character name, class, level, and status (active / pending approval). The DM can:

- **Remove a player** — soft removal; player loses access immediately; their character remains in session history but not in the active party. Requires confirmation.
- **Regenerate invite link** — invalidates the current link
- **View any player's character sheet** — read-only access to the full character sheet of any party member at any time

Pending approval requests appear at the top of the party list with Approve / Reject actions and a link to view the character sheet.

---

## In-Session DM Controls

**Initiative tracker** — DM adds players (pulled from the party) and custom NPCs/monsters (name + initiative roll), reorders, removes entries, and taps "Next Turn" to advance. The full order is visible to all players in real time in their Campaign tab.

**Party overview** — read-only cards per player showing HP (if HP visibility is on), conditions, AC, and speed. The DM monitors but does not edit player stats.

**XP awards** — a persistent "Award XP" button lets the DM grant XP to individual players or the whole party at any moment mid-session. At session end a final XP summary shows all in-session awards with the option to adjust before confirming.

**Rests** — the DM calls a Short Rest or Long Rest. Each player receives a prompt to confirm and make choices (e.g. spending Hit Dice on a short rest). The DM sees a "Waiting on players" state until all confirm. A healing animation plays on each player's screen on confirmation.

---

## Session End Flow

When the DM taps "End Session," a three-step flow runs in sequence:

1. **Condition review** — all active conditions across all party members listed; DM toggles each as persist or clear. Conditions default to clearing.
2. **XP confirmation** — final XP summary showing all in-session awards; DM can adjust individual amounts before confirming. On confirm, XP is written to character records and the level-up prompt triggers if a threshold is crossed.
3. **Session summary** — session number, duration, XP per player, persisted conditions. DM taps "Close Session" to finish. Session is added to campaign history.

---

## Session History

A chronological list of past sessions on the campaign page. Each entry shows session number, date, and duration. Tapping expands a full log:

- **Party snapshot** — each member's HP, level, and active conditions at session end
- **XP awarded** — total XP per player and their level at the time
- **Shared notes** — notes created during the session with visibility set to "Shared," in chronological order

Session history is read-only and accessible to the DM and all active party members.

---

## Edge Cases Summary

| Scenario | Behavior |
|---|---|
| Player taps expired/regenerated invite link | "This invite link is no longer valid" message with no campaign preview |
| Player has no characters when accepting invite | Prompted to create a character first; redirected back to the invite after creation |
| Player removed mid-session | Removed immediately from active party; their initiative slot is retained for the current session but flagged as inactive |
| DM ends session with players who haven't confirmed a rest | Rest confirmation times out after a set period; unconfirmed players get the default rest outcome |
| XP pushes a player past multiple level thresholds at session end | Level-up prompt fires after session closes; multi-level jump behaviour per Character Builder PRD |
| DM rejects a character and player has no other characters | Player is notified and prompted to create a new character before resubmitting |
| Campaign has no sessions yet | Session history shows an empty state with a "Start your first session" CTA |
| DM account deleted while campaign is active | Campaign persists; DM shown as "[Deleted User]"; no automatic DM transfer (per Auth PRD) |
