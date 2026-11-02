# Content licensing

**Status:** Decided (what we will and won't sell, D3). Several items below are **open questions that need real legal review**.

> This document is a working summary by a builder, **not legal advice.** Before charging money, have a lawyer who knows games, IP and app stores read this and the licences themselves.

## What we use today

| Source | Licence | Used for | Our obligations |
|---|---|---|---|
| **D&D 5e 2024 SRD (version 5.2)** | CC BY 4.0 | The free base content of the app | Give attribution as the licence requires: credit the source, link the licence, state changes. The attribution text is stored in `game_systems.attribution` |
| **Daggerheart SRD 1.0** | The publisher's community gaming licence | A second game system in the codebase | Follow that licence's rules on attribution, branding and monetisation. **Verify its commercial terms before selling anything built on it** |

CC BY 4.0 allows commercial use, which is why charging for the **app**, and the SRD content inside it, is permitted. It does **not** cover anything outside the SRD, and it does **not** grant any trademark rights.

## What we may sell

See the table in [Content policy](content-policy.md). In short: **original content, licensed content, our own art and tools**. Never non-SRD Wizards of the Coast content: most subclasses beyond the SRD's, many spells, most iconic monsters.

The earlier idea of a paid tier with "pre-loaded full PHB content" is **dropped** (D3). Users may type in content they own through the Custom Content Manager, but we don't ship or sell it.

## Things to fix or confirm

1. **Show the attribution.** The attribution text exists in the database, but the app code doesn't display it anywhere I could find. CC BY requires it. **Action:** add an "About / Licences" screen (reachable from the account drawer) that shows each system's attribution and licence link, and put it in the store listing too. Do this **before** any public launch, not just before charging.
2. **The app's name.** The app is currently called "DnD Companion" / "D&D Companion" (in `app.json` and on the sign-in and sign-out screens). "Dungeons & Dragons" and "D&D" are Wizards of the Coast trademarks, and the SRD licence doesn't grant their use as a name. A commercial app with it in the name is a risk (a store removal or a takedown request). **Action:** get advice; plan for a rename before the store launch. Choose a name that doesn't include their marks, and say "compatible with the 5e SRD" factually where allowed.
3. **Compatibility statements.** Understand exactly what wording the SRD licence and Wizards' published guidance allow. Don't use their logos.
4. **Original content that looks too close.** Names, creature designs and fiction must be our own. Reviewing a pack against the SRD-only boundary is a step in the [pack pipeline](pack-pipeline.md).
5. **Daggerheart.** Read its licence for commercial use, attribution wording and the required notices.
6. **Third-party licences** (for example the ORC licence for other publishers' work). Read the exact terms; they differ on commercial use, derivatives and credit.
7. **Open-source dependencies.** Keep a list and check their licences are compatible with a commercial app (most are; confirm).
8. **Fonts and art in the app already.** The app uses several Google fonts and its own art. Confirm each licence allows commercial use and keep a record.

## Content we create

- Original content: we own what we write (or have it written under a work-for-hire or licence agreement).
- Commissioned art: see [Artist commissioning](artist-commissioning.md) for the rights terms.
- User-entered homebrew: users keep their own content. Our terms of service should say what licence we need from them to store and display it for them. **Needs drafting.**

## Takedowns

Have a way for rights holders to reach us (a contact address in the app and store listing) and a process: see "Takedowns and mistakes" in [Content policy](content-policy.md).

## Questions for a lawyer

- Can the app keep "D&D" anywhere in its name or subtitle?
- Exactly what attribution and wording does our use of the SRD 5.2 need, in the app and in store listings?
- What can we say about compatibility without implying endorsement?
- Is our pack boundary (SRD + original + licensed) safe, and what's the safe way to write original subclasses that are "inspired" by the genre?
- What should our terms of service and licence for user content say?
