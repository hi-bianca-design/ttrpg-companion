// Class features with limited uses (Second Wind, Rage, ...): how many a character has at a level, and how
// a rest recharges them. Each is stored as a one-tier slots resource keyed by `key` (tier "1"), so the
// existing pips tracker, rest and level-up code handle it. Kept free of rules.ts imports (rules uses this).
import type { ResourceDef, SlotsValue } from '../types'

export type FeatureUse = {
  key: string
  label: string
  className: string
  /** Uses at a level, given the character's ability scores. */
  uses: (level: number, stats: Record<string, number>) => number
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
]

export const FEATURE_KEYS = CLASS_FEATURES.map((f) => f.key)

export const featuresFor = (className: string): FeatureUse[] => CLASS_FEATURES.filter((f) => f.className === className)

const oneTier = (max: number, used = 0): SlotsValue => ({ tiers: { '1': { max, used } } })

/** Resource values for the class's features at a level, all unspent (for a new character). */
export function featureResources(className: string, level: number, stats: Record<string, number>): Record<string, SlotsValue> {
  return Object.fromEntries(featuresFor(className).map((f) => [f.key, oneTier(f.uses(level, stats))]))
}

/** The same resources after levelling up: new maxes, with spent uses kept (capped at the new max). */
export function grownFeatures(
  current: Record<string, unknown>, className: string, level: number, stats: Record<string, number>,
): Record<string, SlotsValue> {
  return Object.fromEntries(featuresFor(className).flatMap((f) => {
    const old = (current[f.key] as SlotsValue | undefined)?.tiers['1']
    if (!old) return []
    const max = f.uses(level, stats)
    return [[f.key, oneTier(max, Math.min(old.used, max))]]
  }))
}

/** A rest's effect on one feature's value. */
export function rechargedFeature(f: FeatureUse, v: SlotsValue, kind: 'short' | 'long', level: number): SlotsValue {
  const tier = v.tiers['1']
  if (!tier) return v
  const regained = kind === 'long' ? 'all' : f.short(level)
  const used = regained === 'all' ? 0 : regained === 'one' ? Math.max(0, tier.used - 1) : tier.used
  return oneTier(tier.max, used)
}

export const FEATURE_RESOURCE_DEFS: ResourceDef[] = CLASS_FEATURES.map((f) => ({
  key: f.key, label: f.label, kind: 'slots', display: 'pips', tint: 'ochre', group: 'feature', tierLabel: () => 'uses',
}))
