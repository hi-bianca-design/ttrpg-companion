// D&D 5e (2024) character builder: step declarations. Draft lifecycle lives in draft.ts.
import type { BuilderStepDef, GameSystem } from '../types'
import {
  abilitiesAssigned, bonusesComplete, classSkillCount, classSkillsComplete, equipmentComplete, hasSlots, initialDraft, pruneDraft, spellsWithinLimits, str, strList, toCharacter,
} from './draft'
import { AbilityScoresStep } from './steps/AbilityScoresStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { ClassSkillsStep } from './steps/ClassSkillsStep'
import { ClassStep } from './steps/ClassStep'
import { DetailsStep } from './steps/DetailsStep'
import { OriginStep } from './steps/OriginStep'
import { PersonalityStep } from './steps/PersonalityStep'
import { ReviewStep } from './steps/ReviewStep'
import { SpellsStep } from './steps/SpellsStep'

export { initialDraft, pruneDraft, toCharacter }

const steps: BuilderStepDef[] = [
  { id: 'class', title: 'Class', component: ClassStep, isComplete: (d) => !!d.class_id },
  { id: 'origin', title: 'Origin', component: OriginStep, isComplete: (d) => !!d.species_id && !!d.background_id },
  {
    id: 'skills', title: 'Skills', component: ClassSkillsStep,
    isComplete: classSkillsComplete, skip: (d) => classSkillCount(d) === 0,
  },
  {
    id: 'equipment', title: 'Equipment', component: EquipmentStep,
    isComplete: equipmentComplete, skip: (d) => strList(d.class_equipment_options).length === 0,
  },
  {
    id: 'ability-scores', title: 'Ability Scores', component: AbilityScoresStep,
    isComplete: (d) => abilitiesAssigned(d) && bonusesComplete(d),
  },
  { id: 'spells', title: 'Spells', component: SpellsStep, isComplete: spellsWithinLimits, skip: (d) => !hasSlots(d) },
  { id: 'details', title: 'Details', component: DetailsStep, isComplete: (d) => str(d.name).trim().length > 0 },
  { id: 'personality', title: 'Personality', component: PersonalityStep, isComplete: () => true },
  { id: 'review', title: 'Review', component: ReviewStep, isComplete: () => true },
]

export const dnd5eBuilder: GameSystem['builder'] = { steps, initialDraft, pruneDraft, toCharacter }
