// D&D 5e (2024) rules: ability maths, spell slots, derived values and rests.
// Ported from src/modules/character/character.utils.ts (removed in Task 20).
import type {
  CharacterRecord, DerivedValue, PickRecord, PoolValue, ResourceValue, SlotsValue,
} from '../types'
import { ABILITY_KEYS, ABILITY_LABELS } from './definition'

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

// Level 1: max hit die + con mod. Each subsequent level: floor(hitDie/2)+1 + con mod.
export function getMaxHP(level: number, hitDie: number, constitutionModifier: number): number {
  return (hitDie + constitutionModifier) + (level - 1) * (Math.floor(hitDie / 2) + 1 + constitutionModifier)
}

export const SPELLCASTING_CLASSES = [
  'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
]

// Cantrips known by class at each level (index 0 = level 1)
const CANTRIPS_KNOWN: Partial<Record<string, number[]>> = {
  Bard:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Cleric:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  Druid:    [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Sorcerer: [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  Warlock:  [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Wizard:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
}

// Spells known by class at each level (index 0 = level 1); null = prepared caster
const SPELLS_KNOWN: Partial<Record<string, number[]>> = {
  Bard:    [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  Sorcerer:[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  Warlock: [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  Ranger:  [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
}

// Highest spell slot level available to a class at a given character level
export function getMaxSpellLevel(className: string, characterLevel: number): number {
  switch (className) {
    case 'Bard':
    case 'Cleric':
    case 'Druid':
    case 'Sorcerer':
    case 'Wizard':
      // Full casters: ceil(level/2), max 9
      return Math.min(9, Math.ceil(characterLevel / 2))
    case 'Warlock':
      // Full slots but max spell level 5
      return Math.min(5, Math.ceil(characterLevel / 2))
    case 'Paladin':
      // Half caster starting at level 1: ceil(level/4), max 5
      return Math.min(5, Math.ceil(characterLevel / 4))
    case 'Ranger':
      // Half caster starting at level 2
      return characterLevel < 2 ? 0 : Math.min(5, Math.ceil((characterLevel - 1) / 4))
    default:
      return 0
  }
}

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
]

export function getLevelFromXP(xp: number): number {
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

export function getXPForNextLevel(level: number): number | null {
  if (level >= 20) return null
  return XP_THRESHOLDS[level] ?? null
}

export function getMaxHPMulticlass(
  startingLevel: number,
  primaryHitDie: number,
  secondHitDie: number | null,
  secondClassLevel: number | null,
  conMod: number
): number {
  const primaryLevel = startingLevel - (secondClassLevel ?? 0)
  const primaryHP =
    (primaryHitDie + conMod) +
    Math.max(0, primaryLevel - 1) * (Math.floor(primaryHitDie / 2) + 1 + conMod)
  const secondaryHP =
    secondClassLevel && secondHitDie
      ? secondClassLevel * (Math.floor(secondHitDie / 2) + 1 + conMod)
      : 0
  return primaryHP + secondaryHP
}

export function getSpellLimits(
  className: string,
  level: number,
  abilityMod: number = 0,
): { maxCantrips: number; maxSpells: number } {
  const idx = Math.min(Math.max(level, 1), 20) - 1
  const maxCantrips = CANTRIPS_KNOWN[className]?.[idx] ?? 0

  const known = SPELLS_KNOWN[className]
  if (known) return { maxCantrips, maxSpells: known[idx] }

  // Prepared casters: ability modifier + level (min 1)
  const prepared = Math.max(1, abilityMod + level)
  return { maxCantrips, maxSpells: prepared }
}

// ── Spell slots ──────────────────────────────────────────────

// Full caster slots per spell level (index 0 = character level 1).
const FULL_CASTER_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard'])
const HALF_CASTERS = new Set(['paladin', 'ranger'])

// Warlock Pact Magic: [slot count, slot level] (index 0 = character level 1).
const PACT_SLOTS: Array<[number, number]> = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

function tiersFrom(counts: number[]): SlotsValue {
  return { tiers: Object.fromEntries(counts.map((max, i) => [String(i + 1), { max, used: 0 }])) }
}

/** Spell slots for a single-class character. Half casters use the SRD table (none at level 1). */
export function slotsFor(className: string, level: number): SlotsValue {
  const cls = className.toLowerCase()
  const lvl = Math.min(Math.max(Math.floor(level), 1), 20)
  if (FULL_CASTERS.has(cls)) return tiersFrom(FULL_CASTER_SLOTS[lvl - 1])
  if (HALF_CASTERS.has(cls)) return lvl < 2 ? { tiers: {} } : tiersFrom(FULL_CASTER_SLOTS[Math.ceil(lvl / 2) - 1])
  if (cls === 'warlock') {
    const [count, slotLevel] = PACT_SLOTS[lvl - 1]
    return { tiers: { [String(slotLevel)]: { max: count, used: 0 } } }
  }
  return { tiers: {} }
}

// ── Pick helpers ─────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function className(picks: PickRecord[]): string | undefined {
  return picks.find((p) => p.kind === 'class')?.content.name
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function hasSkill(picks: PickRecord[], skill: string): boolean {
  return picks.some((p) =>
    [...stringList(asRecord(p.content.data).skill_proficiencies), ...stringList(p.state.skills)]
      .some((s) => s.toLowerCase() === skill),
  )
}

// ── Derived values ───────────────────────────────────────────

/** Armor Class: 10 + DEX unarmored, or equipped armor (parsed from SRD "13 + Dex modifier (max 2)"), plus shield. */
function armorClass(dexMod: number, picks: PickRecord[]): number {
  let base = 10 + dexMod
  let shield = 0
  for (const p of picks) {
    if ((p.kind !== 'item' && p.kind !== 'magic_item') || p.state.equipped !== true) continue
    const props = asRecord(asRecord(p.content.data).properties)
    if (typeof props.armor_class_bonus === 'number') shield = Math.max(shield, props.armor_class_bonus)
    if (typeof props.armor_class === 'string') {
      const flat = props.armor_class.match(/^\s*(\d+)/)
      if (!flat) continue
      const cap = props.armor_class.match(/max\s*(\d+)/i)
      const dex = /dex/i.test(props.armor_class) ? (cap ? Math.min(dexMod, Number(cap[1])) : dexMod) : 0
      base = Number(flat[1]) + dex
    }
  }
  return base + shield
}

export function derived(c: CharacterRecord, picks: PickRecord[]): DerivedValue[] {
  const mod = (k: string) => getAbilityModifier(c.stats[k] ?? 10)
  const prof = getProficiencyBonus(c.level)
  const alert = picks.some((p) => p.kind === 'feat' && p.content.name === 'Alert')
  const speciesSpeed = asRecord(picks.find((p) => p.kind === 'species')?.content.data).speed

  return [
    ...ABILITY_KEYS.map((k): DerivedValue => ({ key: `${k}_mod`, label: ABILITY_LABELS[k], value: mod(k), format: 'modifier' })),
    { key: 'proficiency', label: 'Proficiency', value: prof, format: 'modifier' },
    { key: 'ac', label: 'Armor Class', value: armorClass(mod('dexterity'), picks), format: 'plain' },
    { key: 'initiative', label: 'Initiative', value: mod('dexterity') + (alert ? prof : 0), format: 'modifier' },
    { key: 'passive_perception', label: 'Passive Perception', value: 10 + mod('wisdom') + (hasSkill(picks, 'perception') ? prof : 0), format: 'plain' },
    { key: 'speed', label: 'Speed', value: typeof speciesSpeed === 'number' ? speciesSpeed : 30, format: 'plain' },
  ]
}

// ── Rests ────────────────────────────────────────────────────

function clearSlots(v: ResourceValue | undefined): ResourceValue | undefined {
  if (!v || !('tiers' in v)) return v
  return { tiers: Object.fromEntries(Object.entries(v.tiers).map(([t, s]) => [t, { ...s, used: 0 }])) }
}

/**
 * Long: hp to max (temp cleared), all spell slots and death saves reset,
 * regain half max hit dice (min 1). Short: Warlock pact slots only.
 */
export function rest(c: CharacterRecord, kind: 'short' | 'long', picks: PickRecord[]): Record<string, ResourceValue> {
  const next: Record<string, ResourceValue> = { ...c.resources }
  const set = (key: string, v: ResourceValue | undefined) => { if (v) next[key] = v }

  if (kind === 'short') {
    if (className(picks)?.toLowerCase() === 'warlock') set('spell_slots', clearSlots(c.resources.spell_slots))
    return next
  }

  const hp = c.resources.hp as PoolValue | undefined
  if (hp) set('hp', { ...hp, current: hp.max, temp: 0 })
  const hd = c.resources.hit_dice as PoolValue | undefined
  if (hd) set('hit_dice', { ...hd, current: Math.min(hd.max, hd.current + Math.max(1, Math.floor(hd.max / 2))) })
  for (const key of ['spell_slots', 'death_saves_success', 'death_saves_failure']) set(key, clearSlots(c.resources[key]))
  return next
}
