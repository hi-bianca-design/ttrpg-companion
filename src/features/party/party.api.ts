import { supabase } from '@/lib/supabase'
import { unwrap } from '@/features/errors'
import { CHARACTER_SELECT, toCharacterFull, type CharacterFull } from '@/features/characters/characters.api'

/**
 * The party's characters, in one request. Row-level security decides which of them the caller may
 * read. A character whose stored data no longer parses is dropped rather than failing the whole
 * party: one broken sheet must not blank everyone else's.
 */
export async function getPartyCharacters(characterIds: string[]): Promise<CharacterFull[]> {
  if (characterIds.length === 0) return []
  const rows = unwrap(await supabase.from('characters').select(CHARACTER_SELECT).in('id', characterIds)) ?? []
  return rows.flatMap((row) => {
    try {
      return [toCharacterFull(row as Parameters<typeof toCharacterFull>[0])]
    } catch {
      return []
    }
  })
}
