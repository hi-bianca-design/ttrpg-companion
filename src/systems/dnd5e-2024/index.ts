import type { ContentKindDef, GameSystem } from '../types'
import { dnd5eBuilder } from './builder'
import { DND_CONDITIONS, DND_CONTENT_KIND_META, DND_RESOURCES, DND_STATS } from './definition'
import { derived, levelUp, MAX_LEVEL, rest } from './rules'
import { LanguagesSection } from './sheet/LanguagesSection'
import { SpellcastingSection } from './sheet/SpellcastingSection'
import { LevelUpSection } from './sheet/LevelUpSection'
import { ProficienciesSection } from './sheet/ProficienciesSection'
import { ProfileSection } from './sheet/ProfileSection'
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
  maxLevel: MAX_LEVEL,
  stats: DND_STATS,
  resources: DND_RESOURCES,
  conditions: DND_CONDITIONS,
  contentKinds,
  schemas: { stats: dnd5eStatsSchema, resources: dnd5eResourcesSchema, details: dnd5eDetailsSchema },
  builder: dnd5eBuilder,
  rules: { derived, rest, levelUp, maxAttuned: 3 },
  sheet: { sections: { proficiencies: ProficienciesSection, profile: ProfileSection, languages: LanguagesSection, spellcasting: SpellcastingSection, levelUp: LevelUpSection } },
}
