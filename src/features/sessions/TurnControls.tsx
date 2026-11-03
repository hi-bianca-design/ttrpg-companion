import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/useAuth'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { ERROR_COPY } from '@/features/errors'
import { useActiveSession, useSetTurn } from './sessions.queries'
import { eligibleTurnMembers } from './turn'

const name = (m: { username: string | null }) => m.username ?? 'Unknown player'

/** GM only, while the session is in combat: give the turn to a member, or clear it. */
export function TurnControls({ campaign }: { campaign: CampaignFull }) {
  const { user } = useAuth()
  const session = useActiveSession(campaign.id).data ?? null
  const setTurn = useSetTurn(campaign.id)

  if (campaign.gm_id !== user?.id || !session?.in_combat) return null

  const targets = eligibleTurnMembers(campaign.members)
  const holder = targets.find((m) => m.user_id === session.current_turn_user_id)

  // mutateAsync, not mutate's per-call onError: that callback is dropped if this panel unmounts
  // first, which it does when a refetch finds combat has ended.
  const give = (userId: string | null) => {
    setTurn
      .mutateAsync({ sessionId: session.id, userId })
      .catch((e) => showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed))
  }

  return (
    <View className="gap-2">
      <Text variant="subhead">Turn</Text>
      <Text variant="body-sm" tone="muted">{holder ? `${name(holder)}'s turn` : 'Pick whose turn it is'}</Text>
      {targets.map((m) => (
        <Card key={m.user_id} compact>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text variant="subhead" numberOfLines={1}>{name(m)}</Text>
              {m.character_name ? <Text variant="body-sm" tone="muted" numberOfLines={1}>{m.character_name}</Text> : null}
            </View>
            {m.user_id === holder?.user_id ? (
              <Badge variant="tinted">Their turn</Badge>
            ) : (
              <Button variant="outline" size="sm" accessibilityLabel={`Give turn to ${name(m)}`} onPress={() => give(m.user_id)}>
                <Text>Give turn</Text>
              </Button>
            )}
          </View>
        </Card>
      ))}
      {holder ? (
        <Button variant="ghost" size="sm" accessibilityLabel="Clear turn" onPress={() => give(null)}>
          <Text>Clear turn</Text>
        </Button>
      ) : null}
    </View>
  )
}
