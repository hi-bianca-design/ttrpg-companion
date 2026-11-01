import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { BackButton, NavRow, ScreenBackground, SectionHeader } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { InviteCode } from '@/features/campaigns/InviteCode'
import { MemberList } from '@/features/campaigns/MemberList'
import { useCampaign } from '@/features/campaigns/campaigns.queries'
import { useReturnToSheet } from '@/features/campaigns/useReturnToSheet'
import { systemName } from '@/systems/registry'
import { ERROR_COPY } from '@/features/errors'

export default function CampaignDetailScreen() {
  const { id, fromCharacter } = useLocalSearchParams<{ id: string; fromCharacter?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useCampaign(id)
  const returnToSheet = useReturnToSheet()
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
              <View className="h-4 w-1/2 rounded-full bg-muted" />
              <View className="h-4 w-1/3 rounded-full bg-muted" />
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
        {nav}
        <Text variant="title" numberOfLines={2}>{data.name}</Text>
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge variant={isGm ? 'accent' : 'default'}>{isGm ? 'GM' : 'Player'}</Badge>
        <Badge>{systemName(data.system_id)}</Badge>
      </View>
      {data.description ? <Text variant="body-sm" tone="muted">{data.description}</Text> : null}
      {isGm ? <InviteCode code={data.invite_code} /> : null}
      <SectionHeader id={`campaign:${data.id}:members`} title="Members">
        <MemberList members={data.members} />
      </SectionHeader>
    </ScreenBackground>
  )
}
