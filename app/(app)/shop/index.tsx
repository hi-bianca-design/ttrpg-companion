import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { Package } from 'phosphor-react-native'
import { BackButton, EmptyState, NavRow, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { PackCard } from '@/features/packs/PackCard'
import { useMyPackIds, usePacks } from '@/features/packs/packs.queries'

export default function ShopScreen() {
  const router = useRouter()
  const packs = usePacks()
  const mine = useMyPackIds()
  const loading = packs.isLoading || mine.isLoading
  const failed = packs.isError || mine.isError
  const retry = () => {
    packs.refetch()
    mine.refetch()
  }

  return (
    <ScreenBackground scroll>
      <NavRow>
        <BackButton onPress={() => router.back()} />
      </NavRow>
      <Text variant="title">Packs</Text>

      {loading ? (
        <View className="gap-2" accessibilityLabel="Loading packs">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-sm bg-muted" />
              <View className="h-4 w-1/3 rounded-sm bg-muted" />
            </Card>
          ))}
        </View>
      ) : failed ? (
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load packs. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={retry}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (packs.data ?? []).length === 0 ? (
        <EmptyState
          icon={Package}
          title="No packs yet"
          body="New content and art packs are on the way. They'll show up here."
        />
      ) : (
        <View className="gap-2">
          {(packs.data ?? []).map((p) => (
            <PackCard key={p.id} pack={p} owned={mine.data?.has(p.id) ?? false} />
          ))}
        </View>
      )}
    </ScreenBackground>
  )
}
