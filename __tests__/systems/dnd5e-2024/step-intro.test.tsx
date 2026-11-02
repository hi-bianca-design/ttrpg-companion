import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { listContent } from '@/features/content/content.api'
import { StepIntro } from '@/systems/dnd5e-2024/steps/shared'
import { AbilityScoresStep } from '@/systems/dnd5e-2024/steps/AbilityScoresStep'
import { ClassFeaturesStep } from '@/systems/dnd5e-2024/steps/ClassFeaturesStep'
import { DetailsStep } from '@/systems/dnd5e-2024/steps/DetailsStep'
import { EquipmentStep } from '@/systems/dnd5e-2024/steps/EquipmentStep'
import { PersonalityStep } from '@/systems/dnd5e-2024/steps/PersonalityStep'
import { SpellsStep } from '@/systems/dnd5e-2024/steps/SpellsStep'
import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import type { Draft } from '@/systems/types'

jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn(async () => []) }))
jest.mock('@/features/session', () => ({ currentUserId: jest.fn(async () => 'me') }))

const mockList = listContent as jest.Mock

test('a step introduction reads as narrative text under a display title', () => {
  render(<StepIntro title="Ability scores" description="Tap an ability, then pick a value." />)
  expect(screen.getByText('Tap an ability, then pick a value.').props.className).toContain('font-narrative')
  expect(screen.getByText('Ability scores').props.className).toContain('font-display')
})

function renderStep(Step: (props: { draft: Draft; update(patch: Partial<Draft>): void }) => ReactElement, draft: Draft = {}) {
  const client = makeTestQueryClient()
  client.setQueryData(['session', 'uid'], 'me')
  return render(<QueryClientProvider client={client}><Step draft={draft} update={() => {}} /></QueryClientProvider>)
}

describe('step intros tell a first-timer the step is optional', () => {
  beforeEach(() => mockList.mockImplementation(async () => []))

  const fighter: Draft = { class_name: 'Fighter', class_features: ['Fighting Style'] }
  const cases: Array<[string, Parameters<typeof renderStep>[0], Draft]> = [
    ['Ability scores', AbilityScoresStep, {}],
    ['Class features', ClassFeaturesStep, fighter],
    ['Spells', SpellsStep, { class_name: 'Wizard', level: 1 }],
    ['Equipment', EquipmentStep, { class_name: 'Fighter', class_equipment_options: ['A: Longsword (10 GP)'] }],
    ['Equipment with no starting options', EquipmentStep, { class_name: 'Fighter' }],
    ['Personality', PersonalityStep, {}],
  ]

  test.each(cases)('%s says it can be skipped', (_name, Step, draft) => {
    renderStep(Step, draft)
    expect(screen.getByText(/skip this and come back/i)).toBeTruthy()
  })

  test('Equipment describes choosing a start only when the class has options', () => {
    renderStep(EquipmentStep, { class_name: 'Fighter', class_equipment_options: ['A: Longsword (10 GP)'] })
    expect(screen.getByText(/choose how Fighter begins/i)).toBeTruthy()
  })

  test('Equipment without options asks for the gear the character carries', () => {
    renderStep(EquipmentStep, { class_name: 'Fighter' })
    expect(screen.queryByText(/choose how/i)).toBeNull()
    expect(screen.getByText(/add the gear your character carries/i)).toBeTruthy()
  })

  test('Details intro and Name caption agree: a name is needed to create, but the step can be skipped', () => {
    renderStep(DetailsStep, {})
    expect(screen.getByText(/add a name to create your character/i)).toBeTruthy()
    expect(screen.getByText(/skip this for now and come back/i)).toBeTruthy()
    expect(screen.getByText('Required to create')).toBeTruthy()
    expect(screen.queryByText('Required')).toBeNull()
  })

  test('Details never blocks Continue: the builder step only marks completeness', () => {
    const details = dnd5eBuilder.steps.find((s) => s.id === 'details')!
    expect(details.skip).toBeUndefined()
    expect(details.isComplete({})).toBe(false) // an unmet name is shown as incomplete, not enforced by the step
  })
})
