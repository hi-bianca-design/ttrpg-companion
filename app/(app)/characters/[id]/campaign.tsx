import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { CampaignCard } from '@/features/campaigns/CampaignCard'
import { MemberList } from '@/features/campaigns/MemberList'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { ERROR_COPY } from '@/features/errors'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'

export default function CampaignTab() {
  // Own param first, global as fallback (see useCharacterRouteId).
  const id = useCharacterRouteId()
  const router = useRouter()
  const { user } = useAuth()
  const membership = useCharacterCampaign(id)
  const campaign = useCampaign(membership.data?.id)

  if (membership.isLoading || (membership.data && campaign.isLoading)) {
    return (
      <ScreenBackground>
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

  if (membership.isError || campaign.isError) {
    return (
      <ScreenBackground>
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">{ERROR_COPY.load_failed}</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => { membership.refetch(); if (membership.data) campaign.refetch() }}
          >
            <Text>Try again</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  if (!membership.data || !campaign.data) {
    return (
      <ScreenBackground>
        <View className="items-start gap-3 pt-4">
          <Text variant="display">No campaign yet</Text>
          <Text variant="body-sm" tone="muted">Join your group’s campaign with the code from your GM.</Text>
          <Button onPress={() => router.push({ pathname: '/(app)/campaigns/join', params: { characterId: id } })}>
            <Text>Join a campaign</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  const c = campaign.data
  return (
    <ScreenBackground scroll>
      <CampaignCard
        campaign={{ ...c, member_count: c.members.length }}
        isGm={c.gm_id === user?.id}
        onPress={() => router.push({ pathname: '/(app)/campaigns/[id]', params: { id: c.id } })}
      />
      <View className="gap-2">
        <Text variant="heading">Members</Text>
        <MemberList members={c.members} />
      </View>
    </ScreenBackground>
  )
}
