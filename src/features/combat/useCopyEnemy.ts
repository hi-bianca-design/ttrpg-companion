import type { GmEnemyRow } from './battleOrder'
import { useAddEnemies } from './combat.queries'

/** "Goblin 3" → "Goblin": a copy is named by the server from the stem, like any other add. */
export const nameStem = (name: string) => name.replace(/\s+\d+$/, '') || name

/**
 * The one way to add one more of an enemy already in the fight, shared by the card's **+1** and the
 * add sheet's Copy path: full health (the server starts it at max), same stats, notes and hidden flag,
 * no initiative (it lands at the bottom and the GM drags it). Rejects on failure; callers show the toast.
 */
export function useCopyEnemy(campaignId: string, combatId: string | undefined) {
  const add = useAddEnemies(campaignId, combatId)
  return (row: GmEnemyRow) =>
    add.mutateAsync({
      name: nameStem(row.name), count: 1, maxHp: row.maxHp, initiative: null, ac: row.ac, notes: row.notes, hidden: row.hidden,
      defenseLabel: row.defenseLabel, attacks: row.attacks, xp: row.xp,
    })
}
