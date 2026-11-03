import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Sword, UsersThree } from 'phosphor-react-native'
import { EmptyState, ScreenBackground } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import { selectUpNext } from '@/features/home/selectUpNext'
import { UpNextCard } from '@/features/home/UpNextCard'
import { useHomeData } from '@/features/home/useHomeData'

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { characters, campaigns, sessions, isLoading, isError, refetch } = useHomeData()
  const upNext = selectUpNext({ userId: user?.id, campaigns, sessions, characters })

  return (
    <ScreenBackground scroll>
      <Text variant="title">Home</Text>

      {isLoading ? (
        <View className="gap-2" accessibilityLabel="Loading home">
          {[0, 1].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-sm bg-muted" />
              <View className="h-4 w-1/3 rounded-sm bg-muted" />
            </Card>
          ))}
        </View>
      ) : isError ? (
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load your games. Check your connection.</Text>
          <Button variant="outline" size="sm" accessibilityLabel="Try again" onPress={refetch}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <>
          <UpNextCard upNext={upNext} />

          <View className="gap-2">
            <Text variant="eyebrow">Characters</Text>
            {characters.length === 0 ? (
              <EmptyState
                icon={Sword}
                title="No characters yet"
                body="Build your first hero: choose a class, an origin and abilities."
                actionLabel="Create character"
                onAction={() => router.push('/(app)/characters/new')}
              />
            ) : (
              characters.map((c) => {
                const subtitle = `Level ${c.level}${c.class_name ? ` ${c.class_name}` : ''}`
                return (
                  <Pressable key={c.id} role="button" accessibilityLabel={`${c.name}, ${subtitle}`} onPress={() => router.push(`/(app)/characters/${c.id}`)}>
                    <Card compact className="gap-1">
                      <Text variant="subhead" numberOfLines={1}>{c.name}</Text>
                      <Text variant="body-sm" tone="muted">{subtitle}</Text>
                    </Card>
                  </Pressable>
                )
              })
            )}
          </View>

          <View className="gap-2">
            <Text variant="eyebrow">Campaigns</Text>
            {campaigns.length === 0 ? (
              <EmptyState
                icon={UsersThree}
                title="No campaigns yet"
                body="Join a table with an invite, or start one as the GM."
                actionLabel="Find a campaign"
                onAction={() => router.push('/(app)/campaigns')}
              />
            ) : (
              campaigns.map((c) => (
                <Pressable key={c.id} role="button" accessibilityLabel={c.name} onPress={() => router.push({ pathname: '/(app)/campaigns/[id]', params: { id: c.id } })}>
                  <Card compact className="flex-row items-center justify-between gap-2">
                    <Text variant="subhead" numberOfLines={1} className="flex-1">{c.name}</Text>
                    {sessions[c.id] ? <Badge variant="accent">Live</Badge> : null}
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
    </ScreenBackground>
  )
}
