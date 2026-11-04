jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))

import { toCharacterFull, type CharacterFull } from '@/features/characters/characters.api'
import type { Combat, CombatEntry, OrderRow } from '@/features/combat/combat.api'

const stats = { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 }

export function character(id: string, name: string, over: { hp?: Record<string, number>; conditions?: string[]; owner?: string } = {}): CharacterFull {
  return toCharacterFull({
    id, owner_id: over.owner ?? `u-${id}`, system_id: 'dnd5e-2024', name, level: 3, stats,
    resources: {
      hp: { current: 22, max: 30, temp: 0, ...over.hp },
      spell_slots: { tiers: {} },
      hit_dice: { current: 1, max: 1 },
      death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
      death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
    },
    conditions: over.conditions ?? [], details: {}, notes: null, portrait_url: null,
    character_picks: [{ character_id: id, content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, content: { id: 'cls', name: 'Rogue', kind: 'class', data: {} } }],
    character_items: [],
  } as never)
}

export function combat(over: Partial<Combat> = {}): Combat {
  return {
    id: 'cb1', campaign_id: 'camp1', session_id: 's1', status: 'active', round: 1, turn_entry_id: null,
    rev: 1, started_by: null, created_at: '', updated_at: '', ...over,
  }
}

export function orderRow(over: Partial<OrderRow> & { id: string }): OrderRow {
  return { campaign_id: 'camp1', combat_id: 'cb1', kind: 'player', user_id: null, character_id: null, name: null, initiative: null, position: 1, ...over }
}

export function entry(over: Partial<CombatEntry> & { id: string }): CombatEntry {
  return {
    ac: null, campaign_id: 'camp1', character_id: null, combat_id: 'cb1', group_id: null, hidden: false, hp: null,
    initiative: null, is_current: false, kind: 'player', last_batch: null, max_hp: null, name: null, notes: null,
    position: 1, prev_hp: null, prev_temp: null, temp_hp: 0, user_id: null, ...over,
  }
}

export function enemy(over: Partial<CombatEntry> & { id: string }): CombatEntry {
  return entry({ kind: 'enemy', name: 'Goblin', hp: 7, max_hp: 7, ...over })
}
