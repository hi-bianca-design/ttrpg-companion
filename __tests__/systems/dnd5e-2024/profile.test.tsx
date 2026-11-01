import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord } from '@/systems/types'

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
