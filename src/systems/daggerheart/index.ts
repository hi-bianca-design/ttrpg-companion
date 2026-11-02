import type { ContentKindDef, GameSystem } from '../types'
import { daggerheartBuilder } from './builder'
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

// Thin system: no content seed or sheet sections and inert rules; the builder records typed text.
export const daggerheart: GameSystem = {
  id: 'daggerheart',
  name: 'Daggerheart',
  stats: DH_STATS,
  resources: DH_RESOURCES,
  conditions: [],
  contentKinds,
  schemas: { stats: daggerheartStatsSchema, resources: daggerheartResourcesSchema, details: daggerheartDetailsSchema },
  builder: daggerheartBuilder,
  rules: {
    derived: () => [],
    rest: (c) => ({ ...c.resources }),
  },
}
