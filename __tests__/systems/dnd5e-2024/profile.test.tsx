import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { getSystem } from '@/systems/registry'
import { derived } from '@/systems/dnd5e-2024/rules'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const ProfileSection = getSystem('dnd5e-2024').sheet!.sections!.profile

function character(details: Record<string, unknown>): CharacterRecord {
  return {
    id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level: 1, stats: {}, resources: {}, conditions: [], details,
  }
}

test('D&D registers a profile section', () => {
  expect(ProfileSection).toBeDefined()
})

test('shows only the profile fields that are set', () => {
  render(<ProfileSection character={character({
    alignment: 'Neutral Good', personality_trait: 'Always curious.', ideal: '', bond: 'My old mentor.',
    appearance: 'Silver hair.', backstory: 'Raised in a library.', xp: 10,
  })} picks={[]} />)
  expect(screen.getByText('Profile')).toBeTruthy()
  expect(screen.getByText('Neutral Good')).toBeTruthy()
  expect(screen.getByText('Always curious.')).toBeTruthy()
  expect(screen.getByText('My old mentor.')).toBeTruthy()
  expect(screen.getByText('Silver hair.')).toBeTruthy()
  expect(screen.getByText('Raised in a library.')).toBeTruthy()
  expect(screen.getByText('Personality trait')).toBeTruthy()
  expect(screen.queryByText('Ideal')).toBeNull()
  expect(screen.queryByText('Flaw')).toBeNull()
})

test('empty state when no profile fields are set', () => {
  render(<ProfileSection character={character({ alignment: '', backstory: '  ' })} picks={[]} />)
  expect(screen.getByText('No personality or backstory recorded yet.')).toBeTruthy()
})

test('backstory and personality values are narrative text', () => {
  render(<ProfileSection character={character({ backstory: 'Raised in a library.' })} picks={[]} />)
  expect(screen.getByText('Raised in a library.').props.className).toContain('font-narrative')
})

describe('class features block', () => {
  const fighter = (choices: Record<string, string[]> | undefined): PickRecord => ({
    content_id: 'class-Fighter', kind: 'class', state: choices ? { choices } : {}, acquired_at_level: 1, content: { name: 'Fighter', data: {} },
  })

  test('lists each non-empty class choice under its label', () => {
    render(<ProfileSection character={character({})} picks={[fighter({ fighting_style: ['Pike and Shield'], weapon_mastery: ['Longsword', 'Handaxe'], expertise: [] })]} />)
    expect(screen.getByText('Class features')).toBeTruthy()
    expect(screen.getByText('Fighting Style')).toBeTruthy()
    expect(screen.getByText('Pike and Shield')).toBeTruthy()
    expect(screen.getByText('Weapon Mastery')).toBeTruthy()
    expect(screen.getByText('Longsword, Handaxe')).toBeTruthy()
    expect(screen.queryByText('Expertise')).toBeNull()
  })

  test('a homebrew fighting style leaves AC unchanged', () => {
    const c = { ...character({}), stats: { dexterity: 10 } }
    const ac = (picks: PickRecord[]) => derived(c, picks).find((d) => d.key === 'ac')?.value
    expect(ac([fighter({ fighting_style: ['Pike and Shield'] })])).toBe(ac([fighter(undefined)]))
  })

  test('renders nothing extra when there are no choices', () => {
    render(<ProfileSection character={character({})} picks={[fighter(undefined)]} />)
    expect(screen.queryByText('Class features')).toBeNull()
  })

  test('Cleric order uses the class feature name', () => {
    const cleric: PickRecord = { ...fighter({ order: ['Protector'] }), content: { name: 'Cleric', data: {} } }
    render(<ProfileSection character={character({})} picks={[cleric]} />)
    expect(screen.getByText('Divine Order')).toBeTruthy()
  })
})
