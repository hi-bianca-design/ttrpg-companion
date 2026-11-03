import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ResourceTracker } from '@/components/game/ResourceTracker'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { showToast, ToastClearance } from '@/components/ui/toast'
import { useCharacter, useResourceMutation } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { ActionsList, lowestBlockedLevel, lowestTier, type Segment } from '@/features/characters/sheet/ActionsList'
import { ConditionChips } from '@/features/characters/sheet/ConditionChips'
import { EmptyPoolTrackers } from '@/features/characters/sheet/EmptyPoolTrackers'
import { FeatureTrackers } from '@/features/characters/sheet/FeatureTrackers'
import { HpSheet } from '@/features/characters/sheet/HpSheet'
import { RestButtons } from '@/features/characters/sheet/RestButtons'
import { restSummary } from '@/features/characters/sheet/restSummary'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { SpellSlotsSection } from '@/features/characters/sheet/SpellSlotsSection'
import { ERROR_COPY } from '@/features/errors'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { restoreSlot, spendSlot } from '@/systems/resources'
import { getSystem } from '@/systems/registry'
import type { PoolValue, ResourceValue, SlotsValue } from '@/systems/types'

const SLOTS_KEY = 'spell_slots'

export default function ActionsTab() {
  // Own param first, global as fallback (see useCharacterRouteId).
  const id = useCharacterRouteId()
  const router = useRouter()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const [segment, setSegment] = useState<Segment>('actions')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hpKey, setHpKey] = useState<string | null>(null)
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])

  const onError = (e: unknown) => setSaveError(e instanceof Error ? e.message : ERROR_COPY.save_failed)
  const mutation = useResourceMutation(id, { onError })
  const change = (key: string, apply: (cur: ResourceValue) => ResourceValue) => {
    setSaveError(null)
    mutation.mutate({ key, apply })
  }

  if (isLoading) {
    return (
      <ScreenBackground>
        <SheetHeader />
        <View className="gap-2" accessibilityLabel="Loading actions">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-sm bg-muted" />
              <View className="h-11 w-full rounded-sm bg-muted" />
            </Card>
          ))}
        </View>
      </ScreenBackground>
    )
  }

  if (isError || !character) {
    return (
      <ScreenBackground>
        <SheetHeader />
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
    const summary = restSummary(system.resources, kind, character.resources, system.rules.rest(character, kind, picks))
    mutation.mutate(
      { applyAll: (resources) => system.rules.rest({ ...character, resources }, kind, picks) },
      // Confirm only once the write lands; a failure shows the error caption instead.
      { onSuccess: () => showToast(summary) },
    )
  }

  // The system's bar-display pools (e.g. hit points), compact, each opening the HP sheet.
  const bars = system.resources.flatMap((def) => {
    const v = character.resources[def.key] as PoolValue | undefined
    return def.kind === 'pool' && def.display === 'bar' && v ? [{ def, v }] : []
  })
  const hpOpen = bars.find((b) => b.def.key === hpKey)

  return (
    <ScreenBackground scroll>
      <SheetHeader name={character.name} eyebrow="Actions" />
      {bars.length > 0 || character.conditions.length > 0 ? (
        <View className="gap-3">
          {bars.map(({ def, v }) => (
            <ResourceTracker
              key={def.key}
              display="bar"
              label={def.label}
              current={v.current}
              max={v.max}
              temp={v.temp}
              onAdjust={() => { setSaveError(null); setHpKey(def.key) }}
            />
          ))}
          <EmptyPoolTrackers defs={system.resources} resources={character.resources} onChangeResource={change} />
          <FeatureTrackers defs={system.resources} resources={character.resources} onChangeResource={change} />
          <ConditionChips conditions={character.conditions} />
        </View>
      ) : null}
      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      {slots ? (
        <SpellSlotsSection
          characterId={character.id}
          slots={slots}
          tierLabel={labelFor}
          onSpend={(tier) => change(SLOTS_KEY, (cur) => spendSlot(cur as SlotsValue, tier))}
          onRestore={(tier) => change(SLOTS_KEY, (cur) => restoreSlot(cur as SlotsValue, tier))}
          blockedFrom={lowestBlockedLevel(slots)}
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
      {/* The rest buttons end the scroll and trigger a toast: keep them clear of it. */}
      <ToastClearance />
      {hpOpen ? (
        <HpSheet
          characterId={character.id}
          pool={hpOpen.v}
          resourceKey={hpOpen.def.key}
          resourceDefs={system.resources}
          open
          onOpenChange={(open) => { if (!open) setHpKey(null) }}
          onError={onError}
        />
      ) : null}
    </ScreenBackground>
  )
}
