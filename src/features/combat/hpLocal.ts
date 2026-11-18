import { adjustPool, setTemp } from '@/systems/resources'
import type { CombatEntry, HpMode } from './combat.api'

/**
 * The device's copy of `apply_enemy_hp`, for cards changed while offline: one amount to each listed enemy.
 * Same arithmetic as the server (and the players' own sheets): damage takes temp first and floors at 0,
 * heal caps at max and never raises temp, temp keeps the larger value. Non-enemies and an amount below 1
 * (which the server refuses) change nothing. The server recomputes on sync; this is only what the GM sees meanwhile.
 */
export function applyHpLocal(entries: CombatEntry[], ids: string[], mode: HpMode, amount: number): CombatEntry[] {
  if (!(amount >= 1)) return entries
  const targets = new Set(ids)
  return entries.map((e) => {
    if (!targets.has(e.id) || e.kind !== 'enemy' || e.hp === null) return e
    const pool = { current: e.hp, max: e.max_hp ?? e.hp, temp: e.temp_hp }
    const next = mode === 'damage' ? adjustPool(pool, -amount) : mode === 'heal' ? adjustPool(pool, amount) : setTemp(pool, amount)
    return { ...e, hp: next.current, temp_hp: next.temp ?? 0, prev_hp: e.hp, prev_temp: e.temp_hp }
  })
}
