# Reddit pain points: tabletop RPG companion apps

Research date: 2026-11-03. Scope: character builders and sheets, campaign managers, DM tools, initiative and combat trackers, virtual tabletops. Mostly 5e, with Pathfinder 2e where the complaint is about app design.

Thread IDs below are Reddit base-36 IDs. A thread URL is `https://www.reddit.com/r/<sub>/comments/<id>/`. Scores and comment counts are as returned by the archive at read time and drift over time. Dates are UTC.

---

## 1. Method and coverage

### Routes tried

| Route | Result |
|---|---|
| `old.reddit.com/.../search.json`, `www.reddit.com/.../top.json`, `.rss` (via curl) | **Blocked, HTTP 403.** |
| WebFetch on `old.reddit.com` | **Refused** by the tool ("unable to fetch"). |
| A second batch of Reddit and mirror fetches with a browser-style user agent | **Refused by the permission system** as bot-check circumvention. I stopped there and did not try to work around it. Redlib, Libreddit and Jina-style proxies were therefore **not tested**. |
| Pullpush API (`api.pullpush.io`) | **Down** (HTTP 522). |
| WebSearch with `site:reddit.com` or a reddit.com domain filter | **Blocked.** The domain is rejected by the search tool (HTTP 400). Unfiltered searches return a few Redlib and snapshot mirrors, forum posts and news, and almost no live Reddit threads. |
| **Arctic Shift API** (`arctic-shift.photon-reddit.com/api/...`) via WebFetch | **Worked, with caveats.** `posts/search`, `comments/search` and `comments/tree?link_id=` returned real Reddit data, including post metadata, scores, comment counts and full comment trees. |

### Arctic Shift caveats

- Keyword search was **flaky**. Many `title=` and `body=` queries returned HTTP 422. Terms that worked: "app", "initiative", "homebrew", "subscription" (comments), (no Pathfinder 2e keyword query worked). Terms that failed on nearly every subreddit: "beyond", "paywall", "sigil", "mobile", "sync", "character", "slow", "2024", "tracker". Occasional HTTP 429 and 400 as well.
- Per-subreddit keyword search only worked reliably for **r/DMAcademy** and **r/dndbeyond**. For r/dndnext, r/DnD, r/onednd and r/rpg I could only list recent posts in date windows.
- A small summarising model read the archive JSON and returned paraphrases and scores. I did not read the raw JSON myself. Per-comment scores and attributions are therefore second-hand, and some comment trees were truncated at 100k characters (noted per thread).
- Coverage skews to **2026**, especially Aug to Nov 2026, plus a few older Pathfinder 2e and r/DnD threads found through mirror search results.
- Sampling is not representative. It over-represents r/DMAcademy, r/dndbeyond and self-promotion threads from developers asking for feedback.

### What was actually read

- **34 distinct threads with comment trees read**, 33 with content. One tree was empty. These are the threads cited in section 2.
- **About 15 more threads** appeared only as comment snippets from a comment search (for example the VTT-choice threads 1xlczwi, 1x6srqw, 1x71g64, 1xdlzj9). I read the snippets, not the threads, so I do not count them in the 34.
- **About 130 more post listings** (title, score, comment count and a short body summary) were read from the search and window listings. They are used for context only.
- Subreddits touched: r/DMAcademy, r/dndbeyond, r/DnD, r/onednd, r/rpg, r/Pathfinder2e.
- **Not covered:** r/DungeonsAndDragons and r/dndnext keyword search. A listing from r/dndnext confirmed the sub is reachable, but no relevant threads were extracted. The Sigil-shutdown reaction on Reddit was not reachable (see section 6).

---

## 2. Pain points by theme

Frequency scale used below: **High** means 8 or more of the 34 threads touch it. **Medium** means 4 to 7. **Low** means 1 to 3.

### Theme A. Most in-person tables run on paper, cards and whiteboards, and apps have to beat that bar

- **Frequency:** High. **Affects:** DMs mainly, in-person play.
- A DM asked how in-person DMs show initiative without a screen. The top replies are folded name cards (score 140 for the top reply), cards with stats on the back, clothespins, whiteboards and verbal "who's next" call-outs. Apps appear as a minority. Thread 1xgpxdg, r/DMAcademy, 2026-10-27, score 62, 198 comments (only about the first 100k characters read).
- In "Combat and initiative trackers", most replies are paper, numbered grids, whiteboards or clothespins. Skeptics say numbers and initials on paper are enough. Thread 1vpsyhg, r/DMAcademy, 2026-08-16, score 0, 23 comments.
- In a thread about a live-synced HP companion for in-person play, the top replies (scores 18, 16, 10) say players track their own HP on their own sheet and the GM tracks monsters, so "there is no problem to solve". One commenter would only use an app if it saved real time and was free or very cheap. Thread 1w655me, r/rpg, 2026-09-03, OP score about -10, 19 comments. The thread was heavily colored by AI-authorship backlash (Theme H), so the objection to the premise is real but not clean.
- A thread on a simple initiative tracker has a highly upvoted whiteboard method (score 6 in the thread) with no confusion after four years. Thread 1vjgebw, r/DMAcademy, 2026-08-09, score 4, 11 comments.
- A character-tracking app was met with "the target market is people who can't use a pencil but can use a smartphone". Thread 1wbpm4z, r/rpg, 2026-09-09, score 0, 8 comments.
- **Implication:** An app has to be faster than a folded card or a pencil, with near-zero setup. "Digital" is not a benefit on its own at the table.

### Theme B. Phones at the table are a divisive distraction

- **Frequency:** Medium. **Affects:** DMs and players, in-person.
- A PF2e GM says "roll initiative" has become the cue for players to check phones. The most upvoted replies blame long turns and downtime, not phones, and suggest giving players jobs such as tracking initiative or conditions (score 16), and pre-set initiative. Thread 1uxh7oj, r/DMAcademy (poster runs Pathfinder 2e), 2026-07-15, score 0, 50 comments.
- A long r/DnD thread about players on phones splits between "ban phones" (scores 52 to 90) and accommodation for ADHD. Reference material such as spell cards and fidgets are proposed as non-phone alternatives. D&D Beyond is not mentioned. Thread 1dsakw8, r/DnD, 2024-06-30, score 2, 99 comments (first 100k of 211k characters read).
- In a "what would you want in a new app" thread, one commenter says players' phones could distract and prefers physical props. Another says apps discourage players from learning the rules. A third wants a simple "up next" indicator. Thread 1usgorp, r/DMAcademy, 2026-07-10, score 0, 9 comments.
- **Implication:** Phones are tolerated when they hold the character sheet, and resented when they pull attention. A table-facing, low-attention design (glanceable, "up next" cues, short interactions) fits the in-person case better than a feature-dense phone app.

### Theme C. Homebrew in existing tools is clunky, lossy and unreliable

- **Frequency:** High (in the r/dndbeyond sample, which skews to homebrew by search). **Affects:** DMs mostly, and players with homebrew characters. Both online and in-person.
- A user lost hours of work building a boss stat block that "failed to save". Commenters blame bad caching and recommend screenshots as a backup. Another says they left the platform over this and about 100 other issues. Thread 1x1xmrq, r/dndbeyond, 2026-10-09, score 0, 6 comments.
- The homebrew species list throws a persistent HTTP 500 for about a week on one creator's entry. Staff ask for reproduction details, and no fix is reported. Thread 1x0ir0r, r/dndbeyond, 2026-10-08, score 4, 7 comments.
- Edits to a homebrew monster do not show up on the map for 24 hours. Others see feats on sheets that do not update until removed and re-added. Workaround is to duplicate the monster. Thread 1wjqrsr, r/dndbeyond, 2026-09-17, score 6, 6 comments.
- Homebrew items cannot express common ideas (toggled effects, random damage, changed weapon dice). A staff reply says fuller functionality is expected with a future engine. Thread 1wi1zoo, r/dndbeyond, 2026-09-15, score 3, 6 comments.
- Homebrew tag search disappears once an item is added to your library. A moderator says homebrew search is limited because it reuses the official content system. One commenter calls the homebrew UX "a travesty". Thread 1xb9wo1, r/dndbeyond, 2026-10-21, score 4, 4 comments.
- Requests for a JSON/XML/YAML import and export format so third-party content is not retyped. Thread 1vywtov, r/dndbeyond, 2026-08-25, score 11, 3 comments.
- Homebrew monsters and items do not appear in the mobile app's listings (post 1wuhv2x, r/dndbeyond, 2026-09-30, score 5; its comment tree was empty, so this is from the post summary only).
- A DM building an app asks to import and edit existing items rather than rebuild from scratch, and another commenter wants easy swapping of modifiers and damage types. Thread 1usgorp (above).
- **Implication:** Homebrew is a strong pain point because current tools expose a power-user form and fail quietly. A guided form with visible save state, drafts that survive errors, and export is a differentiator.

### Theme D. Cost, subscriptions and content lock-in

- **Frequency:** Medium to High. **Affects:** DMs (who pay), players (character slots, content access), both modes.
- Players ask whether everyone needs an account to join a campaign and use the map. Staff say each player needs their own free account. Commenters debate whether free accounts get 2 or 6 characters and settle on 6 after checking. The DM is nudged toward a paid tier. Thread 1wupnlf, r/dndbeyond, 2026-10-01, score 2, 10 comments.
- Cancelling a subscription: perks end with the paid period, content already on sheets stays, but removed items cannot be re-added without a subscription. One commenter calls the model licensed, not owned. Thread 1xjg49v, r/dndbeyond, 2026-10-30, score 6, 8 comments.
- A player does not want to rebuy books they already own just to use a different VTT. Others defend the first-party map tool as capable. Thread 1wvh58x, r/dndbeyond, 2026-10-02, score 0, 9 comments.
- A $5/month hobby-tier price, framed as "free forever" but gated behind signup and premium shops, drew the top comment (score 135) on confusing free-tier messaging and others on corporate look and spreadsheet equivalence. The post was also removed for being off-topic. Thread 1jc8boa, r/DMAcademy, 2025-03-15, score 96, 31 comments.
- VTT-choice comments (snippets only, 2026-10-16 to 2026-11-02): subscription fatigue with Roll20, preference for a one-time Foundry purchase (scores 2 to 3), and one DM paying the top tier mainly to upload maps. See thread IDs 1x6srqw, 1x71g64, 1xlczwi.
- A user complains about the one-time versus subscription pricing of audio tools. Thread 1svhz61, r/DMAcademy, 2026-04-25, score 42, 26 comments.
- **Implication:** "Free core, no per-player account friction, nothing removable" is a real wedge. Be explicit about what is free, because vague free-tier messaging was punished.

### Theme E. Reliability, caching and "it broke after an update"

- **Frequency:** Medium. **Affects:** everyone, but hurts most during a live session.
- Offline "play-along packs" repeatedly fail to download after app updates. The fix is clearing app storage and re-downloading for a day or two. Many Android users across versions report it. Thread 1w03atk, r/dndbeyond, 2026-08-27, score 17, 5 comments.
- Caching (homebrew not appearing), server 500 errors, and "service unavailable" splash screens recur in the r/dndbeyond listings (1x0ir0r, 1wjqrsr, 1x1xmrq above).
- Pathbuilder's web version showed stale versions until a hard refresh, a server 500 under load, and characters that would not load from cloud storage. Praise for the fast developer response outweighed this. Thread 1ej0fu9, r/Pathfinder2e, 2024-08-03, score 381, 80 comments (first 100k of 181k read).
- **Implication:** Reliability at the table is a feature. Visible sync state, offline tolerance and a clear "saved" signal matter more than extra features.

### Theme F. Rules lookup, DM-facing quick reference and search

- **Frequency:** Medium. **Affects:** DMs, players, in-person especially.
- A request for a conditions lookup inside the app (without opening a character sheet) scored 50. Comments want a rules glossary, an "owned only" filter, pinning the core rulebook, and fewer clicks for DMs. Thread 1wxppk7, r/dndbeyond, 2026-10-11, score 50, 15 comments.
- A DM asks for a spell lookup app for a tablet so they can check unfamiliar spells their players use. Thread 1tqc4vg, r/DMAcademy, 2026-05-28, score 1, 5 comments (listing only, comments not read).
- DMs want a shop and item view with filters for what suits a given player and a way to skim stock without scrolling past variants. Thread 1w2o6c7, r/dndbeyond, 2026-08-30, score 22, 9 comments.
- **Implication:** Fast, free SRD lookup (conditions, spells, items) inside the session screen is a high-value, low-risk feature.

### Theme G. DM tooling gaps: combat tracking details, notes and secrets

- **Frequency:** High. **Affects:** DMs, both modes.
- Initiative and combat trackers: wants are grouped initiative for mixed creatures, bulk damage to several targets at once, conditions with end-of-turn reminders, auto-removal of dependent conditions, one-click legendary resistances, clear next-up cues, and ties resolved by stored modifiers. Threads 1vpsyhg and 1vjgebw above.
- A new DM wants a very simple tracker with nothing beyond adding combatants and seeing whose turn it is. Thread 1vjgebw above.
- A DM wants a damage button that subtracts HP (negative values for healing), because HP math and temporary values are the fiddliest part of running combat. Thread 1v2mz64, r/DMAcademy, 2026-07-21, score 14, 12 comments.
- A checkmark by each player's initiative so the DM does not have to ask who has rolled. Commenters add the party before combat, or auto-roll, though the auto-roll comment was downvoted. Thread 1xl04y9, r/dndbeyond, 2026-11-01, score 24, 10 comments.
- Notes: DMs say Obsidian is the most-recommended tool but takes setup, and ask for cross-device sync, local and private storage, and a 5e-specific tool without a learning curve. Threads 1x9t7jn (r/DMAcademy, 2026-10-19, score 2, 15 comments) and 1ttco7p (r/DMAcademy, 2026-06-01, score 19, 35 comments).
- A DM wants DM-only notes on a map (Scene Prep later shipped). Thread 1w2oio2, r/dndbeyond, 2026-08-30, score 10, 11 comments.
- **Implication:** A tracker that does the HP math and the next-up display well, with no extra setup, is the core value. Notes are a nice-to-have, and a crowded space.

### Theme H. Trust and AI-built apps

- **Frequency:** Medium. **Affects:** anyone launching a new app, and the r/DMAcademy and r/rpg audience in particular.
- A DM asked whether a vibe-coded companion app would put people off. Top replies (scores 21, 13) are hostile. The pragmatic replies want reliability, tests, updates, a clear reason to exist, and disclosure of AI use. One says "there are like 500 people working on the same thing". Thread 1w3e07z, r/DMAcademy, 2026-08-31, score 0, 30 comments.
- In the HP-sync companion thread, the top comments were about AI-sounding writing. Thread 1w655me above.
- On a character-tracking app: "I have more patience for human-crafted software than LLM-emitted trash." Thread 1wbpm4z above.
- In an r/onednd VTT-wishes thread, one commenter accused the poster of farming ideas for a vibe-coded app (score 6). Thread 1wgya7k, r/onednd, 2026-09-15, score 0, 7 comments.
- Moderators also remove self-promotion in these subs, and posts for the same resource are limited. (Thread 1jc8boa, 1w655me and 1wbpm4z were all removed.)
- **Implication:** This is a launch and distribution risk, not a product-design one. Be transparent about how the app is built, avoid self-promotion in the main subs without moderator approval, and lead with reliability and polish.

### Theme I. Character creation and sheets: confusing flows and in-play usability

- **Frequency:** Medium (and thin on the in-person-sheet angle). **Affects:** newer players, in-person players using the sheet at the table.
- A friend could not add a second class. Replies suggest settings, a prerequisite of 13 in both primary scores, and a hidden "add another class" link at the bottom of the character page. The OP's own score was -9. Thread 1xkta5s, r/dndbeyond, 2026-11-01, score 0, 5 comments.
- Pathbuilder web (2021): praised for no account, a single-page layout and speed. Criticized as awkward at the table for in-play use, with tab switching and scrolling dropdowns, and a weak inventory. Commenters want a compact, one-screen "play" view. Thread natntp, r/Pathfinder2e, 2021-05-12, score 0, 24 comments.
- "Character Creation freezing" on one browser (1w1chvg), the 2024 sheet's rage that does not end on rest (1w2kj7b), and damage roller that does not account for rage (1w22nja) show up in the r/dndbeyond listings (2026-08-29 and 2026-08-30). I did not read their comment trees.
- A VTT-wishes thread says character entry matters more than creation, and wants embedded sheets with click-to-roll and toggleable buffs (for example a bonus die from a spell). Thread 1wgya7k above.
- **Implication:** Creation needs to be guided, with prerequisites explained inline. The sheet needs a separate, glanceable "play" mode. Both are consistent with the wizard idea.

### Theme J. Setup friction and learning curve of full VTTs

- **Frequency:** Medium. **Affects:** DMs, online play.
- Commenters in VTT threads say Foundry has a steep learning curve (even for technical users), Roll20 is limited quickly, and they want "a VTT simple enough for the most distracted player". One says "if I have to support it, it is a failure" and explicitly does not want something like Foundry. Thread 1wgya7k above; plus snippets 1x6srqw, 1x71g64.
- One DM has run theater-of-the-mind on Discord and PDFs for years and avoids a subscription. Snippet in thread 1xdlzj9 (comment snippet only).
- **Implication:** Simplicity beats power for the in-person-first audience. Avoid map or VTT scope.

---

## 3. Unmet needs and "I wish" requests

All are from threads read, with the same thread IDs as above. None is a verbatim quote.

1. A simple "up next" indicator that everyone can see, plus a way to see who has rolled initiative. (1usgorp, 1xl04y9, 1xgpxdg)
2. Grouped initiative for mixed creatures and cloned squads, and bulk damage to several targets from one input. (1vpsyhg)
3. Quick HP math: a single damage and heal button, handling temp HP. (1v2mz64)
4. Conditions with end-of-turn reminders, dependent conditions that clear automatically, and conditions that show on both DM and player screens. (1vpsyhg)
5. A rules, condition and spell lookup that does not need a character sheet and can be filtered to what you own or to free content. (1wxppk7, 1tqc4vg)
6. Homebrew that is easy to author, safe from data loss, importable and exportable, and shows up in mobile listings. (1x1xmrq, 1vywtov, 1wuhv2x, 1xb9wo1)
7. Notes with linking, sync across devices, local and private storage, and no AI. (1x9t7jn, 1ttco7p)
8. A play view for the sheet: compact, single screen, with combat stats, spells and inventory. (natntp)
9. Items and shop browsing filtered by what suits a given player. (1w2o6c7, 1jc8boa)
10. Cross-device sync with minimal setup. (1x9t7jn, 1vjgebw)
11. A DM-private layer on shared content (hidden NPC names, DM notes). A hidden-name leak through a hover on the combat tracker image was reported on 2026-10-29. (1w2oio2; listing 1xiwjkq, comments not read)
12. Players want to pass a shared inventory, loot or economy, where one player already acts as the party bookkeeper. (1jc8boa, 1usgorp)

---

## 4. Praise: what users love, so we don't break it

- **No account, no subscription for full function.** Pathbuilder's top-scored praise is that it needs no account and has no six-character cap. Threads natntp (score 21 on that comment) and 1ej0fu9.
- **Fast, responsive developer.** A Pathbuilder update thread scored 381, with the top comments (scores 125, 89, 55) about how quickly the developer ships fixes and offering Patreon support. Thread 1ej0fu9, 2024-08-03.
- **Speed and a single-page layout** for character building ("builds a character in minutes"), and the planning overview for tricky feat and archetype choices. Thread natntp.
- **Interoperability** (PDF export, VTT import via modules). Thread natntp.
- **First-party map tool and sheet integration**: commenters defend it as capable, say players need only a free account, and like the new in-book floating map (score 38 on that listing, 1vz7g8f). Threads 1wvh58x, 1wupnlf.
- **Feature responsiveness from staff**: DM-only map notes and Scene Prep were requested, then shipped, with the OP thanking the team. Thread 1w2oio2.
- **Obsidian and Google Docs for notes**: free, linkable, flexible. Thread 1x9t7jn.
- **Small free tools well received** when simple: a clean initiative and attack track with HP and status values got bookmarked. Thread 1v2mz64.
- **Dragon Fight Club-style trackers** are praised for group saves, conditions, end-of-turn reminders, one-click legendary resistances. Thread 1vpsyhg (the commenter and the tool developer are in the same thread, so treat it as lightly promotional).
- **Physical dice**: a Roll20 macro user cautions that players still enjoy rolling real dice. Snippet 1x932e3.

---

## 5. What this implies for our product (ranked)

Each item is tied to the theme(s) above. The ranking weights frequency, strength of evidence and fit with the stated product (free, mobile-first, in-person, SRD only).

1. **Make the live combat view the hero: glanceable next-up, HP and conditions, one-tap damage and heal, grouped monsters, bulk damage.** (Themes A, G, B.) This beats the card and whiteboard baseline only if it is faster than paper. Keep setup near zero, and test "time to first combat" against index cards.
2. **Be explicit and boring about being free, with no per-player friction.** (Theme D.) One-tap join through a DM invite, no content that can be removed, no hidden tiers. Vague free-tier messaging was punished (score 135).
3. **Guided homebrew forms that never lose work**, with visible saved state, local drafts, duplicate and copy-from-SRD, and import and export. (Theme C.) This is the strongest evidence-backed differentiator in the sample, because the incumbent fails silently.
4. **Reliability and sync you can see:** save and sync status, offline tolerance, no cache confusion. (Theme E.) A broken-after-update experience is the loudest recurring complaint at the table.
5. **Fast SRD lookup in-session** (conditions, spells, items), reachable from the combat screen without opening a sheet. (Theme F.)
6. **A separate "play mode" sheet** (compact, one screen, big tap targets) next to the wizard, which should explain prerequisites inline. (Theme I.)
7. **Design for low phone-attention:** short interactions, no notification-style noise, and a "hand the phone to the next player" flow. Let a player own the tracker role (the highest-scored phone-distraction fix, score 16). (Theme B.)
8. **Keep the scope away from maps, fog of war and full VTT features.** (Theme J.) The audience that wants these already has tools they are loyal to, and the complaints about setup are the opposite of our pitch.
9. **Treat trust as a launch task:** disclose how the app is built, ship tests and a changelog, avoid self-promotion in the main subs without moderator approval, and lead with a short demo or screenshots instead of a signup gate. (Theme H.)
10. **Defer notes and campaign wikis.** (Theme G.) Crowded space with strong free incumbents (Obsidian, Google Docs). A light session log would be enough.

Open product question the evidence raises but does not answer: the "three copies of HP" objection (Theme A) argues that the value is for the DM, not the player. The product should show why a DM wants live player HP (for example, to run monster targeting and healing decisions without asking) before assuming players want to enter it.

---

## 6. Could not verify

- **The scale of any complaint across Reddit.** Counts above are counts among 34 threads in a non-random sample, not prevalence.
- **Sigil shutdown reaction on Reddit.** I could not reach the r/dndnext or r/DnD thread. A news mirror reports mostly indifference and says a first-party 2D map tool was well received, but I did not verify that on Reddit and I did not confirm the shutdown outcome.
- **r/dndnext, r/DnD and r/DungeonsAndDragons keyword searches.** The archive returned errors, so complaints about the paywall, character slots, the mobile app, and 2024 rules support are mostly seen through r/dndbeyond and r/DMAcademy rather than the big general subs.
- **"2024 rules not supported in the app" as a complaint.** No thread showing a user complaining that 2024 content is missing was found. What was found are 2024-sheet bugs (rage not ending, damage roller) and 2014-versus-2024 reference confusion (listing 1wxhv6x, comments not read). The app does appear to support both rule sets. The complaint may have been stronger in 2024 and early 2025, outside the sampled window.
- **Mobile-app complaints beyond offline download failures.** I found very few threads about phone UX (speed, layout, battery) specifically. The sample cannot say how much of the sheet-in-hand experience is a problem.
- **Roll20 and Foundry complaints in depth.** Only comment snippets from VTT-choice threads were read (about subscription cost and learning curve). I did not read those full threads.
- **Pathfinder 2e beyond Pathbuilder.** Only two Pathbuilder threads (2021, 2024) and the 2026 phones thread were read. The 2019 developer thread and a third-party AI review summary were seen in search results only.
- **Thread dates for mirror-sourced Pathfinder items** come from the archive. I could not independently verify them on reddit.com.
- **All scores and per-comment attributions** are second-hand summaries of archive JSON and may shift. Comment scores are as of retrieval on 2026-11-03.
- **Threads where I only saw titles and summaries** (not comment trees): 1tqc4vg, 1wuhv2x (empty tree), 1w1chvg, 1w2kj7b, 1w22nja, 1xiwjkq, 1wxhv6x, 1vz7g8f. These are cited only as supporting context.
- **Removed or deleted content.** Several threads were removed by moderators (1jc8boa, 1w3e07z, 1w655me, 1wbpm4z, 1xixlv1), so comment visibility on live Reddit may differ from the archive.
