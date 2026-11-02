import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen, Plus } from 'phosphor-react-native'
import { ContentCard, EmptyState, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { useContentSearch } from '@/features/content/content.queries'
import { homebrewKinds, KindPicker } from '@/features/content/KindPicker'
import { THEME_COLORS } from '@/lib/theme'
import { getSystem, visibleSystems } from '@/systems/registry'
import type { SystemId } from '@/systems/types'

export default function ContentScreen() {
  const router = useRouter()
  const systems = visibleSystems()
  const [systemId, setSystemId] = useState<SystemId>(systems[0].id)
  const [kind, setKind] = useState<string | null>(null)
  const colors = THEME_COLORS

  const kinds = homebrewKinds(systemId)
  const mine = useContentSearch(systemId, kinds.map((k) => k.kind), 'mine', '')
  const rows = kind ? mine.data.filter((r) => r.kind === kind) : mine.data
  const create = () =>
    router.push({ pathname: '/(app)/content/new', params: { systemId, ...(kind ? { kind } : {}) } })

  const changeSystem = (id: SystemId) => { setSystemId(id); setKind(null) }

  return (
    <ScreenBackground scroll>
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="title">Homebrew</Text>
        {rows.length > 0 ? (
          <Button size="sm" accessibilityLabel="New homebrew" onPress={create}>
            <Plus size={16} color={colors.primaryForeground} weight="bold" />
            <Text>New</Text>
          </Button>
        ) : null}
      </View>

      {systems.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          {systems.map((s) => (
            <ToggleChip key={s.id} label={s.name} selected={s.id === systemId} onPress={() => changeSystem(s.id)} />
          ))}
        </View>
      ) : null}

      <KindPicker systemId={systemId} value={kind} onChange={setKind} allowAll />

      {mine.isLoading ? (
        <View className="gap-2" accessibilityLabel="Loading homebrew">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-full bg-muted" />
              <View className="h-4 w-1/3 rounded-full bg-muted" />
            </Card>
          ))}
        </View>
      ) : mine.isError ? (
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load your homebrew. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={() => mine.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No homebrew yet"
          body="Make your own spells, species, items and more. They show up next to the SRD when you build characters."
          actionLabel="Create"
          onAction={create}
        />
      ) : (
        <View className="gap-2">
          {rows.map((r) => (
            <ContentCard
              key={r.id}
              title={r.name}
              meta={getSystem(systemId).contentKinds[r.kind]?.label}
              onPress={() => router.push(`/(app)/content/${r.id}`)}
            />
          ))}
        </View>
      )}
    </ScreenBackground>
  )
}
