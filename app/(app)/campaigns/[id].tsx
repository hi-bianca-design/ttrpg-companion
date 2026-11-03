import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { BackButton, NavRow, ScreenBackground, SectionHeader } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QrCode } from 'phosphor-react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { InviteSheet } from '@/features/campaigns/InviteSheet'
import { PartyList } from '@/features/party/PartyList'
import { CampaignSessionStatus } from '@/features/sessions/CampaignSessionStatus'
import { SessionControls } from '@/features/sessions/SessionControls'
import { TurnControls } from '@/features/sessions/TurnControls'
import { useCampaign } from '@/features/campaigns/campaigns.queries'
import { useReturnToSheet } from '@/features/campaigns/useReturnToSheet'
import { THEME_COLORS } from '@/lib/theme'
import { systemName } from '@/systems/registry'
import { ERROR_COPY } from '@/features/errors'

export default function CampaignDetailScreen() {
  const { id, fromCharacter } = useLocalSearchParams<{ id: string; fromCharacter?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useCampaign(id)
  const returnToSheet = useReturnToSheet()
  const [inviteOpen, setInviteOpen] = useState(false)
  // Opened from a character sheet's Campaign tab, Back returns to that tab (see useReturnToSheet).
  // Opened directly there is nothing to go back to.
  const back = () => {
    if (fromCharacter) returnToSheet(fromCharacter)
    else if (router.canGoBack()) router.back()
    else router.replace('/(app)/campaigns')
  }
  const nav = (
    <NavRow>
      <BackButton onPress={back} />
    </NavRow>
  )

  if (isLoading) {
    return (
      <ScreenBackground>
        {nav}
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
        {nav}
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
      <View className="gap-3">
        <NavRow>
          <BackButton onPress={back} />
          {isGm ? (
            <Button variant="outline" size="sm" accessibilityLabel="Invite players" onPress={() => setInviteOpen(true)}>
              <QrCode size={16} color={THEME_COLORS.accentForeground} />
              <Text>Invite</Text>
            </Button>
          ) : null}
        </NavRow>
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
        <TurnControls campaign={data} />
      </View>
      <SectionHeader id={`campaign:${data.id}:party`} title="Party">
        <PartyList campaign={data} />
      </SectionHeader>
    </ScreenBackground>
  )
}
