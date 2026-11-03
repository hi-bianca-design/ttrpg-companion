# Content licensing

**Status:** Decided (what we will and won't sell, D3). Several items below are **open questions that need real legal review**.

> This document is a working summary by a builder, **not legal advice.** Before charging money, have a lawyer who knows games, IP and app stores read this and the licences themselves.

## What we use today

| Source | Licence | Used for | Our obligations |
|---|---|---|---|
| **5e 2024 SRD (version 5.2.1)** | CC BY 4.0 | The free base content of the app | Give attribution as the licence requires: credit the source, link the licence, state changes. The attribution text is stored in `game_systems.attribution` |
| **Daggerheart SRD 1.0** | The publisher's community gaming licence | A second game system in the codebase | Follow that licence's rules on attribution, branding and monetisation. **Verify its commercial terms before selling anything built on it** |

CC BY 4.0 allows commercial use, which is why charging for the **app**, and the SRD content inside it, is permitted. It does **not** cover anything outside the SRD, and it does **not** grant any trademark rights.

## What we may sell

See the table in [Content policy](../content/content-policy.md). In short: **original content, licensed content, our own art and tools**. Never content from outside the SRD: most subclasses beyond the SRD's, many spells, most iconic monsters.

The earlier idea of a paid tier with pre-loaded content from the full core rulebooks is **dropped** (D3). Research on 2026-11-03 found no official third-party route to sell that content; the only route would be a direct business deal with the publisher. Users may type in content they own through the Custom Content Manager, but we don't ship or sell it. What we charge for is our own work: sync, storage, session tools, original packs and art (see the [Revenue model](../business/revenue-model.md)).

**Sources checked 2026-11-03 (verify again before launch):**
- CC BY 4.0 allows commercial use. Attribution is the only condition, and the publisher states it cannot revoke or change the release.
- The publisher's separate fan-content policy bars charging for content. It does **not** apply to what we ship under CC BY, but it is a reason not to lean on it for anything else.
- The older open licence (1.0a) applies only to the previous SRD. It is irrelevant to us.
- A pack that is original, or entered by the user, is outside all of the above.

## The required attribution (copied verbatim from the official SRD 5.2.1 PDF, 2026-11-03)

Source: `SRD_CC_v5.2.1.pdf`, from the publisher's SRD page, legal notice. The licence asks that this statement appear "in any of your work":

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The same notice says:
- Do **not** add any other attribution to the publisher, its parent or affiliates.
- You **may** say the work is "compatible with fifth edition" or "5E compatible".

Where it lives: `game_systems.attribution` (seed, generated from `scripts/seed/build-seed.ts`; the system version is now `5.2.1`). Use the same text, unchanged, in the About / Licences screen and the store listing.

Notes:
- **Our call:** the code was written against "SRD 5.2" and the seed said 5.2. We now cite 5.2.1, the current release, because the statement should name the document it comes from. Confirm the rules data matches 5.2.1 (it is a corrections release) before launch.
- **Existing databases:** the seed inserts with `on conflict do nothing`, so a database that already has the old row keeps the old text. Update that row by hand (or with a migration) on any hosted database.
- The official link spells the licence URL ending `legalcode`; the PDF hyphenates it across a line break, which is not part of the address.

## Trademark check on "Session Zero" (2026-11-03, web search only, not a legal clearance)

Run with web search and the App Store search API. The official USPTO database (TESS/Trademark Search) could not be queried from here, so **this is a first pass, not a clearance**.

| Finding | Detail | Risk |
|---|---|---|
| **THE SESSION ZERO SYSTEM** | Filed 2024-01-11 by Mythic Grove Productions LLC, serial 98352984. One directory lists it registered (reg. no. 7640275, 2025-01-07) in class 28 (games and toys), another still shows a pending application for role-playing and tabletop games. It is a physical product (a card deck and art book). | **Medium.** Same words, same hobby, but a different product type and a longer mark. Check the official record, and consider how far "SESSION ZERO" alone reaches. |
| **Session Zero Labs** | A free web GM toolkit on itch.io (NPC creator, recap writer, encounter balancer, loot tables). No trademark filing found. | **Medium.** Closest in purpose and a plausible search-result neighbour. Unregistered use can still create rights. |
| **Other uses** | Several small itch.io guides, toolkits and workbooks, and a licensed-partner page at a games publisher, all called "Session Zero" something. None found as a registered mark for software. | Low to medium. The phrase is ordinary hobby vocabulary, so it is a **weak mark** and hard for anyone to own broadly. That cuts both ways: easy to use, hard to protect. |
| **App Store** | No app named Session Zero (US search). A note-taking app for sessions turned up in related searches but has a different name. | Low |
| **Classes 9 and 41** | No "Session Zero" registration found for software or entertainment services. Web search cannot prove there is none. | Unknown until the official search is run. |

**What this means:** nothing found blocks the name, but it is a crowded, descriptive phrase, so we get little protection and some confusion risk. Keep the shortlist (Long Rest, Hearthroll) ready. **Before the store launch:** run the official USPTO search (word mark "SESSION ZERO", classes 9, 41 and 28, live and dead), check the domain and social handles, and get a trademark lawyer's view on the Mythic Grove mark. Consider a distinctive logo and a longer, more ownable store title such as "Session Zero: Characters and Campaigns" (no game trademarks in it).

## Things to fix or confirm

1. **Show the attribution.** The attribution text exists in the database, but the app code doesn't display it anywhere I could find. CC BY requires it. **Action:** add an "About / Licences" screen (reachable from the account drawer) that shows each system's attribution and licence link, and put it in the store listing too. Do this **before** any public launch, not just before charging.
2. **The app's name.** **Done: the app is now called Session Zero** (`app.json`, the sign-in, sign-up and sign-out screens, `package.json`). The name, icon, subtitle and keywords must never include the game's trademarked names, the core rulebook titles, or any publisher logo (the stores check this, guideline 5.2.1). **Action still open:** run a trademark search on "Session Zero" (App Store, domains, the trademark register) before the store launch.
3. **Compatibility statements.** The SRD's own legal text allows saying the app is "compatible with fifth edition" or "5E compatible". Use it in the description only, never in the title. Do not add any attribution to the publisher beyond the required notice, and do not imply endorsement. **Verify the exact wording against the official SRD PDF.** Don't use anyone's logos.
4. **Original content that looks too close.** Names, creature designs and fiction must be our own. Reviewing a pack against the SRD-only boundary is a step in the [pack pipeline](../content/pack-pipeline.md).
5. **Daggerheart.** Read its licence for commercial use, attribution wording and the required notices.
6. **Third-party licences** (for example the ORC licence for other publishers' work). Read the exact terms; they differ on commercial use, derivatives and credit.
7. **Open-source dependencies.** Keep a list and check their licences are compatible with a commercial app (most are; confirm).
8. **Fonts and art in the app already.** The app uses several Google fonts and its own art. Confirm each licence allows commercial use and keep a record.

## Content we create

- Original content: we own what we write (or have it written under a work-for-hire or licence agreement).
- Commissioned art: see [Artist commissioning](../content/artist-commissioning.md) for the rights terms.
- User-entered homebrew: users keep their own content. Our terms of service should say what licence we need from them to store and display it for them. **Needs drafting.**

## Takedowns

Have a way for rights holders to reach us (a contact address in the app and store listing) and a process: see "Takedowns and mistakes" in [Content policy](../content/content-policy.md).

## Questions for a lawyer

- Does "Session Zero" clear a trademark search for software and games?
- Is a one-line "independent project, not affiliated with the publisher" disclaimer wise or unnecessary?
- Exactly what attribution and wording does our use of the SRD 5.2 need, in the app and in store listings?
- What can we say about compatibility without implying endorsement?
- Is our pack boundary (SRD + original + licensed) safe, and what's the safe way to write original subclasses that are "inspired" by the genre?
- What should our terms of service and licence for user content say?
