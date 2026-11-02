// D&D 5e (2024) character builder: step declarations. Draft lifecycle lives in draft.ts.
import type { BuilderStepDef, Draft, GameSystem } from '../types'
import {
  abilitiesFilled, bonusesComplete, canCreate, classChoices, classSkillCount, classSkillsComplete, equipmentComplete, hasSlots, initialDraft, pruneDraft, spellsWithinLimits, str, strList, toCharacter,
} from './draft'
import { classChoicesFor } from './classChoices'
import { AbilityScoresStep } from './steps/AbilityScoresStep'
import { ClassFeaturesStep } from './steps/ClassFeaturesStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { ClassSkillsStep } from './steps/ClassSkillsStep'
import { ClassStep } from './steps/ClassStep'
import { DetailsStep } from './steps/DetailsStep'
import { OriginStep } from './steps/OriginStep'
import { PersonalityStep } from './steps/PersonalityStep'
import { ReviewStep } from './steps/ReviewStep'
import { SpellsStep } from './steps/SpellsStep'

export { initialDraft, pruneDraft, toCharacter }

/** Every class choice holds its count of non-empty values. */
function classFeaturesComplete(d: Draft): boolean {
  const chosen = classChoices(d)
  return classChoicesFor(str(d.class_name), strList(d.class_features))
    .every((c) => (chosen[c.key] ?? []).filter((v) => v.trim() !== '').length >= c.count)
}

const steps: BuilderStepDef[] = [
  { id: 'class', title: 'Class', component: ClassStep, isComplete: (d) => !!d.class_id },
  { id: 'origin', title: 'Origin', component: OriginStep, isComplete: (d) => !!d.species_id && !!d.background_id },
  {
    id: 'skills', title: 'Skills', component: ClassSkillsStep,
    isComplete: classSkillsComplete, skip: (d) => classSkillCount(d) === 0,
  },
  {
    id: 'equipment', title: 'Equipment', component: EquipmentStep,
    isComplete: equipmentComplete,
  },
  {
    id: 'ability-scores', title: 'Ability Scores', component: AbilityScoresStep,
    isComplete: abilitiesFilled,
  },
  {
    id: 'class-features', title: 'Class features', component: ClassFeaturesStep,
    isComplete: classFeaturesComplete, skip: (d) => classChoicesFor(str(d.class_name), strList(d.class_features)).length === 0,
  },
  { id: 'spells', title: 'Spells', component: SpellsStep, isComplete: spellsWithinLimits, skip: (d) => !hasSlots(d) },
  { id: 'details', title: 'Details', component: DetailsStep, isComplete: (d) => str(d.name).trim().length > 0 },
  { id: 'personality', title: 'Personality', component: PersonalityStep, isComplete: () => true },
  { id: 'review', title: 'Review', component: ReviewStep, isComplete: () => true },
]

export const dnd5eBuilder: GameSystem['builder'] = { steps, initialDraft, pruneDraft, toCharacter, canCreate }
