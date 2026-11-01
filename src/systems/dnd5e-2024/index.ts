import type { ContentKindDef, GameSystem } from '../types'
import { dnd5eBuilder } from './builder'
import { DND_CONDITIONS, DND_CONTENT_KIND_META, DND_RESOURCES, DND_STATS } from './definition'
import { derived, rest } from './rules'
import { ProficienciesSection } from './sheet/ProficienciesSection'
import { dnd5eContentSchemas, dnd5eDetailsSchema, dnd5eResourcesSchema, dnd5eStatsSchema } from './schemas'

const contentKinds: Record<string, ContentKindDef> = Object.fromEntries(
  Object.entries(DND_CONTENT_KIND_META).map(([kind, meta]) => [
    kind,
    { ...meta, schema: dnd5eContentSchemas[kind as keyof typeof dnd5eContentSchemas] },
  ]),
)

export const dnd5e2024: GameSystem = {
  id: 'dnd5e-2024',
  name: 'D&D 5e (2024)',
  stats: DND_STATS,
  resources: DND_RESOURCES,
  conditions: DND_CONDITIONS,
  contentKinds,
  schemas: { stats: dnd5eStatsSchema, resources: dnd5eResourcesSchema, details: dnd5eDetailsSchema },
  builder: dnd5eBuilder,
  rules: { derived, rest },
  sheet: { sections: { proficiencies: ProficienciesSection } },
}
