import type { ContentKindDef, GameSystem } from '../types'
import { DH_CONTENT_KIND_META, DH_RESOURCES, DH_STATS } from './definition'
import {
  daggerheartContentSchemas, daggerheartDetailsSchema, daggerheartResourcesSchema, daggerheartStatsSchema,
} from './schemas'

const contentKinds: Record<string, ContentKindDef> = Object.fromEntries(
  Object.entries(DH_CONTENT_KIND_META).map(([kind, meta]) => [
    kind,
    { ...meta, schema: daggerheartContentSchemas[kind as keyof typeof daggerheartContentSchemas] },
  ]),
)

// Deliberately minimal stub: no content seed, no screens, inert rules, empty builder.
export const daggerheart: GameSystem = {
  id: 'daggerheart',
  name: 'Daggerheart',
  hidden: true,
  stats: DH_STATS,
  resources: DH_RESOURCES,
  conditions: [],
  contentKinds,
  schemas: { stats: daggerheartStatsSchema, resources: daggerheartResourcesSchema, details: daggerheartDetailsSchema },
  builder: {
    steps: [],
    initialDraft: () => ({}),
    pruneDraft: (draft, changed) => ({ ...draft, ...changed }),
    canCreate: () => false, // until the Daggerheart builder lands
    toCharacter: () => {
      throw new Error('Daggerheart character builder is not implemented')
    },
  },
  rules: {
    derived: () => [],
    rest: (c) => ({ ...c.resources }),
  },
}
