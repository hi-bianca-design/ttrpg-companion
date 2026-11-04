import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { Scroll } from 'phosphor-react-native'
import { EmptyState, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { CampaignCard } from '@/features/campaigns/CampaignCard'
import { PartyPage } from '@/features/combat/PartyPage'
import { SessionControls } from '@/features/sessions/SessionControls'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacter } from '@/features/characters/characters.queries'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { ERROR_COPY } from '@/features/errors'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'

export default function CampaignTab() {
  // Own param first, global as fallback (see useCharacterRouteId).
  const id = useCharacterRouteId()
  const router = useRouter()
  const { user } = useAuth()
  const { data: character } = useCharacter(id)
  const membership = useCharacterCampaign(id)
  const campaign = useCampaign(membership.data?.id)

  const header = <SheetHeader name={character?.name} eyebrow="Party" />

  if (membership.isLoading || (membership.data && campaign.isLoading)) {
    return (
      <ScreenBackground>
        {header}
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

  if (membership.isError || campaign.isError) {
    return (
      <ScreenBackground>
        {header}
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
      <ScreenBackground scroll>
        {header}
        <EmptyState
          icon={Scroll}
          title="No campaign yet"
          body="Join your group’s campaign with the code from your GM."
          actionLabel="Join a campaign"
          onAction={() => router.push({ pathname: '/(app)/campaigns/join', params: { characterId: id } })}
        />
      </ScreenBackground>
    )
  }

  const c = campaign.data
  return (
    <ScreenBackground scroll>
      {header}
      <CampaignCard
        campaign={{ ...c, member_count: c.members.length }}
        isGm={c.gm_id === user?.id}
        onPress={() => router.push({ pathname: '/(app)/campaigns/[id]', params: { id: c.id } })}
      />
      <SessionControls campaign={c} />
      <PartyPage campaign={c} />
    </ScreenBackground>
  )
}
