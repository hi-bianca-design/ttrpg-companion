# Risks and open questions

**Status:** Living list. Review whenever a phase of the [roadmap](roadmap.md) starts or ends.

## Risks

Likelihood and impact are the author's rough judgement: **to be revisited**, not measured.

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | **Licensing or trademark action** over the app name or content | Medium | High | Fix attribution; plan a rename; keep packs inside the SRD / original / licensed boundary; get legal advice before public launch | Bianca |
| R2 | **Too few tables**, so DM-pays never reaches enough DMs | Medium | High | Measure table formation early; make invites easy; keep players free | Bianca |
| R3 | **Free is good enough**, nobody upgrades | Medium | High | Find the features DMs actually ask for; test caps against real usage before setting them | Bianca |
| R4 | **Art costs outrun sales** | Medium | Medium | One pack at a time; revenue-share options; record production cost per pack | Bianca |
| R5 | **Store removal or rejection** (content, billing, name) | Low to medium | High | Launch web first; read store rules; attribution and licences ready | Bianca |
| R6 | **Platform fees** reduce margins more than modelled | High | Medium | Model net revenue, not gross; web checkout where permitted | Bianca |
| R7 | **A bug in access rules** leaks or wrongly blocks paid content | Low | High | Rules are in RLS and tested (23 assertions); add tests for every new rule; keep a manual QA checklist per pack | Bianca |
| R8 | **Lapse behaviour surprises users** (broken sheet, unclear errors) | Medium | Medium | The lapse rule is built and tested; build friendly messages ([Paywall and upgrade UX](../design/paywall-and-upgrade-ux.md)) | Bianca |
| R9 | **Billing webhook failure** (missed or duplicated events) leaves people without access they paid for | Medium | High | Idempotent, logged, alerting; a way to re-sync from the provider; clear support path | Bianca |
| R10 | **Solo capacity**: too many tracks (content, art, billing, legal) | High | Medium | The roadmap's order; do not start paid work before its exit signal | Bianca |
| R11 | **Artist relationships and rights disputes** | Low | High | Written contracts before work; keep records ([Artist commissioning](../content/artist-commissioning.md)) | Bianca |
| R12 | **Privacy or children's data rules** | Low to medium | High | Minimal data; age policy; privacy policy; get advice | Bianca |
| R13 | **Backlash to monetization** from the community | Low | Medium | Never lock existing characters; be open about what's free; no dark patterns | Bianca |
| R14 | **Conversion is near 2%**, so revenue stays too small to matter | High | Medium | Keep fixed costs tiny; plan at 2%; test DM-pays early | Bianca |
| R15 | **Shared homebrew** brings moderation duties and store rejection (guideline 1.2) | Medium | Medium | Keep homebrew private at launch (D16); build report, block and filter before sharing | Bianca |
| R16 | **A bigger rival ships live mobile sync** after its 2026 platform rebuild | Medium | High | Be first and best at the free phone-first table experience; own the "never gated" promise | Bianca |
| R17 | **"Session Zero" fails a trademark search** or is already in use for tabletop software | Low to medium | Medium | First pass found a pending or registered "THE SESSION ZERO SYSTEM" (class 28, a card deck) and a free web GM toolkit called Session Zero Labs; see [Content licensing](../legal/content-licensing.md). Run the official USPTO search and check domains before launch (D13); keep the shortlist (Long Rest, Hearthroll) | Bianca |

## Open questions

Each one blocks something. The answer goes in the [decision log](decision-log.md) when it's settled.

| # | Question | Blocks | How to answer |
|---|---|---|---|
| Q1 | What is the right price for DM Pro and for a first pack? | Phase 3, 4 | Talk to DMs; after a baseline, test a few prices |
| Q2 | What should the free caps be, and what's in DM Pro? | Phase 3 | Usage data: who hits what |
| Q3 | RevenueCat + Stripe, a merchant of record, or Stripe alone? | Phase 3 | Evaluate current fees and terms against web-first launch |
| Q4 | Web first, or native first? | Phase 3, 6 | The memory says web first; confirm against where the audience is |
| Q5 | ~~Can the app keep a game trademark in its name?~~ **Resolved: the app is named Session Zero** (D13). Still run a trademark search before the store launch. | Phase 1 | Trademark search; see [Content licensing](../legal/content-licensing.md) |
| Q6 | Is the SRD attribution shown correctly? | Phase 1 | Add the licences screen; legal check |
| Q7 | What age do we allow, and are children in scope? | Phase 1 | Advice; decide and write into the terms |
| Q8 | Art storage: copy-on-pick or policy mirrors the content rule? | Phase 4 | Scope with the first art pack ([Art storage and delivery](../engineering/art-storage-and-delivery.md)) |
| Q9 | How do themes work technically, and what can vary? | Phase 5 | Its own spec ([Themes and cosmetics](../design/themes-and-cosmetics.md)) |
| Q10 | Do locked pack items show in pickers? | Phase 3 | Design decision ([Shop and pack presentation](../design/shop-and-pack-presentation.md)) |
| Q11 | Is Daggerheart content sellable under its licence? | Any Daggerheart pack | Read the licence; ask the publisher if unclear |
| Q12 | Do we allow user-made homebrew sharing, or a marketplace? | Not planned | Revisit only with real demand; it raises licensing and payouts |

## Assumptions we are making

If one of these is wrong, parts of the plan change:

- DMs will pay a small recurring amount for table tools.
- Tables form around a DM and bring free players with them.
- An audience that cares about original art will buy packs.
- Web is a good enough first platform.
- We can write original content that people want, without relying on any non-SRD material.

Test the first two as early as possible: they decide whether DM-pays works at all.
