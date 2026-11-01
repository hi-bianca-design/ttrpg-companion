import '@testing-library/jest-native/extend-expect'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import BuilderStepScreen from '../../../app/(app)/characters/new/[step]'
import { useBuilderStore } from '@/features/characters/builder/builder.store'
import { WizardProgress } from '@/features/characters/builder/WizardProgress'
import { listContent } from '@/features/content/content.api'
import { ClassStep } from '@/systems/dnd5e-2024/steps/ClassStep'
import { filterSpells, SpellsStep } from '@/systems/dnd5e-2024/steps/SpellsStep'
import type { Draft } from '@/systems/types'

jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn() }))
jest.mock('@/features/characters/characters.api', () => ({ createCharacter: jest.fn() }))
const mockParams: { step: string } = { step: 'review' }
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
  Redirect: () => null,
}))
jest.mock('@/components/game', () => ({
  ...jest.requireActual('@/components/game'),
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const mockList = listContent as jest.Mock

function row(kind: string, id: string, name: string, data: unknown, parent_id: string | null = null) {
  return { id, kind, name, slug: id, data, parent_id, summary: null, description: null, owner_id: null, campaign_id: null, system_id: 'dnd5e-2024' }
}

const spell = (id: string, name: string, level: number, classes: string[], extra: Record<string, unknown> = {}) =>
  row('spell', id, name, {
    level, school: 'Evocation', casting_time: 'Action', range: '60 feet', components: 'V, S',
    duration: 'Instantaneous', classes, is_ritual: false, requires_concentration: false, ...extra,
  })

const CONTENT: Record<string, unknown[]> = {
  class: [
    row('class', 'wiz', 'Wizard', { hit_die: 6, primary_abilities: ['intelligence'], saving_throw_proficiencies: ['intelligence', 'wisdom'] }),
    row('class', 'ftr', 'Fighter', { hit_die: 10, primary_abilities: ['strength'], saving_throw_proficiencies: ['strength', 'constitution'] }),
  ],
  subclass: [],
  species: [],
  background: [],
  spell: [
    spell('fire-bolt', 'Fire Bolt', 0, ['sorcerer', 'wizard']),
    spell('light', 'Light', 0, ['wizard', 'cleric']),
    spell('mage-hand', 'Mage Hand', 0, ['wizard']),
    spell('ray-of-frost', 'Ray of Frost', 0, ['wizard']),
    spell('detect-magic', 'Detect Magic', 1, ['wizard'], { is_ritual: true, requires_concentration: true }),
    spell('cure-wounds', 'Cure Wounds', 1, ['cleric']),
    spell('fireball', 'Fireball', 3, ['wizard']),
  ],
}

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

/** Renders a step bound to the real builder store, the way [step].tsx does. */
function Bound({ Step }: { Step: typeof ClassStep }) {
  const draft = useBuilderStore((s) => s.draft)
  const update = useBuilderStore((s) => s.update)
  return <Step draft={draft} update={update} />
}

const completeWizard: Draft = {
  class_id: 'wiz', class_name: 'Wizard', hit_die: 6, species_id: 'elf', background_id: 'sage',
  strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10,
  bg_bonus_two: 'intelligence', bg_bonus_one: 'constitution', name: 'Mira',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockImplementation(async ({ kind }: { kind: string }) => CONTENT[kind] ?? [])
  useBuilderStore.getState().start('dnd5e-2024')
})

describe('WizardProgress', () => {
  test('shows the step title and "Step X of N"', () => {
    render(<WizardProgress title="Spells" index={3} total={7} />)
    expect(screen.getByText('Spells')).toBeTruthy()
    expect(screen.getByText('Step 4 of 7')).toBeTruthy()
  })
})

describe('Review step', () => {
  beforeEach(() => { mockParams.step = 'review' })

  test('"Create character" is disabled until every step is complete', async () => {
    renderWithQuery(<BuilderStepScreen />)
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4))
    const create = await screen.findByRole('button', { name: 'Create character' })
    expect(create).toBeDisabled()

    act(() => useBuilderStore.getState().update({ ...completeWizard, name: '' }))
    expect(screen.getByRole('button', { name: 'Create character' })).toBeDisabled()

    act(() => useBuilderStore.getState().update({ name: 'Mira' }))
    expect(screen.getByRole('button', { name: 'Create character' })).toBeEnabled()
    await act(async () => {})
  })

  test('lists incomplete steps in the checklist', async () => {
    act(() => useBuilderStore.getState().update({ ...completeWizard, name: '' }))
    renderWithQuery(<BuilderStepScreen />)
    expect(await screen.findByRole('button', { name: 'Details, incomplete' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Class, incomplete' })).toBeNull()
    await act(async () => {})
  })
})

describe('Class step', () => {
  test('selecting a class patches class_name and hit_die together with class_id', async () => {
    renderWithQuery(<Bound Step={ClassStep} />)
    fireEvent.press(await screen.findByRole('button', { name: /^Wizard/ }))
    expect(useBuilderStore.getState().draft).toMatchObject({ class_id: 'wiz', class_name: 'Wizard', hit_die: 6 })
  })
})

describe('Spells step', () => {
  beforeEach(() => act(() => useBuilderStore.getState().update({ class_id: 'wiz', class_name: 'Wizard', level: 1 })))

  test('filterSpells matches names case-insensitively', () => {
    const spells = [{ name: 'Fire Bolt' }, { name: 'Light' }, { name: 'Fireball' }]
    expect(filterSpells(spells, 'FIRE').map((s) => s.name)).toEqual(['Fire Bolt', 'Fireball'])
    expect(filterSpells(spells, '  light ').map((s) => s.name)).toEqual(['Light'])
    expect(filterSpells(spells, '')).toHaveLength(3)
  })

  test('search filters the list by name, case-insensitively', async () => {
    renderWithQuery(<Bound Step={SpellsStep} />)
    expect(await screen.findByText('Light')).toBeTruthy()
    fireEvent.changeText(screen.getByPlaceholderText('Search spells'), 'fIrE')
    expect(screen.getByText('Fire Bolt')).toBeTruthy()
    expect(screen.queryByText('Light')).toBeNull()
  })

  test('lists only class spells up to the max spell level and shows Ritual/Concentration badges', async () => {
    renderWithQuery(<Bound Step={SpellsStep} />)
    expect(await screen.findByText('Detect Magic')).toBeTruthy()
    expect(screen.getByText('Ritual')).toBeTruthy()
    expect(screen.getByText('Concentration')).toBeTruthy()
    expect(screen.queryByText('Cure Wounds')).toBeNull()
    expect(screen.queryByText('Fireball')).toBeNull()
  })

  test('caches spell_classes in the draft and enforces the cantrip limit', async () => {
    renderWithQuery(<Bound Step={SpellsStep} />)
    await screen.findByText('Fire Bolt')
    await waitFor(() => expect(useBuilderStore.getState().draft.spell_classes).toMatchObject({ 'fire-bolt': ['sorcerer', 'wizard'] }))

    for (const name of ['Fire Bolt', 'Light', 'Mage Hand', 'Ray of Frost']) fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
    expect(useBuilderStore.getState().draft.spell_ids).toEqual(['fire-bolt', 'light', 'mage-hand'])
  })
})
