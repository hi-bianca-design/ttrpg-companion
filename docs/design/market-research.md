# Market research

**Status:** Research, 2026-11-03. Replaces the separate Reddit pain-point report, the independent rerun and the comparison note.

Three runs went into this: round one (Reddit pain points, licensing, revenue model), an independent rerun by an agent that had not seen round one, and a Gemini deep-research report. Where they disagree, this file says which source is better. Facts and inference are kept apart, and anything not verified is marked **n/v** (not verified).

**Decision:** keep the name Session Zero for now. The name risks in section 7 stay open.

## 1. What to act on

1. **Run the official USPTO search** (SESSION ZERO, classes 9, 41 and 28, live and dead) and get a trademark lawyer's view. Add sessionzero.games and Daggerheart's own Session Zero page to the conflict list.
2. **Check the claim that D&D Beyond's roadmap has no mobile item.** A cited r/onednd thread titled "New DDB mobile app" (id 1vbup00) may contradict it. Nobody has read it, because Reddit is blocked for fetch tools.
3. **Show the SRD attribution in an About / Licences screen** before any public launch. All three runs agree on the wording, and the app does not display it yet.
4. **Validate DM demand with real DMs before fixing prices.** No run found TTRPG conversion data or in-person demand data, and many tables beat apps with paper (theme A).
5. Build the product around the Reddit-backed wedge in section 5: a fast combat view, a plainly free core, and homebrew that never loses work.

## 2. Competitors

iOS figures are from the iTunes Search API on 2026-11-03 (US store). Play ratings were not obtainable first-party.

| Product | Platforms | Pricing | Notes | iOS rating (count) |
|---|---|---|---|---|
| D&D Beyond | Web, iOS, Android | Free tier; Hero from $2.17/mo, Master from $4.58/mo on annual billing (checkout $2.99 and $5.99/mo); books bought separately | Maps VTT on web; shared homebrew on paid tiers | 4.75 (92,665) |
| Roll20 | Web | Free with ads; Plus about $5.99/mo, Pro $10.99/mo (n/v current) | Full VTT; bought Demiplane in June 2024 | n/v |
| Demiplane / Nexus | Web | Under $5/mo (undated) | Reader and compendium; no D&D builder per an undated forum post | no iOS app |
| Foundry VTT | Self-hosted | $50 once | Steep learning curve per Reddit | no iOS app |
| Owlbear Rodeo | Web | Free plan plus paid (prices n/v) | System-agnostic VTT | no iOS app |
| Fifth Edition Character Sheet | iOS, Android | Free | Offline-first sheet | 4.45 (4,283) |
| PrismScroll 5e | iOS | Free; PrismScrollDM $2.99 | | 4.64 (3,191); DM app 4.76 (217) |
| Fight Club 5e / Game Master 5e | iOS | Free | Last updated 2023 | 4.67 (3,951); GM 4.69 (1,595) |
| Encounter+ | iOS, iPad, Mac | Free with purchases | Local combat tracker, player-view screen | 4.35 (570) |
| Pathbuilder 2e | iOS | Free | Pathfinder 2e only | 4.87 (199) |
| SessionKeeper | iOS | Free; $3.99, $9.99, $24.99/mo | AI session recorder | 4.8 (94) |
| Quest Portal VTT | iOS, Android | Free tier, subscriptions, credits | AI story tools drew pushback | 4.73 (353) |
| Bag of Mapping | Browser, Chrome extension | Free tier, storage tiers | Touch-first 2D VTT; imports from D&D Beyond and Pathbuilder | n/a |

Other: Saga20 (campaign notes, an iOS and Android app announced Sept 2026), many AI game-master apps (Everweave 4.26 from 8,680 ratings), and several tiny 5e sheet apps with fewer than 10 ratings. Google Play figures for D&D Beyond (about 4.6, about 121K ratings) come from a third-party tracker only.

## 3. Market snapshot

| Figure | Value | Quality |
|---|---|---|
| D&D Beyond registered users | 18M+ at the 2024 PHB launch; 19M later per a Hasbro earnings summary | Publisher press release (second-hand copy); secondary |
| D&D fans worldwide | 85M+ | Marketing claim |
| Wizards and Digital Gaming segment, 2025 | About $2.2B, up 45% | Secondary blog citing Hasbro; filing not opened |
| D&D alone, 2025 | About $460M | Derived estimate |
| Global TTRPG market, 2025 | $2.31B | Fortune Business Insights, analyst estimate |
| In person vs online | 2019: 70% mostly in person (n=3,377). Feb 2022: 63% mostly online (n=787) | Self-selected polls |
| Group size | 39% play with four, 28% five, 11% six | Self-selected poll, n=4,400 |
| Roll20 or Demiplane user counts, DM vs player split, phone use at the table | Not found | n/v |

## 4. Platform shifts

**D&D Beyond 2026 roadmap** (post of 2026-02-19): a Quickbuilder for level-1 characters in March, a modernised builder later in 2026 on a rebuilt engine, and DM Prep features for the Maps VTT. The post names no mobile app, no homebrew item and no live-session sync. It is unconfirmed whether anything shipped after February, and the "New DDB mobile app" thread above is a warning sign. A weekly subscriber content drop was added in May 2026 (search summary only).

**Sigil:** Wizards announced the end of its 3D VTT in October 2025 and shut the servers on 2026-10-31, deleting all data. About 30 staff were laid off in March 2025. Affected users got six free months of Master Tier. Three sources agree on the dates. Reported causes (hardware demands, cloud cost, heavy prep for GMs) come from commentary, not company statements. Whether the shutdown went offline on schedule was not confirmed.

## 5. Pain points from Reddit

Source: round one read 34 threads with full comment trees through an archive mirror (Arctic Shift), plus about 15 comment snippets and about 130 post listings. Scores are second-hand (a summarising model read the archive JSON). The sample skews to r/DMAcademy and r/dndbeyond, and to Aug to Nov 2026. Frequency means count among the 34 threads, not prevalence on Reddit. Thread ids are Reddit base-36 ids (`reddit.com/r/<sub>/comments/<id>/`).

| Theme | Freq. | Evidence | Implication |
|---|---|---|---|
| **A. In-person tables run on paper and whiteboards** | High | Folded name cards, clothespins, whiteboards (1xgpxdg, 1vpsyhg, 1vjgebw). "There is no problem to solve" for live HP sync (1w655me). | The app must beat a folded card on speed, with near-zero setup |
| **B. Phones at the table divide people** | Medium | Phones as the cue to check out (1uxh7oj, 1dsakw8). Top fix is giving players a job, such as tracking initiative. | Glanceable, short interactions; let a player own the tracker |
| **C. Homebrew is clunky and loses work** | High (in r/dndbeyond) | Stat block "failed to save" (1x1xmrq), HTTP 500s (1x0ir0r), edits not showing for 24 hours (1wjqrsr), no import/export (1vywtov), homebrew missing from mobile listings (1wuhv2x, post only) | Guided forms, visible saved state, local drafts, export. The strongest differentiator in the sample |
| **D. Cost, subscriptions and lock-in** | Medium to high | Per-player accounts (1wupnlf), content removed on cancel (1xjg49v), re-buying books (1wvh58x), vague "free" messaging punished at score 135 (1jc8boa), Roll20 fatigue (1x6srqw, 1x71g64) | Free core, no per-player friction, nothing removable; say plainly what is free |
| **E. Reliability after updates** | Medium | Offline packs failing after updates (1w03atk), stale caches and 500s, Pathbuilder web (1ej0fu9) | Show save and sync state; tolerate offline |
| **F. Rules lookup** | Medium | Conditions lookup without opening a sheet scored 50 (1wxppk7); spell lookup (1tqc4vg); shop filters (1w2o6c7) | Fast free SRD lookup from the combat screen |
| **G. DM tooling gaps** | High | Grouped initiative, bulk damage, one-tap HP math (1v2mz64), conditions with end-of-turn reminders, a "has rolled" tick (1xl04y9), notes (1x9t7jn, 1ttco7p) | Do HP math and "up next" well; defer notes |
| **H. Distrust of AI-built apps** | Medium | Hostile replies to a vibe-coded app (1w3e07z), AI-writing backlash (1w655me, 1wbpm4z); self-promotion posts removed | Disclose how the app is built; lead with reliability |
| **I. Character creation and sheets** | Medium | Hidden multiclass link (1xkta5s); Pathbuilder praised for speed, criticised for in-play use (natntp) | Inline prerequisites; a separate compact play view |
| **J. VTT setup friction** | Medium | Foundry's learning curve, "if I have to support it, it is a failure" (1wgya7k) | Stay away from maps and fog of war |

**Wishes, ranked by evidence:** a shared "up next" cue; grouped initiative and bulk damage; a single damage and heal button with temp HP; conditions with reminders; lookup that needs no sheet; homebrew that is safe, importable and exportable; a compact play view; a DM-private layer on shared content.

**Praise to protect:** no account and no character cap (Pathbuilder), a fast developer, a single-page layout, PDF export, and small free tools that stay simple.

**Open question:** the "three copies of HP" objection says the value is for the DM. Show why a DM wants live player HP before assuming players will enter it.

**Ranked implications:**
1. Make the live combat view the hero, and test time-to-first-combat against index cards.
2. Be explicit and boring about being free.
3. Guided homebrew that never loses work.
4. Visible reliability and sync.
5. Fast in-session SRD lookup.
6. A separate play-mode sheet.
7. Low phone-attention design.
8. No maps or full VTT.
9. Treat trust as a launch task (disclosure, tests, a changelog, no self-promotion in the main subs).
10. Defer notes and wikis.

**Not found:** a thread complaining that 2024 content is missing from the app. Only 2024-sheet bugs (1w2kj7b, 1w22nja) and 2014 vs 2024 confusion (1wxhv6x). The rerun cites 2024-25 forum threads saying 2024 content was missing and that the app resyncs only overnight. Round one has the better sample for the present, and those older complaints may be fixed.

## 6. Licensing and store rules

**Required SRD 5.2.1 attribution** (verbatim from the official PDF, "Legal Information", p.1, read 2026-11-03):

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The same page says not to add any other attribution to Wizards or its parent or affiliates, and allows saying the work is "compatible with fifth edition" or "5E compatible". The full working rules are in [Content licensing](../legal/content-licensing.md).

- **Safe:** commercial use of SRD text with the statement above; "5E compatible"; original packs and commissioned art. CC BY 4.0 is a licence with an attribution condition. It is not public domain, and the publisher states it cannot revoke it.
- **Do not:** use the D&D name or logo, or the Wizards name, as a brand; include non-SRD book content; sell non-SRD rulebook content. The fan-content policy bars selling fan content (seen only through a search summary). Whether Wizards' third-party seller program offers a route is n/v.
- **Apple:** 1.2 (shared homebrew needs a filter, reporting, blocking and contact details; private-only homebrew may fall outside this, which is a reading); 5.1.1(v) (account creation needs in-app deletion); 3.1.1 and 3.1.3(b) (digital features sold in-app; access to items bought elsewhere only if also sold in-app); 3.1.2(a) (subscriptions need ongoing value; keep free features free is the clean reading, an inference); 5.2.1 and 4.1 (no misleading names or others' marks).

## 7. Monetization benchmarks and the name

**Benchmarks:** RevenueCat State of Subscription Apps 2026, all-category medians: download-to-paid at day 35 is **2.1% freemium** and **10.7% hard paywall**; revenue per install at day 60 is $0.38 and $3.09; North America trial-to-paid is 34.2%. No TTRPG-specific figure was found. Competitor prices cluster at $2 to $11 a month, Foundry is $50 once, and PrismScrollDM is $2.99. A DM Pro subscription plus original packs fits what the market already pays for (inference). The plan and caps are in the [Revenue model](../business/revenue-model.md).

**Name check, "Session Zero"** (web search and iTunes API only, not a clearance):

| Hit | Detail | Status |
|---|---|---|
| THE SESSION ZERO SYSTEM, serial 98352984, Class 28 | Mythic Grove Productions LLC, filed 2024-01-11; a card deck and art book per round one | Conflicting: one directory says registered (reg. 7640275, 2025-01-07), another says pending. USPTO record not reached |
| SESSIONKEEPER, serial 98911302, Class 9 | Software for tabletop notes | Pending per search summary; different word, same field |
| sessionzero.games (Kejid) | Free open-source web tool: zero-login group voting on which system to play, 112+ systems, safety tools. Pre-game only | Active. The closest same-name product |
| Session Zero Labs (itch.io) | Free browser GM toolkit | Active, no filing found |
| daggerheart.com/sessionzero | The publisher's own page for our second game system | Active, from Gemini |
| Other itch.io and Gumroad products | Guides, worksheets, toolkits | Active |
| US App Store | No app named Session Zero (terms: session zero, sessionzero, session zero dnd, session zero campaign) | As of 2026-11-03 |
| Google Play, USPTO classes 9, 41 and 28 | n/v | |

The phrase is ordinary hobby vocabulary, which makes the mark weak: easy to use and hard to own. If the name has to change, the shortlist is Long Rest and Hearthroll. Other candidates floated but not checked: Pocket Table, Tablecraft, Rollhearth, Hearthside.

## 8. Where the three runs agree and differ

**Agree:** the SRD attribution wording; D&D Beyond at about 4.75 stars from 92K iOS ratings; its roadmap has no mobile, homebrew or live-session item; Sigil's closure on 2026-10-31; the Mythic Grove mark and Session Zero Labs; no app named Session Zero on the US App Store; conversion about 2%; no official route to sell non-SRD content.

| Topic | Difference | Better source |
|---|---|---|
| Conversion | "About 2%, secondary" vs a named RevenueCat figure | Rerun |
| Mythic Grove status | Registered vs pending | Unresolved |
| 2024 content missing in the app | Old forum threads vs 2026 Reddit sample | Round one, for now |
| Gemini's satisfaction percentages, "public domain" claim and "most players use phones" | Unsourced or wrong | Ignore |

**Found only in later runs:** SessionKeeper and its Class 9 filing, competitor prices and ratings, the Roll20 and Demiplane deal, market-size figures and the Apple rule sections (rerun); sessionzero.games, the Daggerheart page, Bag of Mapping and the "New DDB mobile app" thread (Gemini).

**Not confirmed by the later runs:** every Reddit theme (Reddit was blocked), in-person demand, the Daggerheart licence terms, and the free-tier cap hypotheses.

## 9. Could not verify

- Reddit frequencies beyond the 34-thread sample, and the Sigil reaction on Reddit.
- Current USPTO status and goods for any Session Zero mark, in classes 9, 41 and 28.
- Roll20, Demiplane and Owlbear paid prices, 2024-rules support, and Google Play ratings.
- DM vs player split, phone use at the table, and the current in-person vs online share.
- Whether D&D Beyond shipped mobile, homebrew or live-session features after February 2026.
- Hobby-specific subscription benchmarks.

## 10. Method and limits

- **Round one:** reddit.com and its search endpoints were blocked. The 34 threads came from the Arctic Shift archive, where keyword search was flaky. Per-comment scores are second-hand.
- **Rerun:** WebSearch, WebFetch and the iTunes Search API. Reddit, Google Play pages, Justia, USPTO and the pricing pages of D&D Beyond and Roll20 were unreachable. No block was worked around. It read no files under `docs/`.
- **Gemini:** a deep-research report with numbered citations that are not tied to individual claims. Treated as secondary. Nothing from it is used here without a second source, except the same-name products and the cited thread, which are flagged for checking.
- This file was assembled by reading the three earlier documents, with no new web research.
