import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen } from '@testing-library/react-native'
import ActionsTab from '../../../../app/(app)/characters/[id]/actions'
import type { CharacterFull } from '@/features/characters/characters.api'
import { useCharacter, useResourceMutation } from '@/features/characters/characters.queries'
import type { SlotsValue } from '@/systems/types'

jest.mock('@/features/characters/characters.queries', () => ({
  useCharacter: jest.fn(),
  useResourceMutation: jest.fn(),
}))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'ch1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))
jest.mock('@/components/game/ScreenBackground', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const mockMutate = jest.fn()

const content = (kind: string, name: string, data: Record<string, unknown>) => ({
  id: `c-${name}`, kind, name, data, slug: name, system_id: 'dnd5e-2024',
}) as never

const spell = (name: string, level: number, casting_time = 'Action') => ({
  content_id: `c-${name}`, character_id: 'ch1', kind: 'spell', state: {}, acquired_at_level: 1,
  content: content('spell', name, { level, casting_time, school: 'Evocation', range: '60 feet', components: 'V, S', duration: 'Instantaneous', classes: ['wizard'] }),
}) as never

function character(slots: SlotsValue, extra: Partial<CharacterFull> = {}): CharacterFull {
  return {
    id: 'ch1', system_id: 'dnd5e-2024', name: 'Mira', level: 3, stats: {}, conditions: [], details: {},
    resources: { hp: { current: 5, max: 20, temp: 0 }, spell_slots: slots },
    owner_id: 'u', notes: null, portrait_url: null, derived: [],
    picks: [
      { content_id: 'c-wiz', kind: 'class', state: {}, acquired_at_level: 1, content: content('class', 'Wizard', {}) },
      spell('Magic Missile', 1), spell('Fire Bolt', 0), spell('Shield', 1, 'Reaction'), spell('Misty Step', 2, 'Bonus Action'),
    ] as never,
    items: [{ content_id: 'c-staff', equipped: true, attuned: false, content: content('item', 'Quarterstaff', { category: 'Simple Melee Weapon', properties: { damage: '1d6', damage_type: 'Bludgeoning' } }) }] as never,
    ...extra,
  } as CharacterFull
}

const slots = (t1: number, t2 = 0): SlotsValue => ({ tiers: { '1': { max: 2, used: t1 }, '2': { max: 1, used: t2 } } })

function setup(c: CharacterFull | null, state: Record<string, unknown> = {}) {
  ;(useCharacter as jest.Mock).mockReturnValue({ data: c ?? undefined, isLoading: false, isError: false, refetch: jest.fn(), ...state })
  return render(<><ActionsTab /><PortalHost /></>)
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useResourceMutation as jest.Mock).mockReturnValue({ mutate: mockMutate })
})

test('Use on a level-1 spell spends tier 1 when available', () => {
  setup(character(slots(0)))
  fireEvent.press(screen.getByRole('button', { name: 'Use Magic Missile' }))
  const change = mockMutate.mock.calls[0][0]
  expect(change.key).toBe('spell_slots')
  expect(change.apply(slots(0)).tiers['1'].used).toBe(1)
})

test('Use on a level-1 spell with tier 1 exhausted spends tier 2', () => {
  setup(character(slots(2)))
  fireEvent.press(screen.getByRole('button', { name: 'Use Magic Missile' }))
  const next = mockMutate.mock.calls[0][0].apply(slots(2)) as SlotsValue
  expect(next.tiers['1'].used).toBe(2)
  expect(next.tiers['2'].used).toBe(1)
})

test('Use is disabled with an explanatory caption when no tier has slots', () => {
  setup(character(slots(2, 1)))
  const use = screen.getByRole('button', { name: 'Use Magic Missile' })
  expect(use).toBeDisabled()
  expect(screen.getByText('No spell slots left for Magic Missile.')).toBeTruthy()
})

test('cantrips have no Use action', () => {
  setup(character(slots(0)))
  expect(screen.getByText('Fire Bolt')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Use Fire Bolt' })).toBeNull()
})

test('segments split by casting time; equipped weapons are actions', () => {
  setup(character(slots(0)))
  expect(screen.getByText('Quarterstaff')).toBeTruthy()
  expect(screen.queryByText('Shield')).toBeNull()
  fireEvent.press(screen.getByRole('tab', { name: 'Bonus' }))
  expect(screen.getByText('Misty Step')).toBeTruthy()
  fireEvent.press(screen.getByRole('tab', { name: 'Reactions' }))
  expect(screen.getByText('Shield')).toBeTruthy()
})

test('weapons are listed before spells, spells by level', () => {
  setup(character(slots(0)))
  const titles = ['Quarterstaff', 'Fire Bolt', 'Magic Missile'].map((t) => screen.toJSON() && JSON.stringify(screen.toJSON()).indexOf(t))
  expect(titles[0]).toBeLessThan(titles[1])
  expect(titles[1]).toBeLessThan(titles[2])
})

test('pips restore and spend per tier', () => {
  setup(character(slots(2)))
  fireEvent.press(screen.getByRole('button', { name: 'Restore Level 1' }))
  expect(mockMutate.mock.calls[0][0].apply(slots(2)).tiers['1'].used).toBe(1)
  fireEvent.press(screen.getByRole('button', { name: 'Spend Level 2' }))
  expect(mockMutate.mock.calls[1][0].apply(slots(2)).tiers['2'].used).toBe(1)
})

test('long rest confirms, then resets every tier to 0 and refills hp', () => {
  setup(character(slots(2, 1)))
  fireEvent.press(screen.getByRole('button', { name: 'Long rest' }))
  expect(mockMutate).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Confirm long rest' }))
  const byKey = Object.fromEntries(mockMutate.mock.calls.map(([c]) => [c.key, c]))
  const next = byKey.spell_slots.apply(slots(2, 1)) as SlotsValue
  expect(next.tiers['1'].used).toBe(0)
  expect(next.tiers['2'].used).toBe(0)
  expect(byKey.hp.apply({ current: 5, max: 20, temp: 0 })).toEqual({ current: 20, max: 20, temp: 0 })
})

test('cancel leaves resources untouched', () => {
  setup(character(slots(2, 1)))
  fireEvent.press(screen.getByRole('button', { name: 'Short rest' }))
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockMutate).not.toHaveBeenCalled()
})

test('mutation failure surfaces a caption', () => {
  mockMutate.mockImplementation((_c, opts) => opts?.onError?.(new Error('Network down')))
  setup(character(slots(0)))
  fireEvent.press(screen.getByRole('button', { name: 'Use Magic Missile' }))
  expect(screen.getByText('Network down')).toBeTruthy()
})

test('error state offers Try again', () => {
  const refetch = jest.fn()
  setup(null, { isError: true, refetch })
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()
})
