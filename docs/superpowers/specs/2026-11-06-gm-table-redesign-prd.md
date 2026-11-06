# GM Table Redesign: Umbrella PRD

**Date:** 2026-11-06
**Status:** Draft (for review)
**Evidence:** notes from a meetup with a software engineer who plays tabletop games, mostly as a GM (Daggerheart, some Pathfinder), plus the product owner's decisions in a brainstorming session the same day. One person's feedback, not a sample: it shows what one experienced GM struggles with, not how many do.
**Amends (without editing them):** `2026-11-03-party-and-combat-design.md` (the GM-on-a-phone assumption, the "no stat blocks" and "no in-combat lookup" non-goals, Phase 3 and Phase 4) and `2026-11-03-combat-tools-amendments.md`. Each amendment is listed under "What this changes in earlier specs".
**What this document is:** the umbrella. It fixes the intent, the principles, the business shape and the list of flows. Each flow then gets its own short UX spec, reviewed one at a time. Tickets are written from a flow only after its UX spec is approved. No flow spec exists yet.

---

## Why

A GM at a live table is hunting for something while the players wait. The feedback describes the same pain at every step: a GM with "50 tabs open", searching the book for the page after players choose an option, notes kept on a loose sheet, and initiative trackers skipped because "setting up and entering is slower than writing on paper".

The party page and battle order already built give the GM a live scoreboard. They do not help with the two things the feedback calls the hardest: getting enemies and NPCs into the app in the first place, and seeing an enemy's numbers at the moment a player attacks it.

The product owner's view of the strategy: the GM experience is where most of the rework is, the GM is the paying user, and a table-ready GM tool is what makes a group adopt the app and a GM convert. Players are free, so the player experience has to be good enough to recommend, not feature-rich.

## Who it is for

- **The GM (the buyer).** Mostly a **laptop or tablet, in landscape, with paper alongside**. Mostly runs **prepared** sessions; occasionally improvises when players go off-script. Often runs a sandbox campaign where players can go anywhere. Prefers writing their own campaign. Plays more than one system.
- **Players (free, the distribution channel).** On a phone at the table. They track resources, spell slots and actions, and sometimes keep a paper sheet.
- **Tables that use physical dice** and call numbers out loud. This stays true; the app supports that feel and does not replace it.

## What exists today

- **Stack:** Expo with Expo Router, React Native, Supabase, NativeWind. One codebase targets web first, then iOS and Android. The launch target (web, native, or both) is still an open decision in `docs/strategy/decision-log.md`.
- **Built:** the party page with live stats (Phase 1) and the battle order with enemies, bulk damage, hidden enemies, roll call and server-enforced privacy (Phase 2). These were designed for a GM on a phone.
- **Not built:** encounter prep (Phase 3), a monster library or stat blocks (Phase 4), scanning, a branching session map, billing, and scan metering. Access to pack content is enforced in the database; no payment provider is connected yet (decisions D4 to D6 built, D10 and D11 proposed).
- **Consequence for Flow A:** it replaces the GM's combat view inside the existing codebase as a responsive layout. It does not add a new platform. An enemy stays a plain record, so no data is lost; Flow B extends that record.

## Principles

New in this document:

1. **Never make the table wait.** Every GM feature is judged by how fast the GM reaches what they need. A feature that is correct but slower than paper has failed.
2. **Enemy numbers are always visible to the GM.** Players can act against any enemy at any time, so an enemy's armor class, hit points and defenses must be on screen without a tap, and not only on that enemy's turn.
3. **Type once, at prep. Never at the table.** The table only launches things that were saved. Improvised additions are the exception and may be simpler.
4. **Paper is a partner, not a rival.** The app has to beat paper at lookup and bookkeeping and may sit alongside it. Edits must be as quick as erasing and re-marking.
5. **Content scanned or typed by a user belongs to that user.** It is never shared, shown to other users or cached for them.

Kept from the combat spec: a scoreboard with a calculator, not a referee; dice stay physical; players own their own numbers and everyone sees them; players never see enemy hit points or hidden enemies, enforced on the server.

## Goals

1. A GM runs a whole fight from enemy cards on one screen without searching for a number.
2. Getting a fight ready takes less effort than writing it on paper: enemies are picked, scanned or imported, not typed one field at a time.
3. A GM can find an NPC, monster, location or note for the current scene in one step.
4. A session plan is a map of branching options, and every scene links to its fights, NPCs and notes.
5. A player gets a character sheet they like using, for free, including by scanning a paper sheet.
6. The GM tooling carries a real subscription: paying GMs bring free players, and scanning does not lose money.

## Non-goals

- A dice roller, attack automation, saving throws, resistances or a rules engine (unchanged).
- A battle map, grid or tokens.
- A virtual tabletop. The feedback's complaint about those is that dice rolling "has to be manually edited" and setup is slow; the aim is to be quicker, not to match them.
- Sharing stat blocks or scanned content between users (see principle 5 and the open question on legal review).
- Selling any content from outside the SRD, or anything priced against rulebook content (decisions D3 and D14, unchanged).

## Anti-goals (a failure even if it technically works)

- Setting up one fight takes longer than writing it on paper.
- A GM has to type each enemy's fields by hand.
- A scanned stat block that is wrong ends up on a card with no chance to check it.
- A scan from one user appears for another.
- Scan costs rise faster than subscription income.
- A real-time failure mid-session leaves the GM without their enemies' numbers.

## The business shape

- **GMs pay, players are free** (decision D2, unchanged). A paying GM brings free players.
- **Scanning** (monster stat blocks, NPCs and player character sheets) uses a paid image-reading service, so it costs money per scan.
  - **Decided:** every player gets **2 free scans**. GMs get a **small number of free scans, then pay for more.** The product owner wants a net profit.
  - **First release (decided):** no payments. A simple counter tracks free scans per user (2 per player, the GM's free number below); when it runs out the app says so. Selling more scans comes later with real billing, so the counter must be built so billing can replace it.
  - **Not decided:** the number of free GM scans, the paid allowance, the price, and whether there is a top-up or a cap.
  - **Cost estimate (unchecked):** reading one photo with a vision-capable model is expected to cost on the order of a cent or two. This is a guess from memory and must be checked against current pricing before any price is set.
  - A cheaper design is possible (read the text on the device for free, then use a small text-only model only to organize it), at a cost in accuracy on multi-column layouts. This is a builder-level choice that the cost check informs.
- Existing decisions that still apply: free caps are set before the first public launch (D15); homebrew is private to its author at launch (D16).

## The flows

Each flow gets a UX spec of its own (wireframes, the step-by-step flow, edge cases, open questions), reviewed one at a time. Build order is the order below.

### Flow A: GM runs a fight (first: this is the adoption hook)

The layout is **enemy cards side by side**. Decided from three options (tabs with one big stat block; side-by-side cards; initiative as the spine). The initiative-led layout was rejected because it hides enemy stats unless that enemy is selected.

- Three or four enemies visible at once as fixed-size cards, so the screen does not jump mid-fight.
- A card shows: name, armor class large, a hit-point bar with quick damage and heal, condition chips, the key attacks ready to read out, and an expander for the full stat block. This content list is a **guess to review** in the Flow A spec.
- Identical enemies share one card with separate hit points for each ("Wolf ×3").
- A light initiative strip, since the feedback says trackers are slower than paper.
- A search bar that is always visible, for rules, spells and NPCs.
- One-tap launch of a prepared encounter into this screen; quick-add of an improvised enemy.
- **Survives a dropped connection (decided).** The cards keep showing the last known numbers and accept damage, healing and condition edits while offline; changes sync when the connection returns, with a quiet marker while offline. Rules for edits that conflict after reconnecting (for example a player changed their own HP meanwhile) belong in the Flow A spec. Server-enforced privacy still holds: enemy data is never sent to players.

Tickets expected: enemy cards screen; launch a prepared encounter; quick-add an enemy; initiative strip; always-visible search.

### Flow B: GM prep and import

- A **flexible stat block** that works across systems: a few universal fields (name, how hard it is to hit, health, attacks) plus free-form sections for everything else. This is the base for every other flow.
- **Scan or bulk import** of monsters, NPCs and character sheets: photographs or PDFs, many at once, reviewed on one confirm-and-fix screen.
- A **campaign library**: NPCs, monsters, encounters, locations and lore in one place, grouped by area, so the "50 tabs" problem goes away.
- **Scan allowances and billing** (see the business shape).
- Encounters are saved, named lists of enemies that launch into Flow A.

Tickets expected: flexible stat block; scan and bulk import; scan allowances; campaign library; encounter prep.

### Flow C: Session plan as a branching map

- A session is a set of **scenes** with several possible exits that can merge back together.
- Each scene links to encounters (opening Flow A), NPCs, locations and lore notes.
- The GM marks where the table is now. Players going off-script get an "unplanned" quick-add scene.
- Written or uploaded plan: a GM can build the map by hand or import a timeline.

A rough wireframe was reviewed and accepted "for now" in the brainstorming session; the details are still open for the Flow C spec.

Tickets expected: scene map; scene links; off-script quick-add; plan import.

### Flow D: Player sheet (free; has to feel great)

- Resource and spell-slot tracking that holds up at high levels and supports a quick erase-and-re-mark. The feedback calls spell slots "difficult to keep track of the more you level up".
- An actions screen with general actions, and a plain-language note on action versus bonus action, since some players do not understand the difference.
- Character creation rework: the feedback suggests dropping alignment and revisiting the D&D Beyond mobile creation flow. This is one person's suggestion, not a decision.
- The player's own scan of a paper sheet (2 free).

Tickets expected: resource and spell-slot tracking; actions screen; creation rework; player scan.

### Flow E: Platform

- **Real-time you can trust.** The GM was wary that live sync would actually work. The enemy-card side is decided under Flow A (works offline, syncs on return). Flow E covers the rest: party and session data, the offline marker across screens, and how conflicts are shown.
- **Layouts:** web first for the GM on laptop and tablet browsers; phone first for players. The GM-on-a-phone case is listed as an open question below.

Tickets expected: sync behavior beyond enemy cards; GM tablet and laptop layout.

## What this changes in earlier specs

| Earlier spec says | This PRD says |
|---|---|
| The GM runs combat "on a phone at the table" | The GM is mostly on a laptop or tablet in landscape; players are on phones. A phone for the GM stays supported only as a fallback (a call of mine; see open questions). |
| Phase 2's battle order is the combat page | Flow A makes enemy cards the GM's combat view. The shared battle order for players is unchanged. The roll-call screen, hidden enemies and server-enforced privacy stay. |
| Non-goal: stat blocks and a monster library (deferred to Phase 4) | Stat blocks come in with Flow B, with scan and import as the main way in. |
| Considered and not planned: an in-combat rules lookup | Always-visible search is a goal in Flow A. |
| "An enemy is a plain record that a library entry can pre-fill; do not couple the record to library data" | Kept. The flexible stat block must not weaken it: an enemy on a card is still a plain record, and scan or library data only pre-fills it. |
| Phase 3 (encounter prep) | Folded into Flow B, with launch into Flow A. |
| Phase 4 (monster library) | Folded into Flow B. |

## Decisions recorded in the brainstorming session

| Decision | Source |
|---|---|
| GMs pay, players are free | Product owner (already D2) |
| At-the-table experience first | Product owner |
| GM device: laptop or tablet alongside paper | Product owner |
| Enemy cards side by side; enemy stats always visible | Product owner |
| Fights are mostly prepared; improvised is the fallback | Product owner |
| Stat sources are a mix (rulebook, homebrew, other), and they vary by system | Product owner |
| Scanning covers monsters and player sheets; scanned content is private | Product owner |
| Players get 2 free scans; GMs get a few free, then pay | Product owner |
| Session plan is a branching map | Product owner |
| Build order: Flows A, B, C, D, E; PRD and per-flow UX specs before tickets | Product owner |
| Enemy cards keep working when the connection drops: they show the last known numbers, accept edits, and sync when the connection returns. This applies to Flow A from the start, not only Flow E. | Product owner |
| The GM tool is web first (laptop and tablet browsers); scan input on web is file or photo upload | Product owner |
| First release has no payments: a simple free-scan counter only. Real billing comes later, once prices are set. | Product owner |

## Parked (not in this PRD's flows)

- Campaign notes and handwriting recognition.
- An AI assistant that answers rules questions for a system, so nobody searches the handbook.
- Which GM features are paid and which are free beyond scanning.
- Pricing numbers.

## Open questions

| Question | Owner | Blocking? |
|---|---|---|
| What does a scan cost with current pricing, and what price and allowance cover it with margin? | Product, with a cost check | Yes for Flow B billing |
| How many free scans does a GM get? | Product | Yes for Flow B billing |
| Which systems does the flexible stat block need at launch? (D&D 2024 is built; Daggerheart is a stub; the feedback mentions Pathfinder.) | Product | Yes for Flow B |
| Is scanning a book's stat block for personal use at the owner's own table acceptable under the publisher's terms, and under App Store review? The content stays private and is never shared, but this needs a legal read. | Product, legal | Yes before scan ships |
| Does a GM on a phone remain supported, and how far? | Product | No |
| ~~What does the GM see when live sync drops?~~ Closed for enemy cards: last known numbers, offline edits, sync on return. How conflicts are shown is settled in the Flow A spec. | Product | Closed |
| ~~Web, native or both for the GM tool?~~ Closed: web first. The app-wide launch target in the decision log is still open for players. | Product | Closed |
| How accurate must a scan be, and how is a wrong one caught before it reaches a card? | Product, engineering | Yes for Flow B |
| What is on an enemy card, and what is cut for small screens? | Product | Settled in the Flow A spec |

## Calls I made while writing this (mine, not the owner's; check them)

- **GM on a phone** stays supported as a fallback, not a design target.
- **Flow order** puts Flow B before Flow C because the map's scenes link to library items, and the library depends on the flexible stat block.
- **"Mostly prepared" means** the plan optimizes for prepared fights and treats improvised ones as an escape hatch, not an equal path.
- **The feedback is one person's.** Items like dropping alignment are suggestions to examine, not decisions.
- **The scan cost figure** is a memory-based estimate and is marked unchecked everywhere it appears.
- **A minimal enemy shape ships with Flow A**, so Flow B does not force a rework: name, one main defense value with a label, health, a list of attacks, conditions, notes and a hidden flag. Flow B adds free-form sections on top. This is the existing plain enemy record with a defense label and free-form sections added.
- **Other systems get the same card**, with the defense and health labels set by the system (for example a difficulty value instead of armor class) and free-form sections for the rest. Systems without a plain health bar fall back to a number field. Which systems launch is still an open question.
- **Scanning is a separable, last piece of Flow B.** Typing, the SRD library and manual import ship first, so a legal or accuracy problem with scanning cannot block the rest.
- **The scan review screen** shows every field for confirmation with uncertain fields highlighted. The accuracy bar and the choice between on-device text reading and a vision model are settled by a short spike at the start of Flow B.
- **The initiative strip** reads from the same battle order data as the players' view; it is not a second tracker.
- **Search scope for Flow A** is the campaign's own library and the SRD rules and spells. Searching other books is out of scope.

## How this document is used

1. Review this PRD.
2. Walk the flows one at a time in the order above. For each: write the UX spec with wireframes, review it, approve it.
3. From an approved UX spec, write its tickets, then plan and build.
