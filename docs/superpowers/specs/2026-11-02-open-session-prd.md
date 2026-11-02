# Open Session — PRD
**Date:** 2026-11-02
**Status:** Draft (for review)
**Module:** Session Console, phase 1 (Open Session · Combat state · Turn banner)

---

## Problem

The original Figma mockups show a live-session layer on the character sheet: a **Session: Active** badge, an **Enter combat / In combat** badge, and a **"Your turn"** banner with an End Turn button. None of it exists in the app. A campaign today is only a roster (`campaigns`, `campaign_members`); nothing tells a player that the table is playing right now, that combat has started, or that it is their turn. Players ask out loud ("is it me?") and the GM has no way to signal it in the app.

This PRD covers the smallest slice that makes those mockups real. It is phase 1 of the Session Console (`2026-05-15-session-console-prd.md`), which was written against the old data model. The foundation rebuild intentionally did **not** recreate `sessions` tables, so this work adds them.

## Goals

1. Any active campaign member can open a session, and every member sees it as active within ~2s.
2. Any member can enter combat (the GM or the starter can end it), and everyone sees the right badge.
3. The GM decides whose turn it is; that player (and only that player) sees the "Your turn" banner.
4. Session state is always unambiguous: one active session per campaign, and it never gets stuck open.

## Non-Goals

- **Initiative order, rolling, auto-advancing turns.** The GM picks the turn by hand in v1. Order is a follow-up (P1/P2).
- **Live HP, conditions, spell-slot, death-save sync, ally healing, item gifting.** All stay in the broader Session Console PRD. This phase syncs only session status, combat mode and current turn.
- **NPC / monster turns.** The GM can hand the turn to a player, or clear it; NPC turns are narrated at the table.
- **Session history, numbering, notes, XP awards, rests.** A session here is a status flag, not a record.
- **Push notifications.** Players see state when the app is open; no background alerts.
- **Multiple simultaneous sessions per campaign.**

## Roles

| Role | Can do |
|---|---|
| **GM** (`campaign_members.role = 'gm'`) | Everything a player can do, plus: end any session or combat; set or clear whose turn it is |
| **Player** (active member) | Open a session; enter combat; end a session or combat *they* started; see all state; end *their own* turn |
| **Invited / non-member** | Nothing; sees no session state |

"Anyone can open" is a deliberate change from the old PRD, where only the DM started a session. The reason: the GM is often the last to open the app, and players shouldn't be blocked from starting the evening.

## User Stories

### Any member
- As a **player**, I want to open a session when we sit down to play so that my whole table sees we're live without waiting on the GM.
- As a **player**, I want a clear "Session: Active" badge on my sheet so that I know the session is running and I'm connected to it.
- As a **player**, I want an "In combat" badge so that I know the table has switched to turn-based play.
- As a **player whose turn it is**, I want an unmissable "Your turn" banner so that I never hold up the table.
- As a **player**, I want to tap End Turn when I'm done so that the GM knows to move on.

### GM
- As a **player or GM**, I want to tap Enter combat so that every screen at the table switches to combat state at once.
- As a **GM**, I want to pick which player's turn it is so that the right person is prompted, and I can change it any time.
- As a **GM** (or whoever started combat), I want to end combat (clearing any active turn) so that players aren't left holding a stale banner.
- As a **GM**, I want to end the session so that it stops showing as active after we finish.

### Edge cases
- As a **player who joins mid-session**, I want to see the current state immediately on opening my sheet (active, in combat, and whose turn it is).
- As a **player who loses connection**, I want state to catch up when I reconnect so that I don't see a stale banner.

## Requirements

### P0 — Must Have

**1. Open / end session**
- Any active member can open a session from the campaign page (and from the sheet's Campaign tab).
- At most one `active` session per campaign. A second open attempt returns the existing session instead of failing (two people tapping at once is the normal case).
- The GM or the member who opened it can end it. Ending also ends combat and clears the turn.
- *AC:* Given no active session, when a player taps Open session, then all active members show "Session: Active" after reload or realtime update. Given two members open simultaneously, then exactly one session row exists. Given the session ends, then no badge or banner shows on any screen.

**2. Status badges (sheet header)**
- Shown at the top of **all four character-sheet tabs** (Character, Actions, Inventory, Campaign) whenever the character's campaign has an active session. Hidden otherwise. They are rendered once, in `SheetHeader` (the one header every sheet tab already shares), not per tab and not in the tab layout (which would double the safe-area spacing).
- Left: `Session: Active` (green dot). Right, any member, out of combat: `Enter combat` (shield icon, tappable). Right, in combat: `In combat` (red dot); tappable by the GM or whoever entered combat, opening an End combat confirm; static for everyone else.
- *AC:* Every member sees Enter combat when the session is active and combat is off. In combat, everyone sees In combat, and only the GM or the combat starter can end it. Badges meet the existing contrast tests and the single-theme/token rules (no hardcoded colors).

**3. Combat state**
- Any active member can enter combat. Only the GM or the member who entered it can end it. Ending combat clears the current turn.
- Entering combat with no turn set is valid; the GM then picks the first turn.
- *AC:* Invited members and non-members cannot change combat state, and a player cannot end combat someone else started; both enforced at the database, not just hidden in the UI. Two simultaneous Enter combat taps result in one combat state.

**4. Turn control and "Your turn" banner**
- GM sets the turn to any active member who has an attached character, from the campaign page (member row action "Set turn"), and can clear it. Only possible while in combat.
- The targeted player sees the banner above "Your character": title "Your turn", body "Take your action, bonus action, and movement", primary **End Turn** button. No other player sees it.
- **End Turn** clears the current turn (no one has the turn until the GM picks next). The GM sees "Waiting for GM to pick next turn" state on the campaign page.
- The GM can see who currently holds the turn (marker on the member row).
- *AC:* Setting a turn shows the banner for exactly one user. The holder tapping End Turn removes the banner for them and clears it for everyone. Setting a new turn moves the banner from the old holder to the new one. A player cannot set anyone's turn, including their own.

**5. Realtime sync + reconnect**
- Session status, combat mode and turn propagate to all members' open screens via Supabase Realtime (first use of Realtime in this app).
- On app foreground, network reconnect and sheet focus, the client refetches the session row to reconcile missed events.
- If realtime is disconnected, show state as last known with a quiet "Reconnecting…" marker rather than silently going stale.
- *AC:* Change on one device appears on another within ~2s. After toggling airplane mode during a turn change, the reconnected client shows the correct state.

**6. Data model and security**
- New `sessions` table: `id`, `campaign_id` (FK, cascade), `opened_by` (FK profiles), `status` (`active` | `ended`), `in_combat` (bool), `current_turn_user_id` (nullable FK to the campaign member), `started_at`, `ended_at`, `created_at`/`updated_at` per conventions; partial unique index on `(campaign_id) where status = 'active'`; indexes on every FK and RLS column; check constraints, not enums.
- State changes go through RPCs (`open_session`, `end_session`, `set_combat`, `set_turn`, `end_turn`) following the `create_campaign` / `join_campaign` pattern, with role checks inside. RLS: members select; no direct writes.
- The `supabase_realtime` publication exists on the hosted project but is **empty** (checked 2026-11-02), so the migration must add `public.sessions` to it (`alter publication supabase_realtime add table public.sessions`). Realtime `postgres_changes` evaluates the table's select RLS policy per subscriber, so the members-only select policy gates who receives events.
- *AC:* Per-RPC tests for each role (GM, opener, other player, invited, outsider) in the style of the existing campaign API tests.

### P1 — Nice to Have

- **Auto-expire stale sessions** (e.g. no activity for N hours) so a forgotten session doesn't read "Active" tomorrow. Needs a number; see Open Questions.
- **Turn order list.** GM sets an order once; "Next turn" advances it and End Turn by a player advances automatically.
- **Session badge on campaigns list and campaign page** (not only the sheet), including a "Join session" shortcut into your character sheet.
- **Turn-change haptic** on the new holder's device.
- **Player can pass the turn** to a specific member (table-rule dependent).

### P2 — Future

- Everything in the broader Session Console PRD (live HP, death saves, healing allies, gifting) layered onto this session row.
- NPC turns, initiative rolls, session recap, push notifications.

## States and Edge Cases

| Situation | Behavior |
|---|---|
| Two people open at once | One session; both end up viewing it |
| GM disconnects mid-combat | Session stays active; players keep seeing last state with Reconnecting marker; End Turn still works for the holder |
| Turn holder leaves the campaign or detaches their character | Turn clears automatically |
| GM ends combat while a turn is active | Turn clears; banner disappears |
| Player holding the turn is on a different tab or screen | Banner appears on every sheet tab; leaving the sheet shows it again on return (state is server-side) |
| Player not on a character sheet | Banner only exists on the sheet (v1); P1 adds a campaign-page indicator |
| Player's character is attached to a campaign with a stale ended session | No badges |
| A member with no attached character | Can open a session; can't be given a turn |

## Success Metrics

This is a small personal-scale app, so metrics are check-the-table rather than dashboards:
- **Leading:** a full evening runs end to end (open → combat → several turns → end) with no manual refreshes and no stuck banner.
- **Reliability:** 0 cases of a banner showing for the wrong player or after combat ends in testing across 2–3 devices.
- **Latency:** state changes visible on other devices in ≤2s (p95).
- **Lagging:** the table stops asking "whose turn is it?" out loud. Check informally after 2 sessions.

## Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Who can **end** combat? Draft: the GM or whoever entered it (mirrors ending a session). Alternative: any member. | Product | No |
| Does **End Turn** clear the turn (draft) or should it auto-advance once turn order exists? | Product | No — v1 is clear-only |
| Can the **GM have a character** and receive a turn banner too? | Product | No |
| **Stale session timeout:** how long before an inactive session auto-ends (8h? 12h? end at local midnight?) | Product | No |
| Should the badges also show to members who are **on the campaign page** and not on a sheet? | Design | No — P1 covers it |
| Banner and badge designs for the **Actions / Inventory / Campaign tabs** (mockups only show the Character tab) | Design | No |
| Does a long-running session need a **numbered/title** concept now, or can that wait for session history? | Product | No |

## Timeline & Phasing

No hard deadline. Suggested split, each independently shippable:

1. **Schema + RPCs + tests** (`sessions` migration, RLS, RPC role tests). No UI.
2. **Open/end session + Session: Active badge** (campaign page + sheet header).
3. **Combat toggle + In combat badge.**
4. **Turn control (GM) + "Your turn" banner + End Turn**, with Realtime and reconnect hardening.

Dependencies: the Night Vigil design system tokens for the badge/banner colors (green, red, gold), and a decision on the Realtime question above before step 4.

## Design Reference

Figma mockup (provided in chat 2026-11-02): left frame = session active, out of combat (`Session: Active` + `Enter combat`); right frame = in combat (`In combat`, "Your turn" gold banner with End Turn above "Your character"). The banner pushes the character card down rather than overlaying it. Use the existing `Card`, `Button` and badge primitives; verify against `scripts/check-tokens.mjs`.
