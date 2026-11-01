import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { useCharacter, useResourceMutation } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { ActionsList, lowestTier, type Segment } from '@/features/characters/sheet/ActionsList'
import { RestButtons } from '@/features/characters/sheet/RestButtons'
import { SpellSlotsSection } from '@/features/characters/sheet/SpellSlotsSection'
import { restoreSlot, spendSlot } from '@/systems/resources'
import { getSystem } from '@/systems/registry'
import type { ResourceValue, SlotsValue } from '@/systems/types'

const SLOTS_KEY = 'spell_slots'

export default function ActionsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const [segment, setSegment] = useState<Segment>('actions')
  const [saveError, setSaveError] = useState<string | null>(null)
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])

  const mutation = useResourceMutation(id, {
    onError: (e) => setSaveError(e instanceof Error ? e.message : 'Couldn’t save. Try again.'),
  })
  const change = (key: string, apply: (cur: ResourceValue) => ResourceValue) => {
    setSaveError(null)
    mutation.mutate({ key, apply })
  }

  if (isLoading) {
    return (
      <ScreenBackground>
        <View className="gap-2" accessibilityLabel="Loading actions">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-full bg-muted" />
              <View className="h-11 w-full rounded-card bg-muted" />
            </Card>
          ))}
        </View>
      </ScreenBackground>
    )
  }

  if (isError || !character) {
    return (
      <ScreenBackground>
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load this character. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  const system = getSystem(character.system_id)
  const slots = character.resources[SLOTS_KEY] as SlotsValue | undefined
  const tierLabel = system.resources.find((r) => r.key === SLOTS_KEY && r.kind === 'slots')
  const labelFor = tierLabel && tierLabel.kind === 'slots' ? tierLabel.tierLabel : undefined

  const useSpell = (level: number) => {
    // Pick the tier from the latest cached state so a rapid second tap sees the first spend.
    change(SLOTS_KEY, (cur) => {
      const tier = lowestTier(cur as SlotsValue, level)
      return tier ? spendSlot(cur as SlotsValue, tier) : cur
    })
  }

  const rest = (kind: 'short' | 'long') => {
    setSaveError(null)
    // One atomic write: rules.rest computes from the latest cached resources.
    mutation.mutate({ applyAll: (resources) => system.rules.rest({ ...character, resources }, kind, picks) })
  }

  return (
    <ScreenBackground scroll>
      <Text variant="title">{character.name}</Text>
      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      {slots ? (
        <SpellSlotsSection
          characterId={character.id}
          slots={slots}
          tierLabel={labelFor}
          onSpend={(tier) => change(SLOTS_KEY, (cur) => spendSlot(cur as SlotsValue, tier))}
          onRestore={(tier) => change(SLOTS_KEY, (cur) => restoreSlot(cur as SlotsValue, tier))}
        />
      ) : null}
      <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
        <TabsList>
          <TabsTrigger value="actions" accessibilityLabel="Actions"><Text>Actions</Text></TabsTrigger>
          <TabsTrigger value="bonus" accessibilityLabel="Bonus"><Text>Bonus</Text></TabsTrigger>
          <TabsTrigger value="reactions" accessibilityLabel="Reactions"><Text>Reactions</Text></TabsTrigger>
        </TabsList>
      </Tabs>
      <ActionsList
        segment={segment}
        picks={picks}
        slots={slots}
        onUse={useSpell}
        onEmptyAction={() => (segment === 'actions' ? router.push(`/(app)/characters/${id}/inventory`) : setSegment('actions'))}
      />
      <RestButtons onRest={rest} />
    </ScreenBackground>
  )
}
