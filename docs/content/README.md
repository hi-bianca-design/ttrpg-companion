# Content and art

What we put in the app, what we sell, and who makes it.

## What's here

- [Pack pipeline](pack-pipeline.md): from concept to published pack, with a QA checklist
- [Artist commissioning](artist-commissioning.md): briefs, contracts, rights, payment models
- [Content policy](content-policy.md): what may go in a pack, the AI-art stance, crediting

## Where the content itself lives

- The free SRD data is seeded from `supabase/seed/<system>/*.json` by `scripts/seed/build-seed.ts` (`npm run db:seed`), which writes `supabase/seed.sql`.
- Pack content is rows in `content` with a `pack_id`, listed through the `packs` table. See [Entitlements architecture](../engineering/entitlements-architecture.md).

## Still to write

- [ ] **Pack tracker**: one line per pack: concept, cost, artists, rights, release date, sales
- [ ] **Artist roster**: who we've worked with or approached, their rates, and how to reach them
- [ ] **Contract template**: our standard commission agreement (have it reviewed first)
- [ ] **Art direction**: the visual style new art must match
- [ ] **Writing style guide**: voice for rules text and flavour text, and how to write original content that doesn't borrow from non-SRD sources
- [ ] **Source and rights log**: for every non-SRD piece in the app, where it came from and the licence
- [ ] **SRD import notes**: how the seed data was extracted and how to update it
