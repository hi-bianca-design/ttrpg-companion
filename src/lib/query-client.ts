import { QueryClient } from '@tanstack/react-query'
import type { SystemId } from '@/systems/types'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/**
 * Which content rows a list shows. 'pickable' is what the caller may put on a sheet (it mirrors the
 * DB's can_reference_content): official rows, their own homebrew, and campaign-scoped rows of campaigns
 * they GM or belong to. It deliberately leaves out other players' homebrew that RLS lets them *read*
 * because it sits on a campaign character's sheet.
 */
export type ContentScope = 'pickable' | 'official' | 'mine' | { campaignId: string }

export const qk = {
  content: (systemId: SystemId, kind: string, scope: ContentScope) => ['content', systemId, kind, scope] as const,
  character: (id: string) => ['character', id] as const,
  characters: ['characters'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,
  packs: ['packs'] as const,
  entitlements: ['entitlements'] as const,
}
