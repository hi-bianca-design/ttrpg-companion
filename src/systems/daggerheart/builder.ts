// Daggerheart character builder: step declarations. Draft lifecycle lives in draft.ts.
import type { BuilderStepDef, GameSystem } from '../types'
import { canCreate, initialDraft, pruneDraft, str, strList, toCharacter, traitsSet } from './draft'
import { ClassStep } from './steps/ClassStep'
import { DetailsStep } from './steps/DetailsStep'
import { DomainCardsStep } from './steps/DomainCardsStep'
import { HeritageStep } from './steps/HeritageStep'
import { ReviewStep } from './steps/ReviewStep'
import { TraitsStep } from './steps/TraitsStep'
import { VitalsStep } from './steps/VitalsStep'

const has = (v: unknown) => str(v).trim() !== ''

const steps: BuilderStepDef[] = [
  { id: 'heritage', title: 'Heritage', component: HeritageStep, isComplete: (d) => has(d.ancestry) && has(d.community) },
  { id: 'class', title: 'Class', component: ClassStep, isComplete: (d) => has(d.class_name) },
  { id: 'traits', title: 'Traits', component: TraitsStep, isComplete: traitsSet },
  { id: 'domain-cards', title: 'Domain cards', component: DomainCardsStep, isComplete: (d) => strList(d.domain_cards).some(has) },
  { id: 'vitals', title: 'Vitals', component: VitalsStep, isComplete: () => true },
  { id: 'details', title: 'Details', component: DetailsStep, isComplete: (d) => has(d.name) },
  { id: 'review', title: 'Review', component: ReviewStep, isComplete: () => true },
]

export const daggerheartBuilder: GameSystem['builder'] = { steps, initialDraft, pruneDraft, toCharacter, canCreate }
