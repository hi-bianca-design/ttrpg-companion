import { useQueries } from '@tanstack/react-query'
import { useCampaigns } from '@/features/campaigns/campaigns.queries'
import { useAuth } from '@/features/auth/useAuth'
import { getActiveCombat, getCombatOrder } from '@/features/combat/combat.api'
import { useCharacters } from '@/features/characters/characters.queries'
import { getActiveSession, type Session } from '@/features/sessions/sessions.api'
import { SESSION_POLL_MS } from '@/features/sessions/sessions.queries'
import { qk } from '@/lib/query-client'

/** Home has no Realtime channel, so a campaign in combat is polled for the turn (the session itself is the 60 s safety net). */
const HOME_TURN_POLL_MS = 10_000

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

  // "Your turn" lives in the combat now: for each campaign in combat, is the pointer on one of my rows?
  // Same keys as the campaign screen, so its Realtime invalidations keep these fresh too.
  const { user } = useAuth()
  const inCombat = list.filter((c) => sessions[c.id]?.in_combat)
  const combatQueries = useQueries({
    queries: inCombat.map((c) => ({ queryKey: qk.combat(c.id), queryFn: () => getActiveCombat(c.id), refetchInterval: HOME_TURN_POLL_MS })),
  })
  const combats = inCombat.map((c, i) => ({ campaignId: c.id, combat: combatQueries[i]?.data }))
  const live = combats.filter((x) => x.combat?.status === 'active')
  const orderQueries = useQueries({
    queries: live.map((x) => ({ queryKey: qk.combatOrder(x.combat!.id), queryFn: () => getCombatOrder(x.combat!.id), refetchInterval: HOME_TURN_POLL_MS })),
  })
  const turnCampaignIds = live.flatMap((x, i) => {
    const mine = user ? orderQueries[i]?.data?.find((r) => r.user_id === user.id) : undefined
    return mine && x.combat!.turn_entry_id === mine.id ? [x.campaignId] : []
  })

  return {
    characters: characters.data ?? [],
    campaigns: list,
    sessions,
    turnCampaignIds,
    isLoading: characters.isLoading || campaigns.isLoading,
    isError: characters.isError || campaigns.isError,
    refetch: () => { characters.refetch(); campaigns.refetch() },
  }
}
