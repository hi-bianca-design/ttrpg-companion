import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database.types'
import { getSystem } from '@/systems/registry'
import type {
  CharacterRecord, DerivedValue, NewCharacter, PickRecord, ResourceValue, SystemId,
} from '@/systems/types'
import { check, unwrap } from '@/features/errors'
import { currentUserId } from '@/features/session'

type ContentRow = Database['public']['Tables']['content']['Row']
type PickRow = Database['public']['Tables']['character_picks']['Row']
type ItemRow = Database['public']['Tables']['character_items']['Row']

export type PickWithContent = PickRow & { content: ContentRow | null }
export type ItemWithContent = ItemRow & { content: ContentRow | null }

export type CharacterSummary = {
  id: string
  name: string
  level: number
  system_id: string
  class_name: string | null
  hp: { current: number; max: number } | null
}

export type CharacterFull = CharacterRecord & {
  owner_id: string
  notes: string | null
  portrait_url: string | null
  picks: PickWithContent[]
  items: ItemWithContent[]
  derived: DerivedValue[]
}

function readHp(resources: unknown): CharacterSummary['hp'] {
  const hp = (resources as { hp?: { current?: unknown; max?: unknown } } | null)?.hp
  return typeof hp?.current === 'number' && typeof hp.max === 'number' ? { current: hp.current, max: hp.max } : null
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  const rows = unwrap(
    await supabase
      .from('characters')
      .select('id, name, level, system_id, resources, character_picks(kind, content(name))')
      .eq('owner_id', await currentUserId())
      .order('updated_at', { ascending: false }),
  ) ?? []
  return rows.map((r) => {
    const cls = r.character_picks.find((p) => p.kind === 'class')
    return {
      id: r.id,
      name: r.name,
      level: r.level,
      system_id: r.system_id,
      class_name: cls?.content?.name ?? null,
      hp: readHp(r.resources),
    }
  })
}

export async function getCharacter(id: string): Promise<CharacterFull> {
  const row = unwrap(
    await supabase
      .from('characters')
      .select('*, character_picks(*, content(*)), character_items(*, content(*))')
      .eq('id', id)
      .single(),
  )
  const { character_picks, character_items, ...c } = row
  const systemId = c.system_id as SystemId
  const system = getSystem(systemId)
  const record: CharacterRecord = {
    id: c.id,
    system_id: systemId,
    name: c.name,
    level: c.level,
    stats: system.schemas.stats.parse(c.stats) as CharacterRecord['stats'],
    resources: system.schemas.resources.parse(c.resources) as CharacterRecord['resources'],
    conditions: c.conditions,
    details: system.schemas.details.parse(c.details) as CharacterRecord['details'],
  }
  const picks = character_picks as PickWithContent[]
  const items = character_items as ItemWithContent[]

  // Rules read equipped armor etc. from pick state, so items are presented as picks.
  const ruleInput: PickRecord[] = [
    ...picks.flatMap((p) => p.content ? [{
      content_id: p.content_id,
      kind: p.content.kind,
      state: (p.state ?? {}) as Record<string, unknown>,
      acquired_at_level: p.acquired_at_level,
      content: { name: p.content.name, data: p.content.data },
    }] : []),
    ...items.flatMap((i) => i.content ? [{
      content_id: i.content_id,
      kind: i.content.kind,
      state: { equipped: i.equipped, attuned: i.attuned },
      acquired_at_level: 0,
      content: { name: i.content.name, data: i.content.data },
    }] : []),
  ]

  return {
    ...record,
    owner_id: c.owner_id,
    notes: c.notes,
    portrait_url: c.portrait_url,
    picks,
    items,
    derived: system.rules.derived(record, ruleInput),
  }
}

export async function createCharacter(input: NewCharacter): Promise<string> {
  const { picks, ...fields } = input
  const owner_id = await currentUserId()
  const { id } = unwrap(
    await supabase
      .from('characters')
      .insert({ ...fields, owner_id, stats: fields.stats as Json, resources: fields.resources as unknown as Json, details: fields.details as Json })
      .select('id')
      .single(),
  )
  if (picks.length > 0) {
    const res = await supabase.from('character_picks').insert(
      picks.map((p) => ({
        character_id: id, content_id: p.content_id, kind: p.kind, state: p.state as Json, acquired_at_level: p.acquired_at_level,
      })),
    )
    if (res.error) {
      await supabase.from('characters').delete().eq('id', id) // best-effort rollback; the original error is what matters
      check(res)
    }
  }
  return id
}

/** Deletes a character; picks and items go with it (ON DELETE CASCADE). */
export async function deleteCharacter(id: string): Promise<void> {
  check(await supabase.from('characters').delete().eq('id', id))
}

export async function updateResources(id: string, resources: Record<string, ResourceValue>): Promise<void> {
  check(await supabase.from('characters').update({ resources: resources as unknown as Json }).eq('id', id))
}

export type CharacterPatch = Partial<Pick<CharacterRecord, 'name' | 'level' | 'stats' | 'conditions' | 'details' | 'resources'>>

export async function updateCharacter(id: string, patch: CharacterPatch): Promise<void> {
  check(await supabase.from('characters').update(patch as Database['public']['Tables']['characters']['Update']).eq('id', id))
}

export async function addItem(characterId: string, contentId: string, quantity: number): Promise<void> {
  check(await supabase.from('character_items').insert({ character_id: characterId, content_id: contentId, quantity }))
}

export type ItemPatch = { quantity?: number; equipped?: boolean; attuned?: boolean; notes?: string }

export async function updateItem(itemId: string, patch: ItemPatch): Promise<void> {
  check(await supabase.from('character_items').update(patch).eq('id', itemId))
}

export async function removeItem(itemId: string): Promise<void> {
  check(await supabase.from('character_items').delete().eq('id', itemId))
}
