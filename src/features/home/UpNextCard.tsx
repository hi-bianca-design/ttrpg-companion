import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { UpNext } from './selectUpNext'

/** Home's top card: what needs the player now. Renders nothing when there is nothing to resume. */
export function UpNextCard({ upNext }: { upNext: UpNext }) {
  const router = useRouter()
  if (upNext.kind === 'none') return null

  if (upNext.kind === 'recent') {
    const { character } = upNext
    return (
      <Card tone="accent" className="gap-3">
        <Text variant="eyebrow">Pick up where you left off</Text>
        <Text variant="subhead" numberOfLines={1}>{character.name}</Text>
        <Button accessibilityLabel="Open character" onPress={() => router.push(`/(app)/characters/${character.id}`)}>
          <Text>Open character</Text>
        </Button>
      </Card>
    )
  }

  const { campaign } = upNext
  const turn = upNext.kind === 'turn'
  const label = turn ? 'Open turn' : 'Open session'
  return (
    <Card tone="accent" className="gap-3">
      <View className="flex-row">
        <Badge variant="accent">{turn ? 'Your turn' : 'Live'}</Badge>
      </View>
      <Text variant="subhead" numberOfLines={1}>{campaign.name}</Text>
      <Button accessibilityLabel={label} onPress={() => router.push({ pathname: '/(app)/campaigns/[id]', params: { id: campaign.id } })}>
        <Text>{label}</Text>
      </Button>
    </Card>
  )
}
