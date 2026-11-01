import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { CaretLeft } from 'phosphor-react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useCharacter, useUpdateCharacter } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { ConditionsSection } from '@/features/characters/sheet/ConditionsSection'
import { ConditionsSheet } from '@/features/characters/sheet/ConditionsSheet'
import { HpSheet } from '@/features/characters/sheet/HpSheet'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { StatsSection } from '@/features/characters/sheet/StatsSection'
import { VitalsSection } from '@/features/characters/sheet/VitalsSection'
import { THEME_COLORS } from '@/lib/theme'
import { getSystem } from '@/systems/registry'
import type { PoolValue } from '@/systems/types'

type OpenSheet = null | 'hp' | 'bonus' | 'conditions'

export default function CharacterTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const update = useUpdateCharacter(id)
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])

  const onSaveError = { onError: (e: unknown) => setSaveError(e instanceof Error ? e.message : 'Couldn’t save. Try again.') }
  const closeSheet = (open: boolean) => { if (!open) setSheet(null) }

  const nav = (
    <View className="flex-row items-center justify-between">
      <Button variant="ghost" size="icon" accessibilityLabel="Back" onPress={() => router.back()}>
        <CaretLeft size={20} color={colors.foreground} />
      </Button>
      {character ? (
        <Button variant="ghost" size="sm" accessibilityLabel="Level up" onPress={() => router.push(`/(app)/characters/${id}/level-up`)}>
          <Text>Level up</Text>
        </Button>
      ) : null}
    </View>
  )

  if (isLoading) {
    return (
      <ScreenBackground>
        {nav}
        <View className="gap-2" accessibilityLabel="Loading character">
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
        {nav}
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
  const Proficiencies = system.sheet?.sections?.proficiencies
  const hp = character.resources.hp as PoolValue | undefined

  return (
    <ScreenBackground scroll>
      {nav}
      <SheetHeader character={character} />
      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      <VitalsSection
        character={character}
        onEditHp={() => setSheet('hp')}
        onBonusHp={() => setSheet('bonus')}
        onSpendInspiration={() => {
          setSaveError(null)
          update.mutate({ details: { ...character.details, inspiration: false } }, onSaveError)
        }}
      />
      <ConditionsSection character={character} onEdit={() => setSheet('conditions')} />
      <StatsSection character={character} />
      {Proficiencies ? <Proficiencies character={character} picks={picks} /> : null}

      {hp ? (
        <>
          <HpSheet characterId={character.id} pool={hp} open={sheet === 'hp'} onOpenChange={closeSheet} />
          <HpSheet characterId={character.id} pool={hp} mode="temp" open={sheet === 'bonus'} onOpenChange={closeSheet} />
        </>
      ) : null}
      <ConditionsSheet
        open={sheet === 'conditions'}
        onOpenChange={closeSheet}
        options={system.conditions}
        value={character.conditions}
        onApply={(conditions) => {
          setSaveError(null)
          update.mutate({ conditions }, onSaveError)
        }}
      />
    </ScreenBackground>
  )
}
