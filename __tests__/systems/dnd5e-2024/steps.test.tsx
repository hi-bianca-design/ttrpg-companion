import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import BuilderStepScreen from '../../../app/(app)/characters/new/[step]'
import { useBuilderStore } from '@/features/characters/builder/builder.store'
import { WizardProgress } from '@/features/characters/builder/WizardProgress'
import { createCharacter } from '@/features/characters/characters.api'
import { listContent } from '@/features/content/content.api'
import { AbilityScoresStep } from '@/systems/dnd5e-2024/steps/AbilityScoresStep'
import { OriginStep } from '@/systems/dnd5e-2024/steps/OriginStep'
import { ClassStep } from '@/systems/dnd5e-2024/steps/ClassStep'
import { filterSpells, SpellsStep } from '@/systems/dnd5e-2024/steps/SpellsStep'
import type { Draft } from '@/systems/types'

jest.mock('@/features/content/content.api', () => ({ listContent: jest.fn() }))
jest.mock('@/features/session', () => ({ currentUserId: jest.fn(async () => 'me') }))
jest.mock('@/features/characters/characters.api', () => ({ createCharacter: jest.fn() }))
const mockParams: { step: string } = { step: 'review' }
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn() }
const mockRedirect = jest.fn()
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  Redirect: (props: { href: string }) => { mockRedirect(props.href); return null },
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
  background: [
    row('background', 'sage', 'Sage', { skill_proficiencies: ['arcana'], ability_score_options: { abilities: ['constitution', 'intelligence', 'wisdom'] } }),
    row('background', 'hb', 'Wanderer', { skill_proficiencies: ['survival'], ability_score_options: {} }),
  ],
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
  const client = makeTestQueryClient()
  client.setQueryData(['session', 'uid'], 'me') // the signed-in user, as useCurrentUserId caches it
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

/** Renders a step bound to the real builder store, the way [step].tsx does. */
function Bound({ Step }: { Step: (props: { draft: Draft; update(patch: Partial<Draft>): void }) => ReactElement }) {
  const draft = useBuilderStore((s) => s.draft)
  const update = useBuilderStore((s) => s.update)
  return <Step draft={draft} update={update} />
}

const completeWizard: Draft = {
  class_id: 'wiz', class_name: 'Wizard', hit_die: 6, species_id: 'elf', background_id: 'sage',
  strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10,
  bg_abilities: ['constitution', 'intelligence', 'wisdom'], bg_bonus_two: 'intelligence', bg_bonus_one: 'constitution', name: 'Mira',
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

describe('Review create', () => {
  beforeEach(() => { mockParams.step = 'review' })

  test('after creating, leaves the wizard (dismiss to the list, push the sheet) and resets the store without redirecting', async () => {
    ;(createCharacter as jest.Mock).mockResolvedValue('new-id')
    act(() => useBuilderStore.getState().update(completeWizard))
    renderWithQuery(<BuilderStepScreen />)
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4))
    fireEvent.press(screen.getByRole('button', { name: 'Create character' }))
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/(app)/characters/new-id'))
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/(app)/characters')
    expect(mockRouter.dismissTo.mock.invocationCallOrder[0]).toBeLessThan(mockRouter.push.mock.invocationCallOrder[0])
    expect(useBuilderStore.getState().systemId).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe('Origin step', () => {
  test('choosing a background caches its eligible ability list', async () => {
    renderWithQuery(<Bound Step={OriginStep} />)
    fireEvent.press(await screen.findByRole('button', { name: 'Sage' }))
    expect(useBuilderStore.getState().draft).toMatchObject({ background_id: 'sage', bg_abilities: ['constitution', 'intelligence', 'wisdom'] })
  })

  test('builder lists use the pickable scope (no sheet-only homebrew of fellow members)', async () => {
    renderWithQuery(<Bound Step={OriginStep} />)
    await screen.findByRole('button', { name: 'Sage' })
    for (const [arg] of mockList.mock.calls) expect(arg).toMatchObject({ scope: 'pickable' })
  })

  test('the Homebrew badge marks only my own rows, not a campaign row someone else owns', async () => {
    mockList.mockImplementation(async ({ kind }: { kind: string }) => kind === 'background'
      ? [
          { ...CONTENT.background[1] as object, owner_id: 'me' },
          { ...row('background', 'camp-bg', 'Guild Runner', { skill_proficiencies: ['insight'], ability_score_options: {} }), owner_id: 'gm', campaign_id: 'camp' },
        ]
      : CONTENT[kind] ?? [])
    renderWithQuery(<Bound Step={OriginStep} />)
    await screen.findByRole('button', { name: 'Guild Runner' })
    await waitFor(() => expect(screen.getAllByText('Homebrew')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Wanderer' })).toHaveTextContent(/Homebrew/)
    expect(screen.getByRole('button', { name: 'Guild Runner' })).not.toHaveTextContent(/Homebrew/)
  })
})

describe('Ability scores step', () => {
  test('assigning a value used by another ability swaps the two', async () => {
    act(() => useBuilderStore.getState().update({ intelligence: 15, strength: 14 }))
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    fireEvent.press(screen.getByRole('button', { name: 'Strength, 14' }))
    fireEvent.press(screen.getByRole('button', { name: '15 for Strength' }))
    expect(useBuilderStore.getState().draft).toMatchObject({ strength: 15, intelligence: 14 })
    await act(async () => {})
  })

  test('a background with no ability options shows a caption instead of bonus chips', async () => {
    act(() => useBuilderStore.getState().update({ background_id: 'hb', bg_abilities: [] }))
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    expect(await screen.findByText('Wanderer grants no ability score bonuses.')).toBeTruthy()
    expect(screen.queryByText('+2')).toBeNull()
    await act(async () => {})
  })
})

describe('Spells step at the limit', () => {
  test('unselected cards of a full category are disabled; selected ones stay enabled', async () => {
    act(() => useBuilderStore.getState().update({ class_id: 'wiz', class_name: 'Wizard', level: 1 }))
    renderWithQuery(<Bound Step={SpellsStep} />)
    await screen.findByText('Fire Bolt')
    for (const name of ['Fire Bolt', 'Light', 'Mage Hand']) fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
    expect(screen.getByRole('button', { name: /^Ray of Frost/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Fire Bolt/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^Detect Magic/ })).toBeEnabled()
  })
})

describe('wizard header Cancel', () => {
  test('step 1 has only Back (Back already leaves the wizard)', () => {
    mockParams.step = 'class'
    renderWithQuery(<BuilderStepScreen />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  test('from step 2 a trailing ghost Cancel dismisses the whole wizard (the discard guard prompts once)', () => {
    mockParams.step = 'origin'
    renderWithQuery(<BuilderStepScreen />)
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel.props.className).toContain('bg-transparent')
    expect(cancel.props.className).toContain('-mr-3')
    fireEvent.press(cancel)
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/(app)/characters')
  })
})
