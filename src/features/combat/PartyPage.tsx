import { useEffect } from 'react'
import { AccessibilityInfo, Platform, View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { PartyList } from '@/features/party/PartyList'
import { usePartyCharacters } from '@/features/party/party.queries'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { CombatStarting } from './CombatStarting'
import { GmBattleOrder } from './GmBattleOrder'
import { PlayerBattleOrder } from './PlayerBattleOrder'
import { RollCall } from './RollCall'
import { useActiveCombat } from './combat.queries'
import { useCombatRealtime } from './useCombatRealtime'

/**
 * The Party section, which becomes the battle order while a fight is on: the Phase 1 list with no combat,
 * the roll call (GM) or "Combat is starting" (everyone else) while rolling, and the GM or player order once
 * it is active. Only the GM and active members ever query or subscribe to combat, so an invitee or outsider
 * gets the plain list. One `Reconnecting…` marker covers both live channels.
 */
export function PartyPage({ campaign }: { campaign: CampaignFull }) {
  const { user } = useAuth()
  const isGm = !!user && campaign.gm_id === user.id
  const isActiveMember = !!user && campaign.members.some((m) => m.user_id === user.id && m.status === 'active')
  const live = isGm || isActiveMember

  const combat = useActiveCombat(live ? campaign.id : undefined).data ?? null
  const party = usePartyCharacters(campaign)
  const partyLink = usePartyRealtime(campaign)
  const combatLink = useCombatRealtime(campaign.id, live)
  const connected = partyLink.connected && combatLink.connected
  // accessibilityLiveRegion is Android-only; iOS needs an explicit announcement.
  useEffect(() => {
    if (!connected && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Reconnecting')
  }, [connected])

  const status = live && combat && combat.status !== 'ended' ? combat.status : null
  const characters = party.data ?? []

  let body: React.ReactNode
  if (status === 'rolling' && isGm) {
    body = <RollCall combat={combat!} party={characters} />
  } else if (status === 'rolling') {
    body = (
      <View className="gap-3">
        <CombatStarting />
        <PartyList campaign={campaign} managed />
      </View>
    )
  } else if (status === 'active') {
    body = isGm
      ? <GmBattleOrder campaign={campaign} combat={combat!} party={characters} />
      : <PlayerBattleOrder campaign={campaign} combat={combat!} party={characters} />
  } else {
    body = <PartyList campaign={campaign} managed />
  }

  return (
    <SectionHeader id={`campaign:${campaign.id}:party`} title={status === 'active' ? 'Battle order' : 'Party'}>
      <View className="gap-2">
        {!connected ? <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">Reconnecting…</Text> : null}
        {body}
      </View>
    </SectionHeader>
  )
}
