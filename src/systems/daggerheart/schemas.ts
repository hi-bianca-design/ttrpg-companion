// Zod schemas for the JSON shapes Daggerheart stores in the generic columns:
// characters.stats/resources/details, content.data and character_picks.state.
import { z } from 'zod'
import { HOPE_MAX, TRAIT_KEYS } from './definition'

const int = z.number().int()
const nonNegInt = int.min(0)

const slotsSchema = z.object({
  tiers: z.record(z.string(), z.object({ max: nonNegInt, used: nonNegInt })),
})

const trait = int.min(-5).max(8)
export const daggerheartStatsSchema = z.object(
  Object.fromEntries(TRAIT_KEYS.map((k) => [k, trait])) as Record<typeof TRAIT_KEYS[number], typeof trait>,
)

export const daggerheartResourcesSchema = z.object({
  hp: slotsSchema,
  stress: slotsSchema,
  armor: slotsSchema,
  hope: z.object({ current: nonNegInt, max: nonNegInt.max(HOPE_MAX) }),
})

// Heritage, class and domain cards are typed text until Daggerheart content is seeded.
export const daggerheartDetailsSchema = z.object({
  evasion: int.optional(),
  experiences: z.array(z.string()).optional(),
  ancestry: z.string().optional(),
  community: z.string().optional(),
  class_name: z.string().optional(),
  subclass_name: z.string().optional(),
  domain_cards: z.array(z.string()).optional(),
  backstory: z.string().optional(),
})

export const daggerheartPickStateSchema = z.object({ location: z.enum(['loadout', 'vault']) })

export const daggerheartContentSchemas = {
  ancestry: z.object({}).passthrough(),
  community: z.object({}).passthrough(),
  class: z.object({}).passthrough(),
  subclass: z.object({}).passthrough(),
  domain_card: z.object({
    domain: z.string(),
    level: int.min(1),
    recall_cost: nonNegInt,
    type: z.enum(['ability', 'spell', 'grimoire']),
    text: z.string(),
  }),
}
