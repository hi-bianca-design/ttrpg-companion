import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useActiveSession } from './sessions.queries'
import type { Session } from './sessions.api'

/**
 * The active session of the campaign this character is in. Null while the campaign loads, when
 * the character is in no campaign, when there is no session, or when either query fails —
 * callers show nothing rather than an error.
 */
export function useCharacterSession(characterId: string | undefined): Session | null {
  const campaign = useCharacterCampaign(characterId)
  const session = useActiveSession(campaign.data?.id)
  return session.data ?? null
}
