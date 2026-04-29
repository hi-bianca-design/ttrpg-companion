# D&D Companion App — Design Spec
**Date:** 2026-04-29
**Status:** Approved

---

## Overview

A mobile-first D&D companion app supporting character creation (based on the 2024 Player's Handbook) and live campaign sessions. Two roles: **Player** and **DM**. Built with Expo (web first, iOS/Android later) and Supabase for real-time sync, auth, and data.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Client | Expo (React Native + TypeScript) | Single codebase for web + iOS + Android |
| Backend | Supabase | Auth + PostgreSQL + real-time subscriptions |
| Real-time | Supabase Realtime | Subscriptions on `session_characters` table |

---

## Architecture

Four client modules, each owning its own screens and logic:

1. **Auth** — Sign up, login, profile management
2. **Character Builder** — Create, edit, and view character sheets
3. **Campaign Manager** — Create campaigns, invite players, view history
4. **Session Console** — Live session view for players and DM dashboard

All modules communicate with Supabase via the Supabase SDK (REST + real-time subscriptions). The 2024 PHB content lives as read-only reference tables seeded into Supabase.

---

## Data Model

### Users & Auth
```
users
  id · email · username · avatar_url · created_at
```
Managed by Supabase Auth. Row-level security enforces that users can only read/write their own data.

### Character Domain
```
characters
  id · user_id · name · level
  class_id · subclass_id · species_id · background_id · alignment
  str · dex · con · int · wis · cha
  hp_max · hp_current · temp_hp
  armor_class · speed · proficiency_bonus
  death_save_successes · death_save_failures
  conditions · notes · created_at

character_spells
  character_id · spell_id · is_prepared · slots_expended

character_equipment
  character_id · equipment_id · quantity · is_equipped
  is_custom · custom_name (nullable)
```

### Campaign & Session Domain
```
campaigns
  id · dm_id · name · description · created_at

campaign_members
  campaign_id · user_id · character_id · status (invited | active)

sessions
  id · campaign_id · status (lobby | active | ended) · started_at · ended_at

session_characters          ← real-time subscriptions fire here
  session_id · character_id
  hp_current · temp_hp · conditions
  spell_slots_used (JSONB)      ← e.g. {"1": 2, "2": 1} slots used per level
  death_save_successes (0–3)
  death_save_failures (0–3)
  initiative · is_active_turn
```

### SRD Reference Tables (read-only seed data)
```
classes · subclasses · species · backgrounds · feats · spells · equipment
```
Seeded with the **2024 SRD (Creative Commons)** — the updated ruleset released under CC BY 4.0, safe for public App Store distribution. Character creation reads from these to populate dropdowns and descriptions. Note: the 2024 SRD aligns with our design — backgrounds grant ability score bonuses, species grant traits only (no ability score bonuses).

### User Custom Content
```
user_content
  id · user_id · content_type (subclass | spell | species | background | feat | equipment)
  name · description · properties (JSONB) · created_at
```
Users can manually add non-SRD content (e.g. PHB subclasses they own). Custom entries appear alongside SRD options in character creation, clearly marked as custom. `properties` is a flexible JSONB field that stores type-specific data (e.g. spell level/school, subclass features, species traits).

---

## Module: Auth

- Email/password sign-up and login via Supabase Auth
- Username chosen on first login (stored in `users`)
- DM invites players to campaigns by email or username
- All players must have an account to join a session

---

## Module: Custom Content Manager

A dedicated section (accessible from the user's profile or character builder) where users manually enter non-SRD content from books they own.

- Supported content types: subclass, spell, species, background, feat, equipment
- Each type has a guided form with the relevant fields (e.g. a spell form asks for level, school, casting time, range, components, duration, description)
- Custom entries are **user-scoped** — private to the user who created them, not shared globally
- In character creation, custom content appears in the same dropdowns as SRD content with a "Custom" badge
- No validation against PHB accuracy — the user is responsible for entering correct values

**Future paid tier:** A "PHB Edition" in-app purchase that unlocks additional PHB content not covered by the 2024 SRD (e.g. setting-specific subclasses, expanded equipment). Since the 2024 SRD covers the core ruleset under Creative Commons, the free tier is already quite complete. The paid tier would target players who want full PHB coverage without manual entry.

---

## Module: Character Builder

### Creation Wizard UX Principle: Decision → Consequence → Commit

Every step follows the same three-part pattern:

1. **Decision** — A plain-language context header before showing any options. Explains what this choice *is* and what it affects downstream. No jargon. Example: *"Your class defines what you do in a fight and how you solve problems. A Fighter hits things reliably. A Wizard reshapes encounters. A Rogue hits one thing very hard and then hides."*
2. **Consequence** — A live preview panel that updates as the player hovers or taps options — before committing. HP changes, skills populate, spell list appears, ability scores recalculate. The player feels the choice as a real number, not an abstraction.
3. **Commit** — A single action button that names the choice explicitly: *"Choose Fighter →"* not just *"Next →"*.

**Layout:** Two-panel. Top/left: the options list (browsable, filterable by category). Bottom/right: the live "your character so far" preview, reflecting every hovered option in real time.

The preview persists across all steps — as the player progresses, it accumulates all prior choices so they can always see the full picture of what they've built.

### Creation Wizard (7 steps, PHB 2024 order)

| Step | Content |
|---|---|
| 1 | Choose a Class — hit die, proficiencies, primary abilities displayed |
| 2 | Determine Origin — Background and Species chosen together; both affect ability scores |
| 3 | Ability Scores — Standard Array / Point Buy / Roll; each score shows a source breakdown (Base / Background / Species / Class priority badge) |
| 4 | Alignment & Personality — alignment, personality traits, ideals, bonds, flaws |
| 5 | Spells *(skipped if class has no spellcasting)* — choose known/prepared spells from class spell list |
| 6 | Remaining Details — name, age, appearance, backstory, starting equipment |
| 7 | Review & Finalize — full sheet preview before saving |

**Ability score step detail:** Each ability score row shows:
- The base value assigned by the player
- A Background bonus chip (e.g. `Bg +2`)
- A Species bonus chip (e.g. `Sp +1`) where applicable
- A "Primary" badge on abilities the chosen class relies on
- A hint line suggesting where to place high scores for the chosen class

### Character Sheet (5 tabs)
- **Overview** — HP bar with quick damage/heal/temp HP controls; AC, Initiative, Speed; all 6 ability scores with modifiers; active conditions
- **Skills** — full skill list with proficiency/expertise indicators and passive perception
- **Actions** — attacks (weapon cards with hit/damage), class features, bonus actions, reactions
- **Inventory** — equipment list with equipped toggle and encumbrance; supports custom items
- **Notes** — free-text field, persisted per character

### Leveling Up
Between sessions, a player can level up their character from the character sheet. The level-up flow surfaces only the choices relevant to the new level:
- HP increase (roll or take average)
- New class features (displayed from SRD/custom content)
- Subclass selection (if the new level triggers it — varies by class)
- Ability Score Improvement or feat choice (at levels 4, 8, 12, 16, 19)
- New spell slots and spells known/prepared (if applicable)

Leveling mid-session is not supported — the Level Up button is disabled while a session is active.

---

## Module: Campaign Manager

- DM creates a campaign (name, description)
- DM invites players by email or username; player receives notification and accepts/declines
- Invited player selects which of their characters to bring into the campaign
- Campaign history: list of past sessions with dates
- DM can start a new session from the campaign page, which opens the Session Console

---

## Module: Session Console

### Shared (both roles)

- Session status bar: campaign name, session number, active/ended indicator
- Initiative order visible to all participants, updated in real-time
- All live state (HP, conditions, initiative) synced via Supabase Realtime subscriptions on `session_characters`

### Player View

- **HP bar** with one-tap buttons: Damage, Heal, Temp HP — updates sync to DM immediately
- **Conditions** displayed as badges (Poisoned, Blinded, etc.); player can add/remove their own
- **4 tabs**: Stats (ability scores, AC, speed, initiative), Actions, Spells, Inventory
- **Initiative panel** at the bottom of Stats tab — shows full order, highlights current turn and player's own row

### DM Dashboard

- **Initiative tracker** — full party order, DM advances turns with "Next Turn" button; DM can add NPCs/monsters to the order with a custom name and initiative roll
- **Party overview cards** — one card per player showing: character name, class/level, HP bar (color-coded: green ≥ 50%, yellow 25–49%, red < 25%), AC, active conditions; when a character hits 0 HP the card expands to show death saving throw checkboxes
- **Edit access** — DM can tap "Edit" on any player card to directly modify HP, temp HP, or conditions; changes sync to the player's view in real-time
- **Rest controls** — DM can call a Short Rest or Long Rest for the party; Short Rest prompts each player to spend Hit Dice and resets short-rest class abilities; Long Rest fully restores HP and spell slots for all characters and clears session conditions
- **End Session** button — closes the session, prompts DM to confirm which session conditions persist to character records, then writes spell slot usage back to character sheets

### Death Saving Throws
When a character's `hp_current` reaches 0 during a session:
- The player's view replaces the HP bar with a death save tracker (3 success / 3 failure checkboxes)
- The DM's party card for that character expands to show the same tracker
- Both player and DM can record successes and failures; state syncs in real-time via `session_characters`
- At 3 successes the character is stabilized (conditions updated automatically); at 3 failures the character is marked dead

### Real-time Sync Behavior

- Both player and DM can edit character state; last-write-wins via Supabase
- All subscribers to a `session_id` receive updates within ~100ms
- On reconnect, client re-fetches current `session_characters` state to reconcile any missed updates
- **Conditions duality:** `session_characters.conditions` tracks live in-session conditions (e.g. Poisoned mid-fight). `characters.conditions` tracks persistent conditions that carry between sessions (e.g. a long-term curse). When a session ends, the app prompts the DM to choose which session conditions should be persisted to the character record.
- **Spell slots:** Tracked in `session_characters.spell_slots_used` (JSONB) during a session so slot changes sync in real-time. On session end, this value is written back to `character_spells.slots_expended` to persist the state.

---

## Out of Scope (v1)

- NPC/monster stat blocks for the DM
- Dice roller (may be added in a later iteration)
- Campaign notes or DM-only notes
- Character leveling up mid-campaign (characters are leveled outside of sessions)
- Offline mode
- Push notifications for session invites (email only in v1)

---

## Open Questions

None — all major decisions resolved during design review.
