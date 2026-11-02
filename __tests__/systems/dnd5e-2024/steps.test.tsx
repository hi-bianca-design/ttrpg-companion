import '@testing-library/jest-native/extend-expect'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../../helpers/queryClient'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import BuilderStepScreen from '../../../app/(app)/characters/new/[step]'
import { useBuilderStore, visibleSteps } from '@/features/characters/builder/builder.store'
import { OpenChoiceField } from '@/features/characters/builder/OpenChoiceField'
import { dnd5eBuilder } from '@/systems/dnd5e-2024/builder'
import { WizardProgress } from '@/features/characters/builder/WizardProgress'
import { createCharacter } from '@/features/characters/characters.api'
import { listContent } from '@/features/content/content.api'
import { abilitiesFilled } from '@/systems/dnd5e-2024/draft'
import { AbilityScoresStep } from '@/systems/dnd5e-2024/steps/AbilityScoresStep'
import { OriginStep } from '@/systems/dnd5e-2024/steps/OriginStep'
import { ClassFeaturesStep } from '@/systems/dnd5e-2024/steps/ClassFeaturesStep'
import { EquipmentStep } from '@/systems/dnd5e-2024/steps/EquipmentStep'
import { ClassSkillsStep } from '@/systems/dnd5e-2024/steps/ClassSkillsStep'
import { ClassStep } from '@/systems/dnd5e-2024/steps/ClassStep'
import { ReviewStep } from '@/systems/dnd5e-2024/steps/ReviewStep'
import { getSystem } from '@/systems/registry'
import { filterSpells, SpellsStep } from '@/systems/dnd5e-2024/steps/SpellsStep'
import type { Draft } from '@/systems/types'
import { variantOf } from '../../helpers/button'

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
    spell('guidance', 'Guidance', 0, ['cleric']),
    spell('sacred-flame', 'Sacred Flame', 0, ['cleric']),
    spell('thaumaturgy', 'Thaumaturgy', 0, ['cleric']),
    spell('spare-the-dying', 'Spare the Dying', 0, ['cleric']),
    spell('fireball', 'Fireball', 3, ['wizard']),
  ],
  feat: [
    row('feat', 'defense', 'Defense', { prerequisites: { feature: 'Fighting Style' }, benefits: '+1 AC in armor.' }),
    row('feat', 'archery', 'Archery', { prerequisites: { feature: 'Fighting Style' }, benefits: '+2 to ranged attack rolls.' }),
    row('feat', 'alert', 'Alert', { prerequisites: {}, benefits: 'Initiative proficiency.' }),
  ],
  item: [
    row('item', 'longsword', 'Longsword', { category: 'Martial Melee Weapon', properties: { mastery: 'Sap', weapon_properties: ['Versatile'] } }),
    row('item', 'shortbow', 'Shortbow', { category: 'Simple Ranged Weapon', properties: { mastery: 'Vex', weapon_properties: ['Ammunition'] } }),
    row('item', 'rope', 'Rope', { category: 'Adventuring Gear', properties: {} }),
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
    expect(screen.getByText('Step 4 of 7 · Spells')).toBeTruthy()
  })
})

describe('Review step', () => {
  beforeEach(() => { mockParams.step = 'review' })

  test('"Create character" is disabled until the draft has a class and a name', async () => {
    renderWithQuery(<BuilderStepScreen />)
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4))
    const create = await screen.findByRole('button', { name: 'Create character' })
    expect(create).toBeDisabled()
    expect(screen.getByText('Choose a class and add a name to create your character.')).toBeTruthy()

    act(() => useBuilderStore.getState().update({ class_id: 'wiz', class_name: 'Wizard', hit_die: 6 }))
    expect(screen.getByRole('button', { name: 'Create character' })).toBeDisabled()

    act(() => useBuilderStore.getState().update({ name: 'Mira' }))
    expect(screen.getByRole('button', { name: 'Create character' })).toBeEnabled()
    expect(screen.queryByText('Choose a class and add a name to create your character.')).toBeNull()
    await act(async () => {})
  })

  test('lists class choices and typed own-items before Create', async () => {
    act(() => useBuilderStore.getState().update({ ...completeWizard, class_id: 'ftr', class_name: 'Fighter', hit_die: 10 }))
    // a class change clears its choices, so they are set after the class
    act(() => useBuilderStore.getState().update({
      class_choices: { fighting_style: ['Pike and Shield'], weapon_mastery: ['Longsword', 'Handaxe'], expertise: [] },
      equipment_custom: ['Lucky coin', 'Map of Neverwinter'],
    }))
    renderWithQuery(<BuilderStepScreen />)
    expect(await screen.findByText('Class features')).toBeTruthy()
    expect(screen.getByText('Fighting Style')).toBeTruthy()
    expect(screen.getByText('Pike and Shield')).toBeTruthy()
    expect(screen.getByText('Longsword, Handaxe')).toBeTruthy()
    expect(screen.queryByText('Expertise')).toBeNull()
    expect(screen.getByText('Extra gear')).toBeTruthy()
    expect(screen.getByText('Lucky coin, Map of Neverwinter')).toBeTruthy()
    await act(async () => {})
  })

  test('omits Class features and Extra gear when empty', async () => {
    act(() => useBuilderStore.getState().update({ ...completeWizard }))
    renderWithQuery(<BuilderStepScreen />)
    await screen.findByText('Ability scores')
    expect(screen.queryByText('Class features')).toBeNull()
    expect(screen.queryByText('Extra gear')).toBeNull()
    await act(async () => {})
  })

  test('lists steps that are not filled in as skipped in the checklist', async () => {
    act(() => useBuilderStore.getState().update({ ...completeWizard, name: '' }))
    renderWithQuery(<BuilderStepScreen />)
    expect(await screen.findByRole('button', { name: 'Details, not filled in' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Class, not filled in' })).toBeNull()
    expect(screen.getAllByText('Skipped').length).toBeGreaterThan(0)
    await act(async () => {})
  })
})

describe('Class step', () => {
  test('Continue is enabled with nothing chosen', async () => {
    mockParams.step = 'class'
    renderWithQuery(<BuilderStepScreen />)
    const next = await screen.findByRole('button', { name: 'Continue' })
    expect(next.props.accessibilityState?.disabled).toBeFalsy()
    mockParams.step = 'review'
    await act(async () => {})
  })

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

describe('abilitiesFilled', () => {
  test('false with one null, true with six numbers outside the standard array', () => {
    const six = { strength: 16, dexterity: 8, constitution: 14, intelligence: 10, wisdom: 12, charisma: 18 }
    expect(abilitiesFilled({ ...six, charisma: null })).toBe(false)
    expect(abilitiesFilled(six)).toBe(true)
  })
})

describe('Ability scores step', () => {
  test('typing a score updates that ability', async () => {
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    fireEvent.changeText(screen.getByLabelText('Strength score'), '16')
    expect(useBuilderStore.getState().draft.strength).toBe(16)
    await act(async () => {})
  })

  test('scores clamp to 1 through 20', async () => {
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    fireEvent.changeText(screen.getByLabelText('Strength score'), '25')
    expect(useBuilderStore.getState().draft.strength).toBe(20)
    fireEvent.changeText(screen.getByLabelText('Strength score'), '0')
    expect(useBuilderStore.getState().draft.strength).toBe(1)
    await act(async () => {})
  })

  test('clearing the field sets the score to null', async () => {
    act(() => useBuilderStore.getState().update({ strength: 12 }))
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    fireEvent.changeText(screen.getByLabelText('Strength score'), '')
    expect(useBuilderStore.getState().draft.strength).toBeNull()
    await act(async () => {})
  })

  test('"Use standard array" fills the six abilities in order', async () => {
    renderWithQuery(<Bound Step={AbilityScoresStep} />)
    fireEvent.press(screen.getByRole('button', { name: 'Use standard array' }))
    expect(useBuilderStore.getState().draft).toMatchObject({
      strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8,
    })
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

describe('Spells step with a cantrip-granting order', () => {
  const CLERIC_CANTRIPS = ['Light', 'Guidance', 'Sacred Flame', 'Thaumaturgy', 'Spare the Dying']
  const pickAll = () => { for (const name of CLERIC_CANTRIPS) fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) })) }

  test('without an order a level-1 Cleric is capped at 3 cantrips', async () => {
    act(() => useBuilderStore.getState().update({ class_id: 'clr', class_name: 'Cleric', level: 1 }))
    renderWithQuery(<Bound Step={SpellsStep} />)
    await screen.findByText('Guidance')
    expect(screen.getByText('Cantrips 0/3')).toBeTruthy()
    pickAll()
    expect(useBuilderStore.getState().draft.spell_ids).toHaveLength(3)
    expect(screen.getByText('Cantrips 3/3')).toBeTruthy()
  })

  test('Thaumaturge raises the cap by one, shown and enforced', async () => {
    act(() => useBuilderStore.getState().update({ class_id: 'clr', class_name: 'Cleric', level: 1 }))
    act(() => useBuilderStore.getState().update({ class_choices: { order: ['Thaumaturge'] } }))
    renderWithQuery(<Bound Step={SpellsStep} />)
    await screen.findByText('Guidance')
    expect(screen.getByText('Cantrips 0/4')).toBeTruthy()
    pickAll()
    expect(useBuilderStore.getState().draft.spell_ids).toEqual(['light', 'guidance', 'sacred-flame', 'thaumaturgy'])
    expect(screen.getByText('Cantrips 4/4')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Spare the Dying/ })).toBeDisabled()
    expect(screen.getByText('Cantrip limit reached. Deselect one to swap.')).toBeTruthy()
  })
})

describe('wizard header Cancel', () => {
  test('step 1 has only Back (Back already leaves the wizard)', () => {
    mockParams.step = 'class'
    renderWithQuery(<BuilderStepScreen />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  test('from step 2 a ghost X, level with the progress dots, dismisses the whole wizard (the discard guard prompts once)', () => {
    mockParams.step = 'origin'
    renderWithQuery(<BuilderStepScreen />)
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(variantOf(cancel)).toBe('ghost')
    expect(screen.queryByText('Cancel')).toBeNull()
    fireEvent.press(cancel)
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/(app)/characters')
  })
})

describe('Class skills step', () => {
  beforeEach(() => act(() => useBuilderStore.getState().update({
    class_id: 'ftr', class_name: 'Fighter', class_skill_count: 2,
    class_skill_options: ['acrobatics', 'athletics', 'history', 'perception'], bg_skills: ['athletics'],
  })))

  test('picks up to the class count, locks background skills and disables the rest once full', () => {
    renderWithQuery(<Bound Step={ClassSkillsStep} />)
    expect(screen.getByText('0/2 chosen')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Athletics' })).toBeDisabled()
    fireEvent.press(screen.getByRole('button', { name: 'History' }))
    fireEvent.press(screen.getByRole('button', { name: 'Perception' }))
    expect(useBuilderStore.getState().draft.class_skills).toEqual(['history', 'perception'])
    expect(screen.getByText('2/2 chosen')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Acrobatics' })).toBeDisabled()
    fireEvent.press(screen.getByRole('button', { name: 'History' }))
    expect(useBuilderStore.getState().draft.class_skills).toEqual(['perception'])
  })

  test('choosing a class caches its skill pick count and list on the draft', async () => {
    renderWithQuery(<Bound Step={ClassStep} />)
    fireEvent.press(await screen.findByRole('button', { name: /^Fighter/ }))
    expect(useBuilderStore.getState().draft).toMatchObject({ class_skill_count: expect.any(Number), class_skill_options: expect.any(Array) })
  })
})

describe('OpenChoiceField', () => {
  const setup = (values: string[], count = 2) => {
    const onChange = jest.fn()
    render(<OpenChoiceField label="Weapon Mastery" help="Pick weapons." count={count} values={values} suggestions={['Longsword', 'Shortbow']} onChange={onChange} />)
    return onChange
  }

  test('renders count inputs prefilled from values', () => {
    setup(['Pike'], 2)
    expect(screen.getByLabelText('Weapon Mastery 1').props.value).toBe('Pike')
    expect(screen.getByLabelText('Weapon Mastery 2').props.value).toBe('')
    expect(screen.getByText('Pick weapons.')).toBeTruthy()
  })

  test('a suggestion fills the first empty input', () => {
    const onChange = setup(['', 'Pike'])
    fireEvent.press(screen.getByRole('button', { name: 'Longsword' }))
    expect(onChange).toHaveBeenCalledWith(['Longsword', 'Pike'])
  })

  test('a chip matching a value (any case) is selected; tapping it clears that value', () => {
    const onChange = setup(['Pike', 'longsword '])
    const chip = screen.getByRole('button', { name: 'Longsword' })
    expect(chip.props.accessibilityState).toMatchObject({ selected: true })
    fireEvent.press(chip)
    expect(onChange).toHaveBeenCalledWith(['Pike'])
  })

  test('with every input full, a suggestion replaces the last value', () => {
    const onChange = setup(['Pike'], 1)
    fireEvent.press(screen.getByRole('button', { name: 'Shortbow' }))
    expect(onChange).toHaveBeenCalledWith(['Shortbow'])
  })
})

describe('Class features step', () => {
  const fighter: Draft = {
    class_id: 'ftr', class_name: 'Fighter', hit_die: 10,
    class_features: ['Fighting Style', 'Second Wind', 'Weapon Mastery'],
  }
  beforeEach(() => act(() => useBuilderStore.getState().update(fighter)))

  test('a Fighter sees Fighting Style (1 input) and Weapon Mastery (3 inputs)', async () => {
    renderWithQuery(<Bound Step={ClassFeaturesStep} />)
    expect(screen.getByText('Fighting Style')).toBeTruthy()
    expect(screen.getByText('Weapon Mastery')).toBeTruthy()
    expect(screen.getByLabelText('Fighting Style')).toBeTruthy()
    for (const i of [1, 2, 3]) expect(screen.getByLabelText(`Weapon Mastery ${i}`)).toBeTruthy()
    expect(screen.queryByLabelText('Weapon Mastery 4')).toBeNull()
    await act(async () => {})
  })

  test('suggestions: Fighting Style feats only, masterable weapons only', async () => {
    renderWithQuery(<Bound Step={ClassFeaturesStep} />)
    expect(await screen.findByRole('button', { name: 'Defense' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archery' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Alert' })).toBeNull()
    expect(await screen.findByRole('button', { name: 'Longsword' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Rope' })).toBeNull()
  })

  test('tapping "Defense" stores it next to the existing choices; tapping it again clears it', async () => {
    act(() => useBuilderStore.getState().update({ class_choices: { weapon_mastery: ['Longsword'] } }))
    const update = jest.fn((patch: Partial<Draft>) => useBuilderStore.getState().update(patch))
    function Spy() {
      const draft = useBuilderStore((s) => s.draft)
      return <ClassFeaturesStep draft={draft} update={update} />
    }
    renderWithQuery(<Spy />)
    fireEvent.press(await screen.findByRole('button', { name: 'Defense' }))
    expect(update).toHaveBeenLastCalledWith({ class_choices: { weapon_mastery: ['Longsword'], fighting_style: ['Defense'] } })
    fireEvent.press(screen.getByRole('button', { name: 'Defense' }))
    expect(useBuilderStore.getState().draft.class_choices).toEqual({ weapon_mastery: ['Longsword'], fighting_style: [] })
  })

  test('a typed value is stored as is', async () => {
    renderWithQuery(<Bound Step={ClassFeaturesStep} />)
    fireEvent.changeText(screen.getByLabelText('Fighting Style'), 'Pike and Shield')
    expect(useBuilderStore.getState().draft.class_choices).toMatchObject({ fighting_style: ['Pike and Shield'] })
    await act(async () => {})
  })

  test('the step is shown for a Fighter, hidden for a Wizard', () => {
    const ids = (d: Draft) => visibleSteps(dnd5eBuilder.steps, { ...dnd5eBuilder.initialDraft(), ...d }).map((s) => s.id)
    expect(ids(fighter)).toContain('class-features')
    expect(ids({ class_id: 'wiz', class_name: 'Wizard', class_features: ['Spellcasting', 'Ritual Adept', 'Arcane Recovery'] })).not.toContain('class-features')
  })

  test('isComplete once every choice has its count of non-empty values', () => {
    const step = dnd5eBuilder.steps.find((s) => s.id === 'class-features')!
    expect(step.isComplete({ ...fighter, class_choices: { fighting_style: ['Defense'], weapon_mastery: ['A', 'B'] } })).toBe(false)
    expect(step.isComplete({ ...fighter, class_choices: { fighting_style: ['Defense'], weapon_mastery: ['A', ' ', 'C'] } })).toBe(false)
    expect(step.isComplete({ ...fighter, class_choices: { fighting_style: ['Defense'], weapon_mastery: ['A', 'B', 'C'] } })).toBe(true)
  })

  test('Continue is enabled with every field empty', async () => {
    mockParams.step = 'class-features'
    renderWithQuery(<BuilderStepScreen />)
    const next = await screen.findByRole('button', { name: 'Continue' })
    expect(next.props.accessibilityState?.disabled).toBeFalsy()
    mockParams.step = 'review'
    await act(async () => {})
  })

  test('a Rogue gets Expertise suggestions from its proficient skills, a Cleric its order options with descriptions', async () => {
    act(() => useBuilderStore.getState().update({
      class_id: 'rog', class_name: 'Rogue', class_features: ['Expertise', 'Sneak Attack', 'Weapon Mastery'],
    }))
    act(() => useBuilderStore.getState().update({
      class_skill_options: ['stealth', 'sleight-of-hand', 'acrobatics'], class_skill_count: 2, class_skills: ['stealth', 'sleight-of-hand'], bg_skills: ['insight'],
    }))
    const { unmount } = renderWithQuery(<Bound Step={ClassFeaturesStep} />)
    for (const name of ['Stealth', 'Sleight of Hand', 'Insight']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Acrobatics' })).toBeNull()
    await act(async () => {})
    unmount()

    act(() => useBuilderStore.getState().update({ class_id: 'clr', class_name: 'Cleric', class_features: ['Spellcasting', 'Divine Order'] }))
    renderWithQuery(<Bound Step={ClassFeaturesStep} />)
    expect(screen.getByLabelText('Divine Order')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Thaumaturge' }))
    expect(useBuilderStore.getState().draft.class_choices).toEqual({ order: ['Thaumaturge'] })
    expect(screen.getByText(/Trained in martial weapons and heavy armor/)).toBeTruthy()
    await act(async () => {})
  })
})

describe('Equipment step: your own items', () => {
  const fighter = {
    class_id: 'ftr', class_name: 'Fighter',
    class_equipment_options: ["Option A: Longsword, Rope, 4 GP", 'Option C: 155 GP'],
  }
  beforeEach(() => act(() => useBuilderStore.getState().update(fighter)))
  const custom = () => useBuilderStore.getState().draft.equipment_custom

  test('typing an item and pressing "Add item" appends it and clears the input', async () => {
    renderWithQuery(<Bound Step={EquipmentStep} />)
    fireEvent.changeText(await screen.findByLabelText('Item name'), '  Rope, 50 ft ')
    fireEvent.press(screen.getByRole('button', { name: 'Add item' }))
    expect(custom()).toEqual(['Rope, 50 ft'])
    expect(screen.getByLabelText('Item name').props.value).toBe('')
    expect(screen.getByText('Rope, 50 ft')).toBeTruthy()
  })

  test('empty and duplicate entries are ignored', async () => {
    renderWithQuery(<Bound Step={EquipmentStep} />)
    const input = await screen.findByLabelText('Item name')
    fireEvent.press(screen.getByRole('button', { name: 'Add item' }))
    fireEvent.changeText(input, '   ')
    fireEvent.press(screen.getByRole('button', { name: 'Add item' }))
    expect(custom()).toEqual([])
    fireEvent.changeText(input, 'Lute')
    fireEvent.press(screen.getByRole('button', { name: 'Add item' }))
    fireEvent.changeText(input, ' Lute ')
    fireEvent.press(screen.getByRole('button', { name: 'Add item' }))
    expect(custom()).toEqual(['Lute'])
  })

  test('each entry has a remove button', async () => {
    act(() => useBuilderStore.getState().update({ equipment_custom: ['Lute', 'Rope'] }))
    renderWithQuery(<Bound Step={EquipmentStep} />)
    fireEvent.press(await screen.findByRole('button', { name: 'Remove Lute' }))
    expect(custom()).toEqual(['Rope'])
  })

  test('picking an official option keeps typed entries', async () => {
    act(() => useBuilderStore.getState().update({ equipment_custom: ['Lute'] }))
    renderWithQuery(<Bound Step={EquipmentStep} />)
    fireEvent.press(await screen.findByText('Option A'))
    const d = useBuilderStore.getState().draft
    expect(d.equipment_option).toBe(0)
    expect(d.equipment_custom).toEqual(['Lute'])
  })

  test('the section shows for a class with no starting options', async () => {
    act(() => useBuilderStore.getState().update({ class_equipment_options: [] }))
    renderWithQuery(<Bound Step={EquipmentStep} />)
    expect(await screen.findByLabelText('Item name')).toBeTruthy()
  })
})

describe('Make your own', () => {
  /** A step bound to the real store, with `update` spied so each call's patch can be checked. */
  function spied(Step: (props: { draft: Draft; update(patch: Partial<Draft>): void }) => ReactElement) {
    const update = jest.fn((patch: Partial<Draft>) => useBuilderStore.getState().update(patch))
    function Spy() {
      const draft = useBuilderStore((s) => s.draft)
      return <Step draft={draft} update={update} />
    }
    renderWithQuery(<Spy />)
    return update
  }
  const draft = () => useBuilderStore.getState().draft
  const steps = getSystem('dnd5e-2024').builder.steps
  const ids = (d: Draft) => visibleSteps(steps, { ...dnd5eBuilder.initialDraft(), ...d }).map((s) => s.id)

  describe('class', () => {
    test('the Class step lists "Make your own" after the classes', async () => {
      renderWithQuery(<Bound Step={ClassStep} />)
      await screen.findByRole('button', { name: /^Wizard/ })
      expect(screen.getByRole('button', { name: 'Make your own class' })).toHaveTextContent(/Make your own/)
    })

    test('saving a name-only class calls update once with the entry and the class cache', async () => {
      const update = spied(ClassStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ashen Knight')
      expect(update).not.toHaveBeenCalled()
      fireEvent.press(screen.getByLabelText('Save class'))
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][0]).toMatchObject({
        class_custom: { name: 'Ashen Knight', library: false },
        class_id: null, class_name: 'Ashen Knight', hit_die: 8, class_skill_count: 0, class_skill_options: [], class_features: [],
      })
      expect(screen.queryByLabelText('Class name')).toBeNull()
      const card = screen.getByRole('button', { name: 'Ashen Knight, custom class' })
      expect(card).toHaveTextContent(/Custom/)
      expect(card).toHaveTextContent(/Only for this character/)
    })

    test('a custom class with two skill picks caches the count and the options', async () => {
      const update = spied(ClassStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ashen Knight')
      fireEvent.changeText(screen.getByLabelText('Skills to choose'), '2')
      for (const k of ['athletics', 'history', 'stealth']) fireEvent.press(screen.getByRole('button', { name: k }))
      fireEvent.press(screen.getByRole('button', { name: 'Add to my homebrew library' }))
      fireEvent.press(screen.getByLabelText('Save class'))
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][0]).toMatchObject({ class_skill_count: 2, class_skill_options: ['athletics', 'history', 'stealth'] })
      expect(draft()).toMatchObject({ class_skill_count: 2, class_skill_options: ['athletics', 'history', 'stealth'] })
      expect(screen.getByRole('button', { name: 'Ashen Knight, custom class' })).toHaveTextContent(/Saved to your homebrew library/)
    })

    test('Edit prefills the form; Remove clears the entry and the class cache', async () => {
      const update = spied(ClassStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ashen Knight')
      fireEvent.changeText(screen.getByLabelText('Skills to choose'), '1')
      fireEvent.press(screen.getByRole('button', { name: 'athletics' }))
      fireEvent.press(screen.getByLabelText('Save class'))

      fireEvent.press(screen.getByRole('button', { name: 'Edit custom class' }))
      expect(screen.getByLabelText('Class name').props.value).toBe('Ashen Knight')
      expect(screen.getByLabelText('Skills to choose').props.value).toBe('1')
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ember Knight')
      fireEvent.press(screen.getByLabelText('Save class'))
      expect(update).toHaveBeenCalledTimes(2)
      expect(draft()).toMatchObject({ class_custom: { name: 'Ember Knight' }, class_name: 'Ember Knight' })

      fireEvent.press(screen.getByRole('button', { name: 'Remove custom class' }))
      expect(update).toHaveBeenCalledTimes(3)
      const fresh = dnd5eBuilder.initialDraft()
      expect(draft()).toMatchObject({
        class_custom: null, class_id: null, class_name: fresh.class_name, hit_die: fresh.hit_die,
        class_skill_count: 0, class_skill_options: [], class_features: [], class_equipment_options: [],
      })
      // Reopening after a remove starts empty (the form is remounted).
      fireEvent.press(screen.getByRole('button', { name: 'Make your own class' }))
      expect(screen.getByLabelText('Class name').props.value).toBe('')
    })

    test('Cancel closes the form without an update', async () => {
      const update = spied(ClassStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ashen Knight')
      fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
      expect(update).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('Class name')).toBeNull()
      fireEvent.press(screen.getByRole('button', { name: 'Make your own class' }))
      expect(screen.getByLabelText('Class name').props.value).toBe('')
    })

    test('the form warns about official class names', async () => {
      renderWithQuery(<Bound Step={ClassStep} />)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'wizard')
      expect(screen.getByText(/An official class has this name/)).toBeTruthy()
    })

    test('picking an official class after a custom one leaves class_custom null', async () => {
      renderWithQuery(<Bound Step={ClassStep} />)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own class' }))
      fireEvent.changeText(screen.getByLabelText('Class name'), 'Ashen Knight')
      fireEvent.press(screen.getByLabelText('Save class'))
      fireEvent.press(screen.getByRole('button', { name: /^Fighter/ }))
      expect(draft()).toMatchObject({ class_id: 'ftr', class_name: 'Fighter', hit_die: 10, class_custom: null })
      expect(screen.queryByRole('button', { name: 'Ashen Knight, custom class' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Make your own class' })).toBeTruthy()
    })

    test('a saved homebrew class shows the Homebrew badge', async () => {
      mockList.mockImplementation(async ({ kind }: { kind: string }) => kind === 'class'
        ? [...CONTENT.class, { ...row('class', 'hb-cls', 'Runeblade', { hit_die: 10, primary_abilities: [], saving_throw_proficiencies: [] }), owner_id: 'me' }]
        : CONTENT[kind] ?? [])
      renderWithQuery(<Bound Step={ClassStep} />)
      const card = await screen.findByRole('button', { name: /^Runeblade/ })
      await waitFor(() => expect(card).toHaveTextContent(/Homebrew/))
      expect(screen.getByRole('button', { name: /^Wizard/ })).not.toHaveTextContent(/Homebrew/)
    })

    test('the Skills step shows for a custom class with skill picks (its options) and is skipped without', () => {
      const withSkills = { class_custom: { name: 'Ashen Knight', description: '', library: false, extras: {} }, class_name: 'Ashen Knight', class_skill_count: 2, class_skill_options: ['athletics', 'history', 'stealth'], class_features: [] }
      expect(ids(withSkills)).toContain('skills')
      expect(ids({ ...withSkills, class_skill_count: 0, class_skill_options: [] })).not.toContain('skills')

      act(() => useBuilderStore.getState().update(withSkills))
      renderWithQuery(<Bound Step={ClassSkillsStep} />)
      expect(screen.getByText('Ashen Knight trains in 2 of these skills.')).toBeTruthy()
      for (const name of ['Athletics', 'History', 'Stealth']) expect(screen.getByRole('button', { name })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Arcana' })).toBeNull()
    })

    test('a custom class skips Class features and Spells', () => {
      const custom = { class_custom: { name: 'Ashen Knight', description: '', library: false, extras: {} }, class_name: 'Ashen Knight', class_features: [] }
      expect(ids(custom)).not.toContain('class-features')
      expect(ids(custom)).not.toContain('spells')
    })
  })

  describe('species', () => {
    test('save and remove', async () => {
      const update = spied(OriginStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own species' }))
      fireEvent.changeText(screen.getByLabelText('Species name'), 'Moonkin')
      fireEvent.press(screen.getByLabelText('Save species'))
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][0]).toEqual({ species_custom: { name: 'Moonkin', description: '', library: false, extras: {} }, species_id: null })
      expect(screen.getByRole('button', { name: 'Moonkin, custom species' })).toHaveTextContent(/Custom/)

      fireEvent.press(screen.getByRole('button', { name: 'Remove custom species' }))
      expect(update).toHaveBeenLastCalledWith({ species_custom: null })
      expect(draft().species_custom).toBeNull()
      expect(screen.getByRole('button', { name: 'Make your own species' })).toBeTruthy()
    })
  })

  describe('background', () => {
    test('save with two typed skills caches them; Remove clears them', async () => {
      const update = spied(OriginStep)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own background' }))
      fireEvent.changeText(screen.getByLabelText('Background name'), 'Lighthouse Keeper')
      for (const k of ['perception', 'survival']) fireEvent.press(screen.getByRole('button', { name: k }))
      fireEvent.press(screen.getByLabelText('Save background'))
      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][0]).toMatchObject({
        background_custom: { name: 'Lighthouse Keeper' }, background_id: null, bg_abilities: [], bg_skills: ['perception', 'survival'],
      })
      expect(draft()).toMatchObject({ bg_skills: ['perception', 'survival'], bg_abilities: [] })
      expect(screen.getByRole('button', { name: 'Lighthouse Keeper, custom background' })).toHaveTextContent(/Custom/)

      fireEvent.press(screen.getByRole('button', { name: 'Remove custom background' }))
      expect(update).toHaveBeenLastCalledWith({ background_custom: null, bg_abilities: [], bg_skills: [] })
      expect(draft()).toMatchObject({ background_custom: null, bg_skills: [], bg_abilities: [] })
    })

    test('picking an official background afterwards clears the custom one', async () => {
      renderWithQuery(<Bound Step={OriginStep} />)
      fireEvent.press(await screen.findByRole('button', { name: 'Make your own background' }))
      fireEvent.changeText(screen.getByLabelText('Background name'), 'Lighthouse Keeper')
      fireEvent.press(screen.getByLabelText('Save background'))
      fireEvent.press(screen.getByRole('button', { name: 'Sage' }))
      expect(draft()).toMatchObject({ background_id: 'sage', background_custom: null, bg_skills: ['arcana'] })
    })
  })

  test('Review shows the custom class, species and background names', async () => {
    act(() => useBuilderStore.getState().update({
      class_custom: { name: 'Ashen Knight', description: '', library: false, extras: {} },
      species_custom: { name: 'Moonkin', description: '', library: false, extras: { speed: 35 } },
      background_custom: { name: 'Lighthouse Keeper', description: '', library: true, extras: {} },
      name: 'Mira',
    }))
    renderWithQuery(<Bound Step={ReviewStep} />)
    expect(await screen.findByText('Level 1 Ashen Knight')).toBeTruthy()
    expect(screen.getByText('Moonkin')).toBeTruthy()
    expect(screen.getByText('Lighthouse Keeper')).toBeTruthy()
    expect(screen.getByText('35')).toBeTruthy()
    await act(async () => {})
  })
})
