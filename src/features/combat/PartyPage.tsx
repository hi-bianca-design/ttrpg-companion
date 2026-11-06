import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform, View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { useEncounters } from '@/features/encounters/encounters.queries'
import { useActiveSession } from '@/features/sessions/sessions.queries'
import { PartyList } from '@/features/party/PartyList'
import { usePartyCharacters } from '@/features/party/party.queries'
import { usePartyRealtime } from '@/features/party/usePartyRealtime'
import { CombatStarting } from './CombatStarting'
import { GmBattleOrder } from './GmBattleOrder'
import { PlayerBattleOrder } from './PlayerBattleOrder'
import { EncounterPicker } from './EncounterPicker'
import { ReviewScreen } from './ReviewScreen'
import { useActiveCombat } from './combat.queries'
import { useCombatRealtime } from './useCombatRealtime'

/**
 * The Party section, which becomes the battle order while a fight is on: the Phase 1 list with no combat
 * (plus, for the GM in a live session, a "Run a fight" encounter picker), the review screen (GM) or
 * "Combat is starting" (everyone else) while rolling, and the GM or player order once
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

  // The GM's review: opened by picking an encounter, or by a combat already rolling. Both start from local state.
  const sessionId = useActiveSession(isGm ? campaign.id : undefined).data?.id ?? combat?.session_id
  const encounters = useEncounters(campaign.id, isGm).data ?? []
  const [reviewing, setReviewing] = useState<{ encounterId?: string } | null>(null)
  const [leftRolling, setLeftRolling] = useState(false)
  const review = isGm && !!sessionId && status !== 'active' ? reviewing ?? (status === 'rolling' && !leftRolling ? {} : null) : null
  // Once the fight is live the review is over: forget it so the next fight starts clean.
  useEffect(() => {
    if (status === 'active') {
      setReviewing(null)
      setLeftRolling(false)
    }
  }, [status])
  const closeReview = () => {
    setReviewing(null)
    if (status === 'rolling') setLeftRolling(true)
  }

  let body: React.ReactNode
  if (review) {
    body = (
      <ReviewScreen
        campaign={campaign}
        party={characters}
        sessionId={sessionId!}
        initialEncounterId={review.encounterId}
        onBack={closeReview}
      />
    )
  } else if (status === 'rolling' && !isGm) {
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
    body = (
      <View className="gap-3">
        <PartyList campaign={campaign} managed />
        {isGm && sessionId && status !== 'active' ? (
          <View className="gap-2">
            <Text variant="subhead" accessibilityRole="header">Run a fight</Text>
            <EncounterPicker encounters={encounters} onPick={(id) => setReviewing({ encounterId: id })} />
          </View>
        ) : null}
      </View>
    )
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
