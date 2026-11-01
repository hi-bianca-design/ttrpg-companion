// Pure, clamped resource transitions shared by every game system.
import type { PoolValue, SlotsValue } from './types'

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
