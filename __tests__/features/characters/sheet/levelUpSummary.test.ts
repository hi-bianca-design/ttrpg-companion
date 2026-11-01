import { levelUpSummary } from '@/features/characters/sheet/levelUpSummary'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord, PickRecord } from '@/systems/types'

const system = getSystem('dnd5e-2024')
const c: CharacterRecord = {
  id: 'c1', system_id: 'dnd5e-2024', name: 'Mira', level: 4,
  stats: { strength: 8, dexterity: 14, constitution: 14, intelligence: 16, wisdom: 12, charisma: 10 },
  resources: {
    hp: { current: 10, max: 20, temp: 0 }, hit_dice: { current: 4, max: 4 },
    spell_slots: { tiers: { '1': { max: 4, used: 1 }, '2': { max: 3, used: 0 } } },
  },
  conditions: [], details: {},
}
const picks: PickRecord[] = [{ content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { name: 'Wizard', data: { hit_die: 6 } } }]

test('lists the level and every changed resource and derived value from the preview', () => {
  const preview = system.rules.levelUp!(c, picks, { hpMethod: 'average' })
  const rows = levelUpSummary(system, c, preview, picks)
  expect(rows).toEqual([
    { label: 'Level', value: '4 → 5' },
    { label: 'Hit Points max', value: '20 → 26' },
    { label: 'Spell Slots · Level 3', value: '0 → 2' },
    { label: 'Hit Dice max', value: '4 → 5' },
    { label: 'Proficiency', value: '+2 → +3' },
  ])
})

test('an ASI shows each raised score once (score, not a duplicate modifier row)', () => {
  const c3 = { ...c, level: 3 }
  const preview = system.rules.levelUp!(c3, picks, { hpMethod: 'average', asi: { intelligence: 2 } })
  const rows = levelUpSummary(system, c3, preview, picks)
  expect(rows).toContainEqual({ label: 'Intelligence', value: '16 → 18' })
  expect(rows.filter((r) => r.label === 'Intelligence')).toHaveLength(1)
})
