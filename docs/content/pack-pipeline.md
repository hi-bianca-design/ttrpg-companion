# Pack pipeline

**Status:** Proposed. No pack has been made yet. The database side exists (see [Entitlements architecture](../engineering/entitlements-architecture.md)); the process side is described here.

## What a pack is

A row in `packs` (name, slug, description, `kind`, optional `system_id`, `artist_credit`, `cover_url`, `store_product_id`, `published`) plus the content rows that belong to it (`content.pack_id`). Three kinds exist in the schema:

| Kind | Contents | Dependency |
|---|---|---|
| `content` | Official-style rows: subclasses, monsters, items, spells, feats | None, works today |
| `art` | Portraits, tokens, frames | Needs [art storage](../engineering/art-storage-and-delivery.md) |
| `theme` | A palette definition | Needs the [theme provider](../design/themes-and-cosmetics.md) |

The first real pack should be a **`content` pack with a small amount of art** or a **small art pack**, with a single clear audience. That is the cheapest way to learn whether anyone pays.

## Stages

```
1 Concept → 2 Rules and writing → 3 Art brief → 4 Commission → 5 Integrate → 6 QA → 7 Publish → 8 Support
```

1. **Concept.** One sentence: who is it for, and what gap does it fill? ("Six cinder-themed subclasses and the monsters that go with them.") Check [Content policy](content-policy.md) before spending anything.
2. **Rules and writing.** Write content in the app's own data shape. It must validate against the system's schema (the same Zod schemas used for homebrew). Original names and fiction. No third-party product identity (see [Content licensing](../legal/content-licensing.md)).
3. **Art brief.** For each piece: purpose, size, mood, references (originals only), deliverables, deadline. See [Artist commissioning](artist-commissioning.md).
4. **Commission.** Contract with usage rights *before* work starts.
5. **Integrate.** Content rows with `pack_id` set and `owner_id` null. Art uploaded to the private bucket. A pack row, unpublished.
6. **QA.** See the checklist below.
7. **Publish.** Set `published = true`. Create the store product and link `store_product_id`.
8. **Support.** Fix bugs, handle refunds, collect feedback.

## QA checklist

- [ ] Every content row validates against its kind's schema.
- [ ] No text copied from non-SRD sources; no third-party product names or trademarked monsters.
- [ ] Every piece of art has a signed rights agreement on file and an artist credit entry.
- [ ] A user with no entitlement cannot see the content (RLS) and a user with one can.
- [ ] A user whose entitlement has lapsed keeps content already on a sheet and cannot add new ones.
- [ ] The pack displays correctly in the shop with its cover, description and credit.
- [ ] A character can use each piece of content end to end (build or edit a character, equip, level up if relevant).
- [ ] Contrast and accessibility checks pass for any visual element.
- [ ] Price, store product and pack row all match.
- [ ] The pack's **production cost** is recorded, so [revenue](../business/revenue-model.md) can be compared with it.

## Keeping a record

For each pack, keep a short record in this folder (`docs/strategy/`) or a pack tracker: concept, cost, artists, rights, release date, sales. The aim is to make the third pack faster than the first, and to know which packs earned their cost.

## Seasons (later)

If DM Pro includes "one pack per season", plan a rolling calendar: commissions start two to three months before release. Only promise a cadence you can keep. A missed season is worse than not promising one.
