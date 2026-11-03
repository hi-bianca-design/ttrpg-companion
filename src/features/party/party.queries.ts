import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { qk } from '@/lib/query-client'
import { getPartyCharacters } from './party.api'

/** Derived values (AC, passive scores, speed) come from picks and items, which are not pushed live: refresh them slowly. */
export const PARTY_REFRESH_MS = 60_000

/** The characters of the campaign's active members who have one attached. */
export function partyCharacterIds(campaign: CampaignFull | undefined): string[] {
  return (campaign?.members ?? []).flatMap((m) => (m.status === 'active' && m.character_id ? [m.character_id] : []))
}

/** Prefixed by `qk.party(campaignId)` so a whole campaign's party data invalidates together. */
export const partyKey = (campaignId: string, ids: string[]) => [...qk.party(campaignId), ids.join(',')] as const

export function usePartyCharacters(campaign: CampaignFull | undefined) {
  const ids = partyCharacterIds(campaign)
  return useQuery({
    queryKey: partyKey(campaign?.id ?? '', ids),
    queryFn: () => getPartyCharacters(ids),
    enabled: !!campaign,
    placeholderData: keepPreviousData,
    refetchInterval: PARTY_REFRESH_MS,
  })
}
