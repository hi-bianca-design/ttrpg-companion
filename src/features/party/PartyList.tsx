import { useEffect } from 'react'
import { AccessibilityInfo, Platform, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { ERROR_COPY } from '@/features/errors'
import { PartyCard } from './PartyCard'
import { usePartyCharacters } from './party.queries'
import { usePartyRealtime } from './usePartyRealtime'

const nameOf = (m: { username: string | null }) => m.username ?? 'Unknown player'

/**
 * The party: a card per active member's character (by character name), then the members who have
 * none yet. The GM has no character and is not listed. Live; says so when the connection drops.
 */
export function PartyList({ campaign }: { campaign: CampaignFull }) {
  const party = usePartyCharacters(campaign)
  const { connected } = usePartyRealtime(campaign)
  // accessibilityLiveRegion is Android-only; iOS needs an explicit announcement.
  useEffect(() => {
    if (!connected && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Reconnecting')
  }, [connected])
  const members = campaign.members.filter((m) => m.status === 'active' && m.role !== 'gm')

  if (party.isError && !party.data) {
    return (
      <View className="items-start gap-2">
        <Text variant="caption" tone="destructive">{ERROR_COPY.load_failed}</Text>
        <Button variant="outline" size="sm" accessibilityLabel="Try again" onPress={() => party.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  if (party.isLoading) {
    return (
      <View className="gap-2" accessibilityLabel="Loading party">
        {[0, 1].map((i) => (
          <Card key={i} compact className="gap-3">
            <View className="h-4 w-1/2 rounded-sm bg-muted" />
            <View className="h-3 w-full rounded-sm bg-muted" />
          </Card>
        ))}
      </View>
    )
  }

  if (members.length === 0) {
    return <Text variant="body-sm" tone="muted">No one has joined with a character yet</Text>
  }

  const loaded = party.data ?? []
  const byId = new Map(loaded.map((c) => [c.id, c]))
  const withCharacter = members.filter((m) => m.character_id)
  const cards = withCharacter.flatMap((m) => (byId.get(m.character_id!) ? [byId.get(m.character_id!)!] : []))
    .sort((a, b) => a.name.localeCompare(b.name))
  // Every attached character unreadable means the viewer is not an active member (an invitee): show nothing, not errors.
  if (withCharacter.length > 0 && loaded.length === 0) return null
  const unreadable = withCharacter.filter((m) => !byId.has(m.character_id!))
  const without = members.filter((m) => !m.character_id)

  return (
    <View className="gap-2">
      {!connected ? <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">Reconnecting…</Text> : null}
      {cards.map((c) => <PartyCard key={c.id} character={c} />)}
      {unreadable.map((m) => (
        <Card key={m.user_id} compact className="gap-1">
          <Text variant="subhead" numberOfLines={1}>{nameOf(m)}</Text>
          <Text variant="body-sm" tone="muted">Couldn’t load this character</Text>
        </Card>
      ))}
      {without.map((m) => (
        <Card key={m.user_id} compact className="gap-1">
          <Text variant="subhead" numberOfLines={1}>{nameOf(m)}</Text>
          <Text variant="body-sm" tone="muted">No character yet</Text>
        </Card>
      ))}
    </View>
  )
}
