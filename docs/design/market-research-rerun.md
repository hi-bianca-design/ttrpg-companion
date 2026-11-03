# Session Zero: market research rerun (2026-11-03)

**Method.** WebSearch, WebFetch, and curl to the iTunes Search API (US store, queried 2026-11-03). I read no files under docs/. Search results come back as summaries without per-page dates, so where a date is missing I say so. Facts are separated from inference; inference is labelled INFERENCE.

**Blocked or unreachable.**
- reddit.com: blocked by the fetch tool, so no Reddit thread was read.
- Google Play: store pages returned 404 or truncated lists, so no first-party Play ratings.
- Justia trademark page: 403. trademarkdir.com: DNS failure. USPTO TSDR: not reached.
- dndbeyond.com/pricing and roll20.net/pricing: 404.
- The Hasbro filings, Roll20 and Demiplane press releases, and the ICv2 reports were not opened.
- I did not try to get around any block.

## 1. Competitor comparison

iOS figures come from the iTunes Search API, 2026-11-03. "n/v" means not verified. Play ratings were not obtainable first-party. The one Play figure below is from a third-party tracker.

| Product | Platforms | Pricing / paywall | Real-time DM-to-player sync | 2024 rules | Homebrew | iOS rating (count) |
|---|---|---|---|---|---|---|
| D&D Beyond | Web, iOS, Android | Free tier; Hero from $2.17/mo and Master from $4.58/mo on annual billing; checkout reportedly $2.99 and $5.99/mo ([DDB subscribe page via search](https://www.dndbeyond.com/en/subscribe), undated). Content bought per book. Master Tier shares purchased content with friends and hosts Maps. | Yes on web (campaigns, Maps). In-app sync disputed: a forum post says the app only resyncs overnight (secondary, forum, undated). | Yes (publisher) | Yes. Hero and Master get shared community homebrew. | 4.75 (92,665), WotC |
| Roll20 | Web; no verified native app | Free with ads; Plus about $5.99/mo and Pro $10.99/mo (Pro per Roll20 help page; Plus from forum posts, unconfirmed; n/v current) | Yes (VTT) | Sheet and builder via SRD 5.2 ([Roll20 page](https://pages.roll20.net/dnd-srd), undated) | Yes (n/v detail) | n/v |
| Demiplane / D&D Nexus | Web | Subscription under $5/mo (undated blog). Roll20 bought Demiplane in June 2024 ([rascal.news](https://www.rascal.news/roll20-announces-acquisition-of-demiplane/)). | n/v | Reader and compendium. A forum post, undated, says no D&D character builder in Nexus. | n/v | No iOS app found |
| Foundry VTT | Self-hosted, browser | $50 one-time licence ([foundryvtt.com/purchase](https://foundryvtt.com/purchase/), 2026-11-03) | Yes | Via community systems (n/v) | Yes (n/v) | No iOS app found |
| Fantasy Grounds | Desktop | Classic subs $3.99 and $9.99/mo (Classic is end-of-life, June 2021). Unity price n/v. | Yes (n/v) | n/v | n/v | n/v |
| Owlbear Rodeo | Web | Free "Nestling" plan plus paid plans ([docs](https://docs.owlbear.rodeo/docs/managing-your-subscription/)). Paid prices n/v. | Yes (VTT) | System-agnostic | n/v | No iOS app found |
| Pathbuilder 2e | iOS (Pathfinder 2e only) | Free | n/v | Not applicable (PF2e) | n/v | 4.87 (199) |
| Fifth Edition Character Sheet | iOS | Free | n/v | n/v | n/v | 4.45 (4,283) |
| PrismScroll 5e | iOS | Free; PrismScrollDM is $2.99 | n/v | n/v | n/v | 4.64 (3,191); DM app 4.76 (217) |
| Fight Club 5e / Game Master 5e | iOS | Free | n/v | Last updated 2023-04-09 | n/v | 4.67 (3,951); GM 4.69 (1,595) |
| Encounter+ | iOS | Free | Player view mirroring n/v | n/v | n/v | 4.35 (570) |

Other App Store findings from the same API run:
- **SessionKeeper** (SessionKeeper LLC): a session recorder with AI summaries. Free with subscriptions at $3.99, $9.99 and $24.99/mo. Rated 4.8 (94) on the [US store page](https://apps.apple.com/us/app/sessionkeeper/id6737173822), fetched 2026-11-03.
- **Saga20** (Fettle Interactive): campaign notes, 5.0 (2). A Sept 11, 2026 press release announces an iOS and Android app ([newsfilecorp](https://www.newsfilecorp.com/release/313809)).
- **Quest Portal VTT**: 4.73 (353).
- Many AI game-master apps (Everweave 4.26 with 8,680 ratings).
- Several tiny 5e sheet apps, updated in the last month, each with fewer than 10 ratings.
- Google Play: D&D Beyond is about 4.6 with about 121K ratings, per third-party trackers only ([appgoblin](https://appgoblin.info/apps/com.fandom.playercompanion), undated; secondary, not verified against Play).

**D&D Beyond 2026 announcements.**
- Source: D&D Beyond's [2026 roadmap post](https://www.dndbeyond.com/posts/2132-d-d-beyonds-2026-development-roadmap), 2026-02-19.
- Character builder: a "Quickbuilder" for level-1 characters in March 2026, with a fuller modernised builder later in 2026 on a rebuilt engine.
- DM tools: DM Prep features for the Maps VTT through the year, plus quality-of-life updates (copy and paste, polygonal fog, monster reveals).
- Mobile: the post does not mention a mobile app.
- Homebrew: not listed as a roadmap item.
- Live sessions: not named as such. DM Prep for Maps is the closest item.
- Unconfirmed: whether any of these shipped after February. I did not open the live roadmap page.
- Drops: a weekly subscriber content drop was added in May 2026 ([search summary only](https://marketplace.dndbeyond.com/subscribe)).

**Sigil.**
- Servers shut down on 2026-10-31. Everything inside Sigil, including campaigns and notes, is deleted after that date ([GeekNative, 2025-10-24](https://www.geeknative.com/210648/its-official-wizards-of-the-coast-confirms-dds-sigil-vtt-is-shutting-down)).
- Compensation: six free months of Master Tier for people who used Sigil between 2025-03-01 and 2025-10-23. The pre-order miniature is replaced by a dice set.
- 30 staff were laid off on March 18 (year per search summary: 2025) ([Rascal](https://www.rascal.news/wizards-of-the-coast-shutters-sigil-virtual-tabletop-project-lays-off-30-staff/)).
- I did not confirm that the servers actually went offline on schedule.
- INFERENCE: the roughly 6-month credit expires around May 2026 or later, so affected users are now past it or near it. The 3D-VTT audience has nowhere to go inside D&D Beyond except the 2D Maps tool. Whether that audience is large is unverified.

## 2. Market snapshot

| Figure | Value | Source and date | Quality tag |
|---|---|---|---|
| Registered D&D Beyond users | More than 18M at the 2024 PHB launch | WotC launch press release (via [mynewsdesk](https://www.mynewsdesk.com/uk/bastion-uk/pressreleases/2024-players-handbook-is-the-fastest-selling-dungeons-and-dragons-product-of-all-time-3345138), 2024) | Primary (publisher, second-hand copy) |
| Registered users, later | 19M per a Hasbro earnings report | Via EN World summary, undated | Secondary |
| "Active users 21M / 22M" | Forum claims | EN World posts | Estimate, unverified |
| D&D fans worldwide | More than 85M | Same press release | Primary, marketing claim |
| 2024 PHB effect | "Fastest-selling" D&D product; 3x copies of the 2014 PHB at launch; first print 3x larger; units not disclosed | Same press release | Primary |
| Wizards of the Coast and Digital Gaming segment, 2025 | About $2.2B, up 45% | Blog citing Hasbro FY2025 ([voxbooster](https://voxbooster.com/blog/dnd-ttrpg-statistics-2026), 2026) | Secondary. The Hasbro filing was not opened. |
| D&D alone, 2025 | About $460M | Same blog | Estimate (derived, not reported) |
| Global TTRPG market, 2025 | $2.31B | Fortune Business Insights ([page](https://www.fortunebusinessinsights.com/tabletop-role-playing-game-market-119102)) | Secondary analyst estimate |
| US and Canada hobby games, 2025 | $3.66B | ICv2 via blog | Secondary |
| Roll20 or Demiplane user counts | Not found | None | Unverified |
| In person vs online | 2019 poll (n=3,377): 70% mostly in person. Feb 2022 (n=787): 63% mostly online. | [Sly Flourish polls](https://slyflourish.com/facebook_surveys.html) | Self-selected polls, estimate |
| Group size | Sept 2022 poll (n=4,400): 39% play with four, 28% five, 11% six, 18% under four | Same | Self-selected, estimate |
| Age | One market study: 48% millennial, 19% Gen X, 33% Gen Z (original not found) | Summary via EN World | Unverified |
| DM vs player split, phone use at table | Not found | None | Unverified |

## 3. Pain-point themes

Reddit was blocked, so frequency is **not measured**. The evidence is thin: single forum threads and one search summary. Ranking is my judgment from what I could read.

1. **Mobile app lacks DM features (encounters, homebrew, initiative).**
   - Affects DMs, at the table or online.
   - [Encounters & Homebrew, D&D Beyond forum, 2025-01-24](https://www.dndbeyond.com/forums/d-d-beyond-mobile-app-feedback/214575-encounters-homebrew): an iPad user cannot view or run encounters or homebrew.
   - [Is the app dead for new features?, 2025-03-11](https://www.dndbeyond.com/forums/d-d-beyond-mobile-app-feedback/217311-is-the-app-dead-when-it-comes-to-new-features): the poster says patch notes list only minor fixes.
   - A request for an in-app initiative tracker that accepts on-the-fly homebrew monsters (search summary, DDB forum, undated).
2. **Sync lag between web and app, and 2024 content missing on mobile.**
   - Affects players and DMs.
   - Staff are reported to say the app resyncs overnight. 2024 spells and books were reported missing in the app (DDB forum threads, 2024 to 2025, individual dates not verified).
3. **Conditions not tracked or expiring automatically in trackers.**
   - Affects DMs.
   - A DDB forum thread asks for DM-assigned conditions with auto-expiry (undated, from a search summary).
   - Frequency unverified, and I found no thread complaining that apps are too complex at the table.
4. **Rules-version confusion.** Pre-2024 homebrew stayed tied to 2014 classes (DDB forum, undated).
5. **Platform direction and paywall frustration.** Buyers complained they had to re-buy a book to use it in a builder (Demiplane forum, undated). The Sigil closure fed this ([GamesRadar opinion headline](https://www.gamesradar.com/tabletop-gaming/project-sigil-is-officially-dead-and-i-cant-believe-d-and-d-fumbled-its-best-idea-in-years); body not read).

Needs for in-person groups specifically (phone-first play, DM-controlled rests, shared HP) were **not found stated anywhere**. INFERENCE: this is a gap, but I have no demand evidence.

## 4. Licensing and store rules

**Exact attribution** (SRD 5.2.1 PDF, "Legal Information", p.1, file dated 2025-05-01, [PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), read 2026-11-03):

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The same page says: "Please do not include any other attribution to Wizards or its parent or affiliates." It permits a statement that the work is "compatible with fifth edition" or "5E compatible".

**Safe to do**
- Use SRD 5.2.1 text commercially, with the statement above in the app and on the store listing or about page (the PDF says "in any of your work"; where exactly is my reading).
- Say "5E compatible" or "compatible with fifth edition".
- Offer original content packs and commissioned art, and your own homebrew forms.
- Offer account deletion and in-app purchase for digital features (below).

**Needs care**
- Apple 1.2 (user-generated content). Homebrew shared between users needs a filter, a report mechanism, a block function and published contact details ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/), fetched 2026-11-03, page undated). Private-only homebrew may fall outside this. That is my reading.
- Apple 5.1.1(v): account creation requires in-app account deletion.
- Apple 3.1.1: digital features must be unlocked via in-app purchase. 3.1.3(b) allows access to things bought elsewhere (for example on the web) if the same items are also sold as in-app purchases.
- Apple 3.1.2(a): a subscription must give ongoing value and work on all the user's devices. Taking away primary functionality existing users have already paid for is discouraged. For a free app that later adds a paid tier, the clean reading is to keep free features free. That is INFERENCE; Apple's text speaks to paid users.
- Apple 5.2.1 and 4.1: no misleading names, no use of others' marks.
- Name: the SRD grants no trademark rights (see below). I did not read the CC BY 4.0 legal code in this run.
- USPTO clearance for "Session Zero" is incomplete (section 6).

**Do not do**
- Do not add any other attribution to Wizards (the PDF forbids it).
- Do not use "Dungeons & Dragons", the D&D logo, or the "Wizards of the Coast" name as a brand. I did not retrieve a Wizards trademark policy this run, so the basis for this is the SRD's own instruction plus Apple 5.2.1. Verify before launch.
- Do not include non-SRD book content (Player's Handbook text, Forgotten Realms names and similar) without a licence.
- Do not sell non-SRD rulebook content. WotC's [Fan Content Policy](https://company.wizards.com/fancontentpolicy) says fan content cannot be sold or licensed to third parties without permission (search summary; the policy page itself was not opened). A route for third parties to sell non-SRD content: unverified beyond the DM's Guild program, whose current terms I did not read.

## 5. Monetization options

Benchmarks: [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/), median download-to-paid at day 35: **2.1% freemium, 10.7% hard paywall**. Revenue per install at day 60: $0.38 freemium, $3.09 hard paywall. North America trial-to-paid: 34.2%. These are all-category subscription-app benchmarks, not hobby or TTRPG benchmarks (hobby-specific benchmarks: unverified). Competitor price points: D&D Beyond $2.17 to $5.99/mo, Roll20 up to $10.99/mo, Foundry $50 once, SessionKeeper $3.99 to $24.99/mo, PrismScrollDM $2.99 once.

1. **DM Pro subscription (DM pays for the table).**
   - Price in line with D&D Beyond Hero or Master tiers (about $2 to $6/mo).
   - Pros: matches the D&D Beyond model; players join free, which helps viral spread.
   - Cons: a 2.1% freemium-style conversion of DMs only. Apple 3.1.2 requires ongoing value on all devices.
2. **One-time unlock (DM Pro lifetime, about $3 to $10).**
   - Anchors: PrismScrollDM at $2.99, Foundry at $50.
   - Pros: low friction for hobbyists; avoids subscription fatigue.
   - Cons: no recurring revenue while hosting sync and storage costs recur (INFERENCE).
3. **Content packs and commissioned art, plus optional tips.**
   - Pros: no gating of existing free features; fits the no-rulebook stance.
   - Cons: depends on creator output; I found no data on pack demand. Tip-jar performance: unverified.

INFERENCE: option 1 plus 3 is the most consistent with what the market already pays for. I have no conversion data from TTRPG apps to back any of the three.

## 6. Name check: "Session Zero"

| Hit | Owner | Type | Status |
|---|---|---|---|
| "THE SESSION ZERO SYSTEM", USPTO serial 98352984, Class 28 (filed 2024-01-11) | Mythic Grove Productions LLC (per search summary) | Class 28 mark, goods unconfirmed | Aggregators conflict: one says registered (reg. 7640275), one shows "new application". The USPTO record was not checked. |
| SESSIONKEEPER, serial 98911302, Class 9 | Not verified | Software for tabletop notes | Pending per search summary. Different word, but the same field. |
| Session Zero Labs ([itch.io](https://sessionzerolabs.itch.io/session-zero-labs)) | Unknown | Free browser GM toolkit, "in development" | Active page, undated |
| The Session Zero Toolkit ([itch.io](https://bagquest.itch.io/the-session-zero-toolkit)) | Unknown | Printable worksheets | Active, undated |
| D&D Session Zero Guide (Minva, [Gumroad](https://minva.gumroad.com/l/dndsessionzeroguide)) | Minva | Guide product | Active, undated |
| App Store (US), iTunes API, terms "session zero", "sessionzero", "session zero dnd", "session zero campaign" | none | No app named "Session Zero" found | As of 2026-11-03 |
| Google Play | n/v | Search page truncated; one unrelated app listed ("The Tavern", SixFoot) | Not verified |
| "Session zero" as a common term | Many | The phrase is generic RPG vocabulary: D&D Beyond itself has a ["Session Zero" article](https://www.dndbeyond.com/posts/662-session-zero-a-foundation-for-greatness) | Fact. INFERENCE: weak distinctiveness for the mark. |

I did not search USPTO classes 9, 41 and 28 myself. The above comes from aggregator pages surfaced by search.

## 7. Top 5 findings and Top 5 unverified

**Top 5 findings**
1. The exact SRD 5.2.1 attribution is in the PDF. Wizards forbids any other attribution but allows "5E compatible".
2. D&D Beyond is dominant on iOS (4.75 with 92,665 ratings). Its 2026 roadmap lists a Quickbuilder, builder modernisation and Maps DM Prep, but no mobile app or homebrew items.
3. Sigil's servers shut on 2026-10-31 with all data deleted. D&D Beyond's mobile gaps are documented in 2025 forum threads.
4. The App Store has no "Session Zero" app today. A Class 28 "THE SESSION ZERO SYSTEM" filing exists with conflicting status, and the phrase is generic.
5. Subscription benchmarks (RevenueCat 2026): 2.1% freemium conversion against 10.7% hard paywall, with all-category medians. Competitor prices cluster at $2 to $11 per month.

**Top 5 things I could not verify**
1. Any Reddit pain-point frequency or quotes (Reddit blocked).
2. Roll20, Demiplane and Owlbear paid prices, 2024-rules support, and Google Play ratings for all competitors.
3. Current USPTO status and goods for any Session Zero mark (classes 9, 41, 28).
4. DM-versus-player split, phone use at the table, and current in-person versus online share.
5. Whether D&D Beyond shipped mobile, homebrew or live-session features after Feb 2026, and any official route for third parties to sell non-SRD content.
