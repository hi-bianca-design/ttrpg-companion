// Pure, clamped resource transitions shared by every game system.
import type { PoolValue, ResourceDef, ResourceValue, SlotsValue } from './types'

function withUsed(v: SlotsValue, tier: string, next: (used: number, max: number) => number): SlotsValue {
  const slot = v.tiers[tier]
  if (!slot) return v
  return { tiers: { ...v.tiers, [tier]: { ...slot, used: next(slot.used, slot.max) } } }
}

/** used + 1, capped at max. */
export function spendSlot(v: SlotsValue, tier: string): SlotsValue {
  return withUsed(v, tier, (used, max) => Math.min(max, used + 1))
}

/** used - 1, floored at 0. */
export function restoreSlot(v: SlotsValue, tier: string): SlotsValue {
  return withUsed(v, tier, (used) => Math.max(0, used - 1))
}

/** Positive delta heals, negative damages. Damage eats temp first; current clamped to [0, max]. */
export function adjustPool(v: PoolValue, delta: number): PoolValue {
  if (delta >= 0) return { ...v, current: Math.min(v.max, v.current + delta) }
  const damage = -delta
  const temp = v.temp ?? 0
  const absorbed = Math.min(temp, damage)
  const current = Math.max(0, Math.min(v.max, v.current - (damage - absorbed)))
  return v.temp === undefined ? { ...v, current } : { ...v, current, temp: temp - absorbed }
}

/** Temporary points don't stack: keep the larger of old and new (never below 0). */
export function setTemp(v: PoolValue, temp: number): PoolValue {
  return { ...v, temp: Math.max(v.temp ?? 0, temp, 0) }
}

/** Every tier back to used = 0. */
function clearAllTiers(v: SlotsValue): SlotsValue {
  return { tiers: Object.fromEntries(Object.entries(v.tiers).map(([t, s]) => [t, { ...s, used: 0 }])) }
}

/**
 * Applies `change` to the pool at `key`. When that takes the pool from 0 to above 0, every slots
 * resource the system shows only while this pool is empty (`showWhenEmpty: key`, e.g. death saves)
 * is cleared in the same result, so one write revives the character.
 */
export function applyPoolChange(
  resources: Record<string, ResourceValue>,
  defs: ResourceDef[],
  key: string,
  change: (pool: PoolValue) => PoolValue,
): Record<string, ResourceValue> {
  const cur = resources[key] as PoolValue | undefined
  if (!cur) return resources
  const next = change(cur)
  const out: Record<string, ResourceValue> = { ...resources, [key]: next }
  if (cur.current === 0 && next.current > 0) {
    for (const def of defs) {
      const v = out[def.key]
      if (def.kind === 'slots' && def.showWhenEmpty === key && v && 'tiers' in v) out[def.key] = clearAllTiers(v)
    }
  }
  return out
}
