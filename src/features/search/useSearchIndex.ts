import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useEncounters } from '@/features/encounters/encounters.queries'
import { qk } from '@/lib/query-client'
import type { SystemId } from '@/systems/types'
import type { SearchResult } from './search'

const SEARCH_KINDS = ['spell', 'magic_item', 'item', 'feat', 'class', 'species', 'background', 'subclass'] as const

/** Loaded once per system and kept a day, so search keeps working from the cache (persisted later). */
const STALE_TIME = 24 * 60 * 60 * 1000

/**
 * Everything the GM can search: the official content of the kinds above plus the campaign's saved
 * encounters. GM only: a player never triggers a fetch. `ready` is true once every source has settled.
 */
export function useSearchIndex(systemId: string, campaignId: string, isGm: boolean): { items: SearchResult[]; ready: boolean } {
  const encounters = useEncounters(campaignId, isGm)
  const sources = useQueries({
    queries: SEARCH_KINDS.map((kind) => ({
      queryKey: qk.content(systemId as SystemId, kind, 'official'),
      enabled: isGm,
      staleTime: STALE_TIME,
      queryFn: () => {
        // Required lazily, like content.queries: the Supabase client is built only when a fetch runs.
        const { listContent } = require('@/features/content/content.api') as typeof import('@/features/content/content.api')
        return listContent({ systemId: systemId as SystemId, kind, scope: 'official' })
      },
    })),
    combine: (results) => ({
      rows: results.flatMap((r) => r.data ?? []),
      settled: results.every((r) => r.isSuccess || r.isError),
    }),
  })

  const items = useMemo<SearchResult[]>(
    () => [
      ...sources.rows.map((r) => ({ id: r.id, kind: r.kind, name: r.name, summary: r.description ?? r.summary ?? null, group: 'SRD' as const })),
      ...(encounters.data ?? []).map((e) => ({ id: e.id, kind: 'encounter', name: e.name, summary: e.story_why, group: 'Encounters' as const })),
    ],
    [sources.rows, encounters.data],
  )
  return { items, ready: isGm && sources.settled && !encounters.isPending }
}
