import type { GmEnemyRow } from './battleOrder'

/**
 * The XP earned so far: each enemy counts while it is down, so healing it above 0 or undoing the
 * hit that dropped it takes its XP back out. An enemy without an XP value counts as 0. GM only.
 */
export function xpEarned(rows: GmEnemyRow[]): number {
  return rows.reduce((sum, r) => (r.isDown && r.xp !== null ? sum + r.xp : sum), 0)
}
