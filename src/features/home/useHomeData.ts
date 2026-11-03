import { useQueries } from '@tanstack/react-query'
import { useCampaigns } from '@/features/campaigns/campaigns.queries'
import { useCharacters } from '@/features/characters/characters.queries'
import { getActiveSession, type Session } from '@/features/sessions/sessions.api'
import { SESSION_POLL_MS } from '@/features/sessions/sessions.queries'
import { qk } from '@/lib/query-client'

/**
 * Everything Home shows, from the existing queries. Sessions share `useActiveSession`'s keys and poll, so
 * they stay in step with the campaign screen. A session that is loading or failed is `undefined` for that
 * campaign only; it never blocks the lists.
 */
export function useHomeData() {
  const characters = useCharacters()
  const campaigns = useCampaigns()
  const list = campaigns.data ?? []
  const sessionQueries = useQueries({
    queries: list.map((c) => ({
      queryKey: qk.session(c.id),
      queryFn: () => getActiveSession(c.id),
      refetchInterval: SESSION_POLL_MS,
    })),
  })
  const sessions: Record<string, Session | null | undefined> = {}
  list.forEach((c, i) => { sessions[c.id] = sessionQueries[i]?.data })

  return {
    characters: characters.data ?? [],
    campaigns: list,
    sessions,
    isLoading: characters.isLoading || campaigns.isLoading,
    isError: characters.isError || campaigns.isError,
    refetch: () => { characters.refetch(); campaigns.refetch() },
  }
}
