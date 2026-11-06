import type { CharacterFull } from '@/features/characters/characters.api'
import type { PoolValue } from '@/systems/types'
import type { Attack, Combat, CombatEntry, OrderRow } from './combat.api'

/** A party member's row. Shared by the player and GM screens: hit points come from the party cache, never the order. */
export type PlayerRow = {
  kind: 'player'
  id: string
  characterId: string
  userId: string
  name: string
  subtitle: string | null
  initiative: number | null
  hp: { current: number; max: number; temp: number } | null
  conditions: string[]
  isCurrent: boolean
  isMine: boolean
}

/**
 * An enemy as a player may see it: a name and a place in the order. Deliberately no other fields, so
 * a leak of hit points, armor class, notes or the hidden flag is a type error before it is a test failure.
 */
export type PlayerSideEnemyRow = {
  kind: 'enemy'
  id: string
  name: string
  initiative: number | null
  isCurrent: boolean
}

/** An enemy as its GM sees it. Never constructed on a player's device (the entries query is GM-only). */
export type GmEnemyRow = {
  kind: 'enemy'
  id: string
  name: string
  initiative: number | null
  hp: number
  maxHp: number
  tempHp: number
  ac: number | null
  notes: string | null
  defenseLabel: string | null
  attacks: Attack[]
  xp: number | null
  conditions: string[]
  hidden: boolean
  groupId: string | null
  isDown: boolean
  isCurrent: boolean
}

type PlayerSource = { id: string; character_id: string | null; user_id: string | null; initiative: number | null }

function playerRow(src: PlayerSource, isCurrent: boolean, party: CharacterFull[], userId: string | undefined): PlayerRow {
  const c = src.character_id ? party.find((p) => p.id === src.character_id) : undefined
  const pool = c?.resources.hp as PoolValue | undefined
  const className = c?.picks.find((p) => p.kind === 'class')?.content?.name
  return {
    kind: 'player',
    id: src.id,
    characterId: src.character_id ?? '',
    userId: src.user_id ?? '',
    name: c?.name ?? 'Player',
    subtitle: c ? (className ? `${className} · Level ${c.level}` : `Level ${c.level}`) : null,
    initiative: src.initiative,
    hp: pool && typeof pool.current === 'number' ? { current: pool.current, max: pool.max, temp: pool.temp ?? 0 } : null,
    conditions: c?.conditions ?? [],
    isCurrent,
    isMine: !!userId && src.user_id === userId,
  }
}

export function buildPlayerOrder(input: {
  combat: Combat
  order: OrderRow[]
  party: CharacterFull[]
  userId: string | undefined
}): { round: number; rows: (PlayerRow | PlayerSideEnemyRow)[] } {
  const { combat, order, party, userId } = input
  const rows = [...order]
    .sort((a, b) => a.position - b.position)
    .map((r): PlayerRow | PlayerSideEnemyRow => {
      const isCurrent = r.id === combat.turn_entry_id
      // Built field by field: a spread of the server row would carry any extra column straight into the UI.
      if (r.kind === 'enemy') return { kind: 'enemy', id: r.id, name: r.name ?? 'Enemy', initiative: r.initiative, isCurrent }
      return playerRow(r, isCurrent, party, userId)
    })
  return { round: combat.round, rows }
}

export function buildGmOrder(input: {
  combat: Combat
  entries: CombatEntry[]
  party: CharacterFull[]
  userId: string | undefined
}): { round: number; currentId: string | null; rows: (PlayerRow | GmEnemyRow)[] } {
  const { combat, entries, party, userId } = input
  const sorted = [...entries].sort((a, b) => a.position - b.position)
  const rows = sorted.map((e): PlayerRow | GmEnemyRow => {
    if (e.kind === 'enemy') {
      const hp = e.hp ?? 0
      return {
        kind: 'enemy',
        id: e.id,
        name: e.name ?? 'Enemy',
        initiative: e.initiative,
        hp,
        maxHp: e.max_hp ?? hp,
        tempHp: e.temp_hp,
        ac: e.ac,
        notes: e.notes,
        defenseLabel: e.defense_label,
        attacks: e.attacks as Attack[],
        xp: e.xp,
        conditions: e.conditions,
        hidden: e.hidden,
        groupId: e.group_id,
        isDown: hp === 0,
        isCurrent: e.is_current,
      }
    }
    return playerRow(e, e.is_current, party, userId)
  })
  return { round: combat.round, currentId: sorted.find((e) => e.is_current)?.id ?? null, rows }
}

/** The ids sharing this row's group (a ×N add), or just the row when it has none. */
export function selectGroup(rows: GmEnemyRow[], id: string): string[] {
  const groupId = rows.find((r) => r.id === id)?.groupId
  return groupId ? rows.filter((r) => r.groupId === groupId).map((r) => r.id) : [id]
}

export function toggleSelected(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (!next.delete(id)) next.add(id)
  return next
}

/** The 1-based position a row at `fromIndex` (1-based) lands on after a vertical drag of `offsetY`. */
export function reorderTarget(fromIndex: number, offsetY: number, rowHeight: number, count: number): number {
  const target = fromIndex + Math.round(offsetY / rowHeight)
  return Math.max(1, Math.min(count, target))
}
