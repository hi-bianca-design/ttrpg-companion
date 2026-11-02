// D&D 5e (2024) rules: ability maths, spell slots, derived values and rests.
// Ported from the pre-rebuild character utils (since removed).
import type {
  CharacterRecord, DerivedValue, PickRecord, PoolValue, ResourceValue, SlotsValue,
} from '../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from './definition'

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

// SRD 5.2 class tables (index 0 = level 1), keyed lowercase.
// Cantrips known: 3 tiers (levels 1–3, 4–9, 10–20); Paladin and Ranger have none.
const CANTRIP_TIERS: Record<string, [number, number, number]> = {
  bard: [2, 3, 4], cleric: [3, 4, 5], druid: [2, 3, 4],
  sorcerer: [4, 5, 6], warlock: [2, 3, 4], wizard: [3, 4, 5],
}

const FULL_PREPARED = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
const HALF_PREPARED = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]

// Prepared spells per level (the 2024 rules replace "spells known" with a fixed prepared count).
const PREPARED_SPELLS: Record<string, number[]> = {
  bard: FULL_PREPARED,
  cleric: FULL_PREPARED,
  druid: FULL_PREPARED,
  paladin: HALF_PREPARED,
  ranger: HALF_PREPARED,
  sorcerer: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  wizard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
}

// Highest spell slot level available to a class at a given character level.
// Derived from slotsFor so the two can't drift; case-insensitive; 0 for non-casters.
export function getMaxSpellLevel(className: string, characterLevel: number): number {
  return Math.max(0, ...Object.keys(slotsFor(className, characterLevel).tiers).map(Number))
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

/**
 * Cantrips known and spells prepared for a single-class character (SRD 5.2). Case-insensitive;
 * the level is clamped to 1–20. `abilityMod` is unused (2024 prepared counts are fixed per level)
 * and kept for signature compatibility.
 */
export function getSpellLimits(
  className: string,
  level: number,
  _abilityMod: number = 0,
): { maxCantrips: number; maxSpells: number } {
  const cls = className.toLowerCase()
  const lvl = Math.min(Math.max(Math.floor(level), 1), 20)
  const tiers = CANTRIP_TIERS[cls]
  const maxCantrips = tiers ? tiers[lvl < 4 ? 0 : lvl < 10 ? 1 : 2] : 0
  return { maxCantrips, maxSpells: PREPARED_SPELLS[cls]?.[lvl - 1] ?? 0 }
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

/**
 * Spell slots for a single-class character (SRD 5.2). Half casters (Paladin, Ranger) have
 * slots from level 1: the full-caster row at ceil(level / 2).
 */
export function slotsFor(className: string, level: number): SlotsValue {
  const cls = className.toLowerCase()
  const lvl = Math.min(Math.max(Math.floor(level), 1), 20)
  if (FULL_CASTERS.has(cls)) return tiersFrom(FULL_CASTER_SLOTS[lvl - 1])
  if (HALF_CASTERS.has(cls)) return tiersFrom(FULL_CASTER_SLOTS[Math.ceil(lvl / 2) - 1])
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

/** "Animal Handling" / "animal-handling" → "animal-handling". */
export function skillKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * Saving throws from the class pick's `saving_throw_proficiencies`; skills from every pick's
 * `skill_proficiencies` (background) plus chosen `state.skills`. Keys are lowercase / kebab-case.
 */
export function proficiencies(picks: PickRecord[]): { saves: string[]; skills: string[] } {
  const cls = picks.find((p) => p.kind === 'class')
  const saves = stringList(asRecord(cls?.content.data).saving_throw_proficiencies).map((s) => s.toLowerCase())
  const skills = picks.flatMap((p) =>
    [...stringList(asRecord(p.content.data).skill_proficiencies), ...stringList(p.state.skills)].map(skillKey),
  )
  return { saves: [...new Set(saves)], skills: [...new Set(skills)] }
}

function hasSkill(picks: PickRecord[], skill: string): boolean {
  return proficiencies(picks).skills.includes(skill)
}

/** Progress (0–100) through the current level's XP band, and the next level's threshold. */
function xpValues(level: number, xp: number): DerivedValue[] {
  const next = getXPForNextLevel(level)
  if (next === null) return [{ key: 'xp_progress', label: 'Experience', value: 100, format: 'plain' }]
  const start = XP_THRESHOLDS[Math.max(0, level - 1)] ?? 0
  const pct = Math.round(((xp - start) / (next - start)) * 100)
  return [
    { key: 'xp_progress', label: 'Experience', value: Math.min(100, Math.max(0, pct)), format: 'plain' },
    { key: 'xp_next', label: 'Next level', value: next, format: 'plain' },
  ]
}

// ── Derived values ───────────────────────────────────────────

/** Armor Class: 10 + DEX unarmored, or equipped armor (parsed from SRD "13 + Dex modifier (max 2)"), plus shield and the Defense fighting style while armored. */
function armorClass(dexMod: number, picks: PickRecord[]): number {
  let base = 10 + dexMod
  let shield = 0
  let armored = false
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
      armored = true
    }
  }
  const defense = armored && picks.some((p) => p.kind === 'feat' && p.content.name === 'Defense')
  return base + shield + (defense ? 1 : 0)
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
    ...(typeof c.details.xp === 'number' ? xpValues(c.level, c.details.xp) : []),
  ]
}

// ── Rests ────────────────────────────────────────────────────

function clearSlots(v: ResourceValue | undefined): ResourceValue | undefined {
  if (!v || !('tiers' in v)) return v
  return { tiers: Object.fromEntries(Object.entries(v.tiers).map(([t, s]) => [t, { ...s, used: 0 }])) }
}

/**
 * Long: hp to max (temp cleared), all spell slots and death saves reset, and all spent
 * hit dice regained (SRD 5.2). Short: Warlock pact slots only.
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
  if (hd) set('hit_dice', { ...hd, current: hd.max })
  for (const key of ['spell_slots', 'death_saves_success', 'death_saves_failure']) set(key, clearSlots(c.resources[key]))
  return next
}

// ── Level up ─────────────────────────────────────────────────

export const MAX_LEVEL = 20
/** 2024 rules: every class chooses its subclass at level 3 (content may override via features.subclass_level). */
export const SUBCLASS_LEVEL = 3

/** Character levels that grant an Ability Score Improvement (2024 class tables). */
export const ASI_LEVELS = [4, 8, 12, 16, 19] as const
/** Highest an ability score can be raised to by an ASI. */
export const ABILITY_SCORE_CAP = 20

export function isAsiLevel(level: number): boolean {
  return (ASI_LEVELS as readonly number[]).includes(level)
}

/** +2 to one ability or +1 to two; only applied when it totals exactly 2. */
export type AsiChoice = Partial<Record<AbilityKey, 1 | 2>>

export type LevelUpInput = { hpMethod: 'average' | 'roll'; roll?: number; subclassId?: string; asi?: AsiChoice }

/** Stats after an ASI, each raised score capped at 20. An ASI that isn't exactly 2 points changes nothing. */
export function applyAsi(stats: Record<string, number>, asi: AsiChoice | undefined): Record<string, number> {
  const entries = Object.entries(asi ?? {}).filter(([k, v]) => (ABILITY_KEYS as readonly string[]).includes(k) && (v === 1 || v === 2))
  if (entries.reduce((sum, [, v]) => sum + (v as number), 0) !== 2) return stats
  const next = { ...stats }
  for (const [k, v] of entries) next[k] = Math.min(ABILITY_SCORE_CAP, (stats[k] ?? 10) + (v as number))
  return next
}

export function hitDieOf(picks: PickRecord[]): number {
  const die = asRecord(picks.find((p) => p.kind === 'class')?.content.data).hit_die
  return typeof die === 'number' && die > 0 ? die : 8
}

/** HP gained on level up: average (floor(die/2)+1) or the roll, plus CON mod; never below 1. */
export function hpGain(hitDie: number, conMod: number, input: Pick<LevelUpInput, 'hpMethod' | 'roll'>): number {
  const average = Math.floor(hitDie / 2) + 1
  // An invalid roll (NaN, out of range) falls back to the average rather than producing NaN.
  const validRoll = typeof input.roll === 'number' && Number.isInteger(input.roll) && input.roll >= 1 && input.roll <= hitDie
  const base = input.hpMethod === 'roll' && validRoll ? (input.roll as number) : average
  return Math.max(1, base + conMod)
}

/** Recompute spell slot maxima for the new level, keeping `used` (capped at the new max). */
function grownSlots(old: SlotsValue, className: string, level: number): SlotsValue {
  const fresh = slotsFor(className, level)
  return {
    tiers: Object.fromEntries(
      Object.entries(fresh.tiers).map(([tier, s]) => [tier, { max: s.max, used: Math.min(old.tiers[tier]?.used ?? 0, s.max) }]),
    ),
  }
}

/**
 * Next level's `level`, `resources` and `stats`: HP max and current rise by the gain (no full heal),
 * hit dice max and current by 1, spell slots follow slotsFor. At an ASI level the chosen +2 / +1+1
 * is applied (capped at 20); a higher CON modifier also adds its difference for every earlier level,
 * as the rules apply it retroactively. The subclass pick is persisted by the caller.
 */
export function levelUp(
  c: CharacterRecord,
  picks: PickRecord[],
  input: Record<string, unknown>,
): Pick<CharacterRecord, 'level' | 'resources' | 'stats'> {
  if (c.level >= MAX_LEVEL) throw new Error('Already at max level')
  const level = c.level + 1
  const { hpMethod, roll, asi } = input as LevelUpInput
  const stats = isAsiLevel(level) ? applyAsi(c.stats, asi) : c.stats
  const oldCon = getAbilityModifier(c.stats.constitution ?? 10)
  const newCon = getAbilityModifier(stats.constitution ?? 10)
  const gain = hpGain(hitDieOf(picks), newCon, { hpMethod, roll }) + (newCon - oldCon) * c.level
  const resources: Record<string, ResourceValue> = { ...c.resources }

  const hp = c.resources.hp as PoolValue | undefined
  if (hp) resources.hp = { ...hp, max: hp.max + gain, current: hp.current + gain }
  const hd = c.resources.hit_dice as PoolValue | undefined
  if (hd) resources.hit_dice = { ...hd, max: hd.max + 1, current: hd.current + 1 }
  const slots = c.resources.spell_slots as SlotsValue | undefined
  const cls = className(picks)
  if (slots && cls) resources.spell_slots = grownSlots(slots, cls, level)

  return { level, resources, stats }
}

// ── Weapon Mastery ───────────────────────────────────────────

/** Weapons mastered at level 1 (SRD 5.2); a class with the Weapon Mastery feature but not listed here gets 2. */
const MASTERY_COUNTS: Record<string, number> = { Barbarian: 2, Fighter: 3, Paladin: 2, Ranger: 2, Rogue: 2 }

export function weaponMasteryCountFor(className: string, level1Features: string[]): number {
  return level1Features.includes('Weapon Mastery') ? MASTERY_COUNTS[className] ?? 2 : 0
}

/** Whether a class may master an item: Barbarians take melee weapons, Rogues Finesse or Light ones, everyone else any weapon with a mastery property. */
export function canMaster(className: string, item: { category?: string; properties?: { mastery?: string; weapon_properties?: string[] } }): boolean {
  if (typeof item.properties?.mastery !== 'string' || !item.category?.includes('Weapon')) return false
  if (className === 'Barbarian') return item.category.includes('Melee')
  if (className === 'Rogue') return (item.properties.weapon_properties ?? []).some((w) => w === 'Finesse' || w === 'Light')
  return true
}
