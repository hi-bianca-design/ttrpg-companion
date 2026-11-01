// Pure mapping from fetched pick / item rows to the PickRecord shape system rules and
// sheet sections read. Kept out of characters.api so screens can use it without importing Supabase.
import type { Database } from '@/types/database.types'
import type { PickRecord } from '@/systems/types'

type ContentRow = Database['public']['Tables']['content']['Row']
type PickRow = Database['public']['Tables']['character_picks']['Row']
type ItemRow = Database['public']['Tables']['character_items']['Row']

export type PickWithContent = PickRow & { content: ContentRow | null }
export type ItemWithContent = ItemRow & { content: ContentRow | null }

/** Picks plus items (as picks, so rules can read equipped armour etc.); rows without content are dropped. */
export function toRuleInput(picks: PickWithContent[], items: ItemWithContent[]): PickRecord[] {
  return [
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
}
