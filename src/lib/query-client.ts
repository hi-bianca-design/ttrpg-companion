import { QueryClient } from '@tanstack/react-query'
import type { SystemId } from '@/systems/types'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export type ContentScope = 'all' | 'official' | 'mine' | { campaignId: string }

export const qk = {
  content: (systemId: SystemId, kind: string, scope: ContentScope) => ['content', systemId, kind, scope] as const,
  character: (id: string) => ['character', id] as const,
  characters: ['characters'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,
}
