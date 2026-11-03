# Go to market

**Status:** Proposed. Nothing here has been validated with real users yet.

## Who it is for

- **Primary buyer: the DM** of a regular home or online group playing the 2024 edition of 5e. They organise sessions, prepare content, and have the most to gain from tools.
- **Primary user: the player** of that group. They want a character sheet that is quick to use at the table and don't want to pay for it.
- **Secondary: other systems.** The codebase already supports a second game system (Daggerheart). Packs are system-scoped (`packs.system_id`), so a different audience can be added later without a redesign.

## Positioning

- **What we are:** a fast, good-looking table companion where the DM and players are in the same live campaign. The "open session" layer (everyone sees that the table is playing, combat state and whose turn it is) is the thing a static sheet doesn't do.
- **What we aren't:** a licensed library of official books. Larger incumbents bundle official content that we can't legally offer (see [Content licensing](../legal/content-licensing.md)). Our wedge is the live table, the craft of the design, and original content with commissioned art.
- **The promise:** free to play, your characters are always yours.

*To validate:* talk to 5 to 10 DMs before building paid features. What do they pay for today? What do they hate? Would a table pay, or only the DM?

## The growth loop

```
DM creates a campaign  →  shares the invite code  →  players join free
   ↑                                                          │
   └── DM upgrades for session tools / buys a pack ←──────────┘
              (every player sees the app at the table)
```

This is why DMs-pay beats players-pay: **every conversion also adds free users who see the product weekly.** The join flow (invite code) already exists. The loop gets stronger as the live-session features ship, because a DM can't run a session without the table being in the app.

What to measure: invites sent per campaign, join rate, and how many players come from one DM. See [Metrics](metrics.md).

## Launch phases

| Phase | Goal | Audience | Success looks like |
|---|---|---|---|
| **0. Own table** | Fix what hurts at a real session | Bianca's group | They use it instead of paper |
| **1. Friends of friends** | Find the first confusion points | 5 to 10 other tables, invited personally | Tables complete a session without help |
| **2. Soft launch** | Test the free→paid step | Web, public but quiet (communities for DMs, a simple landing page) | First paying DMs, a measurable invite loop |
| **3. App stores** | Reach people who only look in a store | iOS / Android via the same Expo codebase | Store rating, store-driven installs |
| **4. Packs and seasons** | Recurring revenue | Existing users | Pack revenue covers its own production cost |

Don't pay for ads until the loop and the conversion rate are known.

## Channels (to test, cheapest first)

1. The product itself: invites, a shareable campaign link, an "invite your table" prompt after creating a campaign.
2. Communities where DMs already talk (subreddits, Discords, forums). Be useful, disclose that it's ours, follow each community's rules.
3. Content creators and actual-play groups who run campaigns: offer a free DM Pro in exchange for honest use.
4. Artist collaborations: a commissioned pack is also a marketing event for the artist's audience (see [Artist commissioning](../content/artist-commissioning.md)).
5. A simple landing page and changelog.

## What not to do

- Don't use any third-party game trademarks or logos in marketing. Say "compatible with fifth edition" only in the description, never in the title.
- Don't promise official content.
- Don't gate the join flow behind payment.

## Market notes from the 2026-11-03 research

- **Why now.** The 2024 rules revision pushed players to rebuild characters, and the leading official tool is rebuilding its platform through 2026 with no promise of mobile live sync or better homebrew. Its sister virtual tabletop is shutting its servers down at the end of October 2026, so some of its users are looking for a new home.
- **Who first.** In-person players aged roughly 18 to 34, and in-person DMs, who bring their whole table. Online-first players are the least attractive segment: big virtual tabletops already serve them.
- **The pitch, in the market's own words.** Free to use, no paywalled basics, works on a phone at the table, real-time HP and initiative, homebrew that does not need exact internal terms.
- **Search crowding.** "Companion", "5e", "character sheet" and "initiative" are crowded App Store terms. The name stands apart (Session Zero); put the keywords in the subtitle, for example "Characters, campaigns and live sessions".
- **Reddit evidence.** A deeper, sourced pain-point report: [Reddit pain points](../design/reddit-pain-points.md).
