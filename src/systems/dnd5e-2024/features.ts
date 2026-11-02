// Class features with limited uses (Second Wind, Rage, ...): how many a character has at a level, and how
// a rest recharges them. Each is stored as a one-tier slots resource keyed by `key` (tier "1"), so the
// existing pips tracker, rest and level-up code handle it. Kept free of rules.ts imports (rules uses this).
import type { PoolValue, ResourceDef, ResourceValue, SlotsValue } from '../types'

export type FeatureUse = {
  key: string
  label: string
  className: string
  /** Uses at a level, given the character's ability scores. */
  uses: (level: number, stats: Record<string, number>) => number
  /** A pool of points (Lay On Hands) instead of counted uses. */
  pool?: boolean
  /** What a short rest regains: all uses, one use, or none (a long rest always regains all). */
  short: (level: number) => 'all' | 'one' | 'none'
}

const modOf = (stats: Record<string, number>, ability: string) => Math.floor(((stats[ability] ?? 10) - 10) / 2)
const byLevel = (steps: Array<[level: number, uses: number]>) => (level: number) =>
  steps.reduce((uses, [from, n]) => (level >= from ? n : uses), 0)

export const CLASS_FEATURES: FeatureUse[] = [
  {
    key: 'second_wind', label: 'Second Wind', className: 'Fighter',
    uses: byLevel([[1, 2], [4, 3], [10, 4]]), short: () => 'one',
  },
  {
    key: 'rage', label: 'Rage', className: 'Barbarian',
    uses: byLevel([[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]]), short: () => 'one',
  },
  {
    key: 'bardic_inspiration', label: 'Bardic Inspiration', className: 'Bard',
    uses: (level, stats) => Math.max(1, modOf(stats, 'charisma')), short: (level) => (level >= 5 ? 'all' : 'none'),
  },
  {
    key: 'innate_sorcery', label: 'Innate Sorcery', className: 'Sorcerer',
    uses: () => 2, short: () => 'none',
  },
  {
    key: 'favored_enemy', label: 'Favored Enemy', className: 'Ranger',
    uses: byLevel([[1, 2], [5, 3], [9, 4], [13, 5], [17, 6]]), short: () => 'none',
  },
  {
    key: 'lay_on_hands', label: 'Lay On Hands', className: 'Paladin', pool: true,
    uses: (level) => 5 * level, short: () => 'none',
  },
]

export const FEATURE_KEYS = CLASS_FEATURES.map((f) => f.key)

export const featuresFor = (className: string): FeatureUse[] => CLASS_FEATURES.filter((f) => f.className === className)

const oneTier = (max: number, used = 0): SlotsValue => ({ tiers: { '1': { max, used } } })
const poolOf = (max: number, spent = 0): PoolValue => ({ max, current: max - Math.min(spent, max) })
const make = (f: FeatureUse, max: number, spent = 0): ResourceValue => (f.pool ? poolOf(max, spent) : oneTier(max, Math.min(spent, max)))

/** Resource values for the class's features at a level, all unspent (for a new character). */
export function featureResources(className: string, level: number, stats: Record<string, number>): Record<string, ResourceValue> {
  return Object.fromEntries(featuresFor(className).map((f) => [f.key, make(f, f.uses(level, stats))]))
}

/** The same resources after levelling up: new maxes, with spent uses kept (capped at the new max). */
export function grownFeatures(
  current: Record<string, unknown>, className: string, level: number, stats: Record<string, number>,
): Record<string, ResourceValue> {
  return Object.fromEntries(featuresFor(className).flatMap((f) => {
    const old = spentOf(f, current[f.key])
    return old === null ? [] : [[f.key, make(f, f.uses(level, stats), old)]]
  }))
}

/** Uses (or points) already spent, or null when the character has no such resource. */
function spentOf(f: FeatureUse, v: unknown): number | null {
  if (!v || typeof v !== 'object') return null
  if (f.pool) {
    const p = v as PoolValue
    return typeof p.max === 'number' ? p.max - p.current : null
  }
  const tier = (v as SlotsValue).tiers?.['1']
  return tier ? tier.used : null
}

/** A rest's effect on one feature's value. */
export function rechargedFeature(f: FeatureUse, v: ResourceValue, kind: 'short' | 'long', level: number): ResourceValue {
  const spent = spentOf(f, v)
  if (spent === null) return v
  const regained = kind === 'long' ? 'all' : f.short(level)
  const left = regained === 'all' ? 0 : regained === 'one' ? Math.max(0, spent - 1) : spent
  const max = f.pool ? (v as PoolValue).max : (v as SlotsValue).tiers['1'].max
  return make(f, max, left)
}

export const FEATURE_RESOURCE_DEFS: ResourceDef[] = CLASS_FEATURES.map((f): ResourceDef =>
  f.pool
    ? { key: f.key, label: f.label, kind: 'pool', display: 'counter', group: 'feature' }
    : { key: f.key, label: f.label, kind: 'slots', display: 'pips', tint: 'ochre', group: 'feature', tierLabel: () => 'uses' },
)
