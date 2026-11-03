import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useCharacter, useResourceMutation, useUpdateCharacter } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { ConditionsSection } from '@/features/characters/sheet/ConditionsSection'
import { ConditionsSheet } from '@/features/characters/sheet/ConditionsSheet'
import { HpSheet } from '@/features/characters/sheet/HpSheet'
import { CharacterSummary, classLine } from '@/features/characters/sheet/CharacterSummary'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { StatsSection } from '@/features/characters/sheet/StatsSection'
import { VitalsSection } from '@/features/characters/sheet/VitalsSection'
import { ERROR_COPY } from '@/features/errors'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { getSystem } from '@/systems/registry'
import type { PoolValue, ResourceValue } from '@/systems/types'

type OpenSheet = null | 'hp' | 'bonus' | 'conditions'

export default function CharacterTab() {
  // Own param first, global as fallback (see useCharacterRouteId).
  const id = useCharacterRouteId()
  const router = useRouter()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const update = useUpdateCharacter(id)
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])

  const onSaveError = { onError: (e: unknown) => setSaveError(e instanceof Error ? e.message : ERROR_COPY.save_failed) }
  const resources = useResourceMutation(id, onSaveError)
  const changeResource = (key: string, apply: (cur: ResourceValue) => ResourceValue) => {
    setSaveError(null)
    resources.mutate({ key, apply })
  }
  const closeSheet = (open: boolean) => { if (!open) setSheet(null) }
  const openSheet = (next: OpenSheet) => { setSaveError(null); setSheet(next) }

  const levelUp = () => router.push(`/(app)/characters/${id}/level-up`)

  if (isLoading) {
    return (
      <ScreenBackground>
        <SheetHeader />
        <View className="gap-2" accessibilityLabel="Loading character">
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
  const Proficiencies = system.sheet?.sections?.proficiencies
  const Profile = system.sheet?.sections?.profile
  const Spellcasting = system.sheet?.sections?.spellcasting
  const Languages = system.sheet?.sections?.languages
  const hp = character.resources.hp as PoolValue | undefined

  return (
    <ScreenBackground scroll>
      <SheetHeader name={character.name} eyebrow="Your character" subtitle={classLine(character) || undefined} onLevelUp={levelUp}>
        <CharacterSummary character={character} />
      </SheetHeader>
      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      <VitalsSection
        character={character}
        onEditHp={() => openSheet('hp')}
        onBonusHp={() => openSheet('bonus')}
        onChangeResource={changeResource}
        onSpendInspiration={() => {
          setSaveError(null)
          update.mutate({ details: { ...character.details, inspiration: false } }, onSaveError)
        }}
      />
      <ConditionsSection character={character} onEdit={() => setSheet('conditions')} />
      <StatsSection character={character} />
      {Spellcasting ? <Spellcasting character={character} picks={picks} /> : null}
      {Proficiencies ? <Proficiencies character={character} picks={picks} /> : null}
      {Profile ? <Profile character={character} picks={picks} /> : null}
      {Languages ? (
        <Languages
          character={character}
          picks={picks}
          onSaveDetails={(patch) => {
            setSaveError(null)
            update.mutate({ details: { ...character.details, ...patch } }, onSaveError)
          }}
        />
      ) : null}

      {hp ? (
        <>
          <HpSheet characterId={character.id} pool={hp} resourceDefs={system.resources} open={sheet === 'hp'} onOpenChange={closeSheet} onError={onSaveError.onError} />
          <HpSheet characterId={character.id} pool={hp} resourceDefs={system.resources} mode="temp" open={sheet === 'bonus'} onOpenChange={closeSheet} onError={onSaveError.onError} />
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
