import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CancelButton, NavRow, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { ContentForm } from '@/features/content/ContentForm'
import { useContentItem } from '@/features/content/content.queries'
import { getSystem } from '@/systems/registry'
import type { SystemId } from '@/systems/types'

export default function EditContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useContentItem(id)

  if (isLoading) {
    return (
      <ScreenBackground>
        <View className="gap-2" accessibilityLabel="Loading homebrew">
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
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load this homebrew. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  const systemId = data.system_id as SystemId
  const def = getSystem(systemId).contentKinds[data.kind]

  return (
    <ScreenBackground scroll>
      <View className="gap-3">
        <NavRow>
          <CancelButton onPress={() => router.back()} />
        </NavRow>
        <Text variant="title" numberOfLines={1}>{`Edit ${def.label.toLowerCase()}`}</Text>
      </View>
      <ContentForm
        systemId={systemId}
        kind={data.kind}
        initial={data}
        onSaved={() => router.back()}
        onDeleted={() => router.back()}
      />
    </ScreenBackground>
  )
}
