import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { NavRow, ScreenBackground } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QrCode } from 'phosphor-react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { InviteSheet } from '@/features/campaigns/InviteSheet'
import { PartyPage } from '@/features/combat/PartyPage'
import { CampaignSessionStatus } from '@/features/sessions/CampaignSessionStatus'
import { SessionControls } from '@/features/sessions/SessionControls'
import { useSessionRealtime } from '@/features/sessions/useSessionRealtime'
import { useCampaign } from '@/features/campaigns/campaigns.queries'
import { useOfflineRestoring } from '@/lib/offlineRestore'
import { THEME_COLORS } from '@/lib/theme'
import { systemName } from '@/systems/registry'
import { ERROR_COPY } from '@/features/errors'

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { data, isLoading, isError, fetchStatus, refetch } = useCampaign(id)
  const restoring = useOfflineRestoring()
  useSessionRealtime(data?.id)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Offline (the fetch is paused) or while the GM's persisted cache is still being read, no data yet means
  // loading, not a failure: a reload while offline restores the campaign from the device.
  if (isLoading || (!data && (fetchStatus === 'paused' || restoring))) {
    return (
      <ScreenBackground>
        <View className="gap-2" accessibilityLabel="Loading campaign">
          {[0, 1].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-sm bg-muted" />
              <View className="h-4 w-1/3 rounded-sm bg-muted" />
            </Card>
          ))}
        </View>
      </ScreenBackground>
    )
  }

  if (isError || !data) {
    return (
      <ScreenBackground>
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">{ERROR_COPY.load_failed}</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  const isGm = data.gm_id === user?.id
  return (
    <ScreenBackground scroll>
      <View className="gap-4">
        <View className="gap-3">
          {isGm ? (
            <NavRow>
              <View />
              <Button variant="outline" size="sm" accessibilityLabel="Invite players" onPress={() => setInviteOpen(true)}>
                <QrCode size={16} color={THEME_COLORS.accentForeground} />
                <Text>Invite</Text>
              </Button>
            </NavRow>
          ) : null}
          <View className="gap-2">
            <Text variant="title" numberOfLines={2}>{data.name}</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge variant={isGm ? 'accent' : 'default'}>{isGm ? 'GM' : 'Player'}</Badge>
              <Badge>{systemName(data.system_id)}</Badge>
            </View>
          </View>
          {data.description ? <Text variant="narrative" tone="muted">{data.description}</Text> : null}
        </View>
        {isGm ? <InviteSheet code={data.invite_code} open={inviteOpen} onOpenChange={setInviteOpen} /> : null}
        <View className="gap-3">
          <CampaignSessionStatus campaignId={data.id} />
          <SessionControls campaign={data} />
        </View>
      </View>
      <PartyPage campaign={data} />
    </ScreenBackground>
  )
}
