import type { CampaignSummary } from '@/features/campaigns/campaigns.api'
import type { CharacterSummary } from '@/features/characters/characters.api'
import type { Session } from '@/features/sessions/sessions.api'

export type UpNext =
  | { kind: 'turn'; campaign: CampaignSummary }
  | { kind: 'live'; campaign: CampaignSummary }
  | { kind: 'recent'; character: CharacterSummary }
  | { kind: 'none' }

type Input = {
  /** Campaigns whose combat order points at one of the viewer's own rows (see useHomeData). */
  turnCampaignIds: readonly string[]
  campaigns: CampaignSummary[]
  /** Active session per campaign id; null = none, undefined = not loaded (or failed) yet. */
  sessions: Record<string, Session | null | undefined>
  /** Newest-updated first, as `listCharacters` returns them. */
  characters: CharacterSummary[]
}

/** What Home's top card should show: your turn, else a live session, else the latest character. */
export function selectUpNext({ turnCampaignIds, campaigns, sessions, characters }: Input): UpNext {
  const live = campaigns.filter((c) => !!sessions[c.id])
  const mine = live.find((c) => turnCampaignIds.includes(c.id))
  if (mine) return { kind: 'turn', campaign: mine }
  if (live[0]) return { kind: 'live', campaign: live[0] }
  if (characters[0]) return { kind: 'recent', character: characters[0] }
  return { kind: 'none' }
}
