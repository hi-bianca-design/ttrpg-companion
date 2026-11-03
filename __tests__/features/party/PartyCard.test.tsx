import '@testing-library/jest-native/extend-expect'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { PartyCard } from '@/features/party/PartyCard'
import { toCharacterFull, type CharacterFull } from '@/features/characters/characters.api'

// A card must never write: every characters hook is auto-mocked and checked at the end.
jest.mock('@/features/characters/characters.queries')
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), auth: { getSession: jest.fn() } } }))
import * as characterQueries from '@/features/characters/characters.queries'

const resources = {
  hp: { current: 8, max: 12, temp: 4 },
  spell_slots: { tiers: {} },
  hit_dice: { current: 1, max: 1 },
  death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
  death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
}
const stats = { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 }

function character(over: Record<string, unknown> = {}): CharacterFull {
  return toCharacterFull({
    id: 'c1', owner_id: 'u1', system_id: 'dnd5e-2024', name: 'Mira', level: 3, stats, resources,
    conditions: ['poisoned'], details: {}, notes: null, portrait_url: null,
    character_picks: [
      { character_id: 'c1', content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { id: 'cls', name: 'Rogue', kind: 'class', data: {} } },
    ],
    character_items: [
      {
        id: 'it1', character_id: 'c1', content_id: 'arm', quantity: 1, equipped: true, attuned: false, notes: null,
        content: { id: 'arm', name: 'Chain Shirt', kind: 'item', data: { properties: { armor_class: '13 + Dex modifier (max 2)' } } },
      },
    ],
    ...over,
  } as never)
}

beforeEach(() => jest.clearAllMocks())

test('shows name, class and level, hit points, conditions and the glance chips', () => {
  render(<PartyCard character={character()} />)
  expect(screen.getByText('Mira')).toBeTruthy()
  expect(screen.getByText('Rogue · Level 3')).toBeTruthy()
  expect(screen.getByText('8/12 +4')).toBeTruthy()
  expect(screen.getByText('poisoned')).toBeTruthy()
  expect(screen.getByText('AC 15')).toBeTruthy()
  expect(screen.getByText('Passive 10')).toBeTruthy()
  expect(screen.getByText('Speed 30')).toBeTruthy()
})

test('tapping the card reveals the extra details, and tapping again hides them', () => {
  render(<PartyCard character={character({ details: { inspiration: true } })} />)
  expect(screen.queryByText('Insight 10')).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Mira details' }))
  expect(screen.getByText('Insight 10')).toBeTruthy()
  expect(screen.getByText('Investigation 10')).toBeTruthy()
  expect(screen.getByText('Inspiration Inspired')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Mira details' })).toHaveAccessibilityState({ expanded: true })
  fireEvent.press(screen.getByRole('button', { name: 'Mira details' }))
  expect(screen.queryByText('Insight 10')).toBeNull()
})

test('a system without a party summary still shows name, hit points and conditions', () => {
  const generic = {
    id: 'g1', system_id: 'daggerheart', name: 'Sable', level: 1, stats: {}, resources: { hp: { current: 5, max: 6 } },
    conditions: ['vulnerable'], details: {}, owner_id: 'u2', notes: null, portrait_url: null, picks: [], items: [], derived: [],
  } as unknown as CharacterFull
  render(<PartyCard character={generic} />)
  expect(screen.getByText('Sable')).toBeTruthy()
  expect(screen.getByText('5/6')).toBeTruthy()
  expect(screen.getByText('vulnerable')).toBeTruthy()
  expect(screen.queryByText(/^AC /)).toBeNull()
})

test('a very long name stays on one line', () => {
  const name = 'Archibald Bartholomew Fitzwilliam-Montgomery the Third'
  render(<PartyCard character={character({ name })} />)
  expect(screen.getByText(name).props.numberOfLines).toBe(1)
})

test('the card never writes a character', () => {
  render(<PartyCard character={character()} />)
  fireEvent.press(screen.getByRole('button', { name: 'Mira details' }))
  fireEvent.press(screen.getByRole('button', { name: 'Mira details' }))
  const hooks = Object.values(characterQueries).filter((v): v is jest.Mock => jest.isMockFunction(v))
  expect(hooks.length).toBeGreaterThan(0)
  expect(hooks.every((h) => h.mock.calls.length === 0)).toBe(true)
})
