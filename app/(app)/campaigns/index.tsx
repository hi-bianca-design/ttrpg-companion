import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { UsersThree } from 'phosphor-react-native'
import { EmptyState, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { CampaignCard } from '@/features/campaigns/CampaignCard'
import { useCampaigns } from '@/features/campaigns/campaigns.queries'
import { ERROR_COPY } from '@/features/errors'

export default function CampaignsIndex() {
  const router = useRouter()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useCampaigns()
  const create = () => router.push('/(app)/campaigns/new')
  const join = () => router.push('/(app)/campaigns/join')

  return (
    <ScreenBackground scroll>
      <Text variant="title">Campaigns</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" onPress={create}>
          <Text>New campaign</Text>
        </Button>
        <Button size="sm" variant="outline" onPress={join}>
          <Text>Join with code</Text>
        </Button>
      </View>

      {isLoading ? (
        <View className="gap-2" accessibilityLabel="Loading campaigns">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-full bg-muted" />
              <View className="h-4 w-1/3 rounded-full bg-muted" />
            </Card>
          ))}
        </View>
      ) : isError ? (
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">{ERROR_COPY.load_failed}</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="No campaigns yet"
          body="Run a game as the GM, or join your group’s campaign with the code they share."
        />
      ) : (
        <View className="gap-2">
          {data.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              isGm={c.gm_id === user?.id}
              onPress={() => router.push({ pathname: '/(app)/campaigns/[id]', params: { id: c.id } })}
            />
          ))}
        </View>
      )}
    </ScreenBackground>
  )
}
