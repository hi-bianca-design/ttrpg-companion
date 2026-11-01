import { restSummary } from '@/features/characters/sheet/restSummary'
import { getSystem } from '@/systems/registry'

const defs = getSystem('dnd5e-2024').resources
const slots = (used: number) => ({ tiers: { '1': { max: 2, used } } })

test('long rest lists what changed, in the system’s declared order, with the HP value', () => {
  const before = { hp: { current: 5, max: 14, temp: 0 }, spell_slots: slots(2), hit_dice: { current: 1, max: 3 } }
  const after = { hp: { current: 14, max: 14, temp: 0 }, spell_slots: slots(0), hit_dice: { current: 2, max: 3 } }
  expect(restSummary(defs, 'long', before, after)).toBe('Long rest: Hit Points 14/14, Spell Slots, Hit Dice restored.')
})

test('a short rest that changes nothing says so', () => {
  const r = { hp: { current: 5, max: 14 }, spell_slots: slots(1) }
  expect(restSummary(defs, 'short', r, r)).toBe('Short rest: nothing to recharge.')
})

test('a long rest at full resources says nothing needed restoring', () => {
  const r = { hp: { current: 14, max: 14 }, spell_slots: slots(0) }
  expect(restSummary(defs, 'long', r, { ...r })).toBe('Long rest: already fully rested.')
})

test('counters that count marks up (death saves) are reset, not "restored", so they are left out', () => {
  const marked = (used: number) => ({ tiers: { '1': { max: 3, used } } })
  const before = { hp: { current: 0, max: 14 }, death_saves_success: marked(1), death_saves_failure: marked(2) }
  const after = { hp: { current: 14, max: 14 }, death_saves_success: marked(0), death_saves_failure: marked(0) }
  expect(restSummary(defs, 'long', before, after)).toBe('Long rest: Hit Points 14/14 restored.')
})
