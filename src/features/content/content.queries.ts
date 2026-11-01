import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { qk, type ContentScope } from '@/lib/query-client'
import type { SystemId } from '@/systems/types'

/**
 * Content rows of one kind (no server-side search; filter client-side). content.api is required
 * lazily: system builder steps use this hook, and the system registry must stay importable
 * (rules, schemas, tests) without constructing the Supabase client.
 */
export function useContentList(systemId: SystemId, kind: string, scope: ContentScope = 'all') {
  return useQuery({
    queryKey: qk.content(systemId, kind, scope),
    queryFn: () => {
      const { listContent } = require('./content.api') as typeof import('./content.api')
      return listContent({ systemId, kind, scope })
    },
  })
}

/**
 * Name search across several content kinds (server-side ilike), merged and sorted by name.
 * Keeps the previous results on screen while a new search term loads.
 */
export function useContentSearch(systemId: SystemId, kinds: string[], scope: ContentScope, search: string) {
  const term = search.trim()
  return useQueries({
    queries: kinds.map((kind) => ({
      queryKey: [...qk.content(systemId, kind, scope), 'search', term] as const,
      queryFn: () => {
        const { listContent } = require('./content.api') as typeof import('./content.api')
        return listContent({ systemId, kind, scope, search: term })
      },
      placeholderData: keepPreviousData,
    })),
    combine: (results) => ({
      data: results.flatMap((r) => r.data ?? []).sort((a, b) => a.name.localeCompare(b.name)),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
      refetch: () => results.forEach((r) => r.refetch()),
    }),
  })
}
