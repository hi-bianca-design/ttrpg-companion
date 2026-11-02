# Content policy

**Status:** Decided (what may be sold, D3). Proposed (AI-art stance, D9, and the credit policy).

## What may go in a pack

| Source | Allowed? | Notes |
|---|---|---|
| **SRD 5.2 material** (CC BY 4.0) | Yes, and it's already free in the app | We must keep the required attribution. See [Content licensing](../legal/content-licensing.md) |
| **Original content** written for us | Yes | Original names, fiction and mechanics. Our rules text, written in our own words |
| **Licensed third-party content** | Yes, with a written licence | For example a publisher's content licensed to us, or content under an open licence such as the ORC licence. Check the exact terms before building on it |
| **Content the user enters themselves** (homebrew) | Yes, it's theirs | This is what the Custom Content Manager is for; we don't sell it |
| **Non-SRD Wizards of the Coast content** (most PHB subclasses, many spells, most iconic monsters) | **No** | Their copyright. Selling it risks removal from the stores |
| **Content from other publishers without a licence** | **No** | |
| **Another game's content** | Only if its licence allows commercial use. **Verify** | Daggerheart content is under its own community licence; read its terms before selling anything built on it |

## Naming and trademark

- Don't use Wizards of the Coast product names, logos or distinctive monster names that aren't in the SRD (for example the iconic ones that were left out of it).
- Describe compatibility factually where the licence allows it; don't imply endorsement.
- See the open question about the app's own name in [Legal: content licensing](../legal/content-licensing.md).

## Quality bar

- Content validates against the system schema before it is published.
- Playtested at a table at least once. A pack that's unbalanced or confusing is a refund waiting to happen.
- Text reads cleanly, passes a spelling and clarity check, and follows the app's voice.
- Accessible: art has descriptive alt text where the platform allows.

## Art stance (Proposed)

**Paid packs use art commissioned from human artists. We don't sell AI-generated art.**

Reasons: much of the TTRPG audience and the artist community feel strongly about it; commissioned art is a visible selling point; and unclear authorship creates rights risk. The artist agreement includes a written warranty that the work is original and not generated (see [Artist commissioning](artist-commissioning.md)).

If this changes, say so openly in the pack description and in the decision log. Hiding it is worse than either policy.

## Crediting

- Every pack records the artist credit (`packs.artist_credit`), and the shop shows "Art by …".
- If an artist wants a link, add one; if they want no credit, honour it.
- Writers and playtesters are credited in the pack notes.

## Takedowns and mistakes

If someone says a pack contains their work or a trademark:
1. Unpublish the pack immediately (`published = false`), which hides it from the shop. Existing owners keep what's on their sheets under the lapse rule; decide whether to pull it from them too.
2. Investigate with the artist's contract and source files.
3. Fix or remove, and refund affected buyers.
4. Add what we learned to this document.

## Open questions

- Do we host user-made homebrew sharing or a marketplace for it? Out of scope for now; selling other people's content raises licensing, moderation and payout questions.
- Do we accept community pack submissions? If so, review, rights checks and revenue split need a process first.
