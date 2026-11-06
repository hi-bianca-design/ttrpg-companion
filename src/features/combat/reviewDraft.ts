import type { CharacterFull } from '@/features/characters/characters.api'
import type { Encounter } from '@/features/encounters/encounters.api'

/**
 * One line of the pre-combat review. `key` is the text key the start_prepared_combat RPC takes:
 * `player:<character_id>` or `enemy:<encounter_enemy_id>:<n>` (n is the 1-based copy number).
 */
export type DraftRow = {
  key: string
  kind: 'player' | 'enemy'
  name: string
  hidden: boolean
  encounterId: string | null
}

/** Players first, then each encounter's enemies in order. A group of N is expanded to N rows; a count of 1 keeps its bare name. */
export function buildDraft(input: { party: CharacterFull[]; encounters: Encounter[] }): DraftRow[] {
  const rows: DraftRow[] = input.party.map((c) => ({
    key: `player:${c.id}`,
    kind: 'player',
    name: c.name,
    hidden: false,
    encounterId: null,
  }))
  for (const encounter of input.encounters) {
    for (const e of encounter.enemies) {
      for (let n = 1; n <= e.count; n++) {
        rows.push({
          key: `enemy:${e.id}:${n}`,
          kind: 'enemy',
          name: e.count > 1 ? `${e.name} ${n}` : e.name,
          hidden: e.hidden,
          encounterId: encounter.id,
        })
      }
    }
  }
  return rows
}

/** Moves a row to a 0-based index, clamped to the list. Returns a new array; an unknown key changes nothing. */
export function moveRow(rows: DraftRow[], key: string, toIndex: number): DraftRow[] {
  const from = rows.findIndex((r) => r.key === key)
  if (from === -1) return [...rows]
  const to = Math.min(Math.max(toIndex, 0), rows.length - 1)
  const next = [...rows]
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row)
  return next
}

export function moveBy(rows: DraftRow[], key: string, delta: -1 | 1): DraftRow[] {
  const from = rows.findIndex((r) => r.key === key)
  return from === -1 ? [...rows] : moveRow(rows, key, from + delta)
}

/** Flips an enemy's hidden flag. Players are never hidden, so their rows are left alone. */
export function toggleHidden(rows: DraftRow[], key: string): DraftRow[] {
  return rows.map((r) => (r.key === key && r.kind === 'enemy' ? { ...r, hidden: !r.hidden } : r))
}

/** The launch arguments. `hiddenKeys` alone decides hidden on launch, so every hidden row is listed. */
export function launchInput(rows: DraftRow[]): { encounterIds: string[]; order: string[]; hiddenKeys: string[] } {
  const encounterIds: string[] = []
  for (const r of rows) {
    if (r.encounterId && !encounterIds.includes(r.encounterId)) encounterIds.push(r.encounterId)
  }
  return {
    encounterIds,
    order: rows.map((r) => r.key),
    hiddenKeys: rows.filter((r) => r.hidden).map((r) => r.key),
  }
}
