import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const Spellcasting = getSystem('dnd5e-2024').sheet!.sections!.spellcasting

const char = (level: number, stats: Record<string, number>): CharacterRecord =>
  ({ id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level, stats, resources: {}, conditions: [], details: {} })
const cls = (name: string, data: unknown = {}): PickRecord =>
  ({ content_id: name, kind: 'class', state: {}, acquired_at_level: 1, content: { name, data } })

test('D&D registers a spellcasting section', () => {
  expect(Spellcasting).toBeDefined()
})

test('a level 5 Wizard with Intelligence 16 shows DC 14 and the ability', () => {
  render(<Spellcasting character={char(5, { intelligence: 16 })} picks={[cls('Wizard')]} />)
  expect(screen.getByText('Spellcasting')).toBeTruthy()
  expect(screen.getByLabelText('Spell save DC 14')).toBeTruthy()
  expect(screen.getByText('Wizard · Intelligence')).toBeTruthy()
})

test('a non-caster renders nothing', () => {
  render(<Spellcasting character={char(5, {})} picks={[cls('Fighter')]} />)
  expect(screen.queryByText('Spellcasting')).toBeNull()
})

test('a homebrew class without an ability renders nothing', () => {
  render(<Spellcasting character={char(1, { charisma: 14 })} picks={[cls('Mystic')]} />)
  expect(screen.queryByText('Spellcasting')).toBeNull()
})

test('two casting classes show two rows, each naming its class', () => {
  render(<Spellcasting character={char(5, { intelligence: 16, wisdom: 14 })} picks={[cls('Wizard'), cls('Cleric')]} />)
  expect(screen.getByLabelText('Wizard spell save DC 14')).toBeTruthy()
  expect(screen.getByLabelText('Cleric spell save DC 13')).toBeTruthy()
})
