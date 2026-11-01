import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk, type ContentScope } from '@/lib/query-client'
import type { SystemId } from '@/systems/types'

/**
 * Content rows of one kind (no server-side search; filter client-side). content.api is required
 * lazily: system builder steps use this hook, and the system registry must stay importable
 * (rules, schemas, tests) without constructing the Supabase client.
 */
export function useContentList(systemId: SystemId, kind: string, scope: ContentScope = 'pickable', enabled = true) {
  return useQuery({
    enabled,
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

/** One content row by id (homebrew edit screen). */
export function useContentItem(id: string | undefined) {
  return useQuery({
    queryKey: ['content', 'item', id] as const,
    enabled: !!id,
    queryFn: () => {
      const { getContent } = require('./content.api') as typeof import('./content.api')
      return getContent(id as string)
    },
  })
}

/** The signed-in user's id (from the stored session), e.g. to tell my homebrew from a campaign row. */
export function useCurrentUserId() {
  return useQuery({
    queryKey: ['session', 'uid'] as const,
    staleTime: Infinity,
    queryFn: () => {
      const { currentUserId } = require('@/features/session') as typeof import('@/features/session')
      return currentUserId()
    },
  }).data
}

/** Content lists plus every cached character: sheets resolve picks/items through the content rows. */
function invalidateContentAndCharacters(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['content'] }),
    qc.invalidateQueries({ queryKey: ['character'] }),
    qc.invalidateQueries({ queryKey: qk.characters }),
  ])
}

/** Create or update a homebrew row; every cached content list (builder, picker, My homebrew) and sheet refreshes. */
export function useSaveHomebrew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: import('./content.api').SaveHomebrewInput) => {
      const { saveHomebrew } = require('./content.api') as typeof import('./content.api')
      return saveHomebrew(input)
    },
    onSuccess: () => invalidateContentAndCharacters(qc),
  })
}

export function useDeleteHomebrew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      const { deleteHomebrew } = require('./content.api') as typeof import('./content.api')
      return deleteHomebrew(id)
    },
    onSuccess: () => invalidateContentAndCharacters(qc),
  })
}
