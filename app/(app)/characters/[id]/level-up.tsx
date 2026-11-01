import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useGlobalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { CaretLeft } from 'phosphor-react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { useCharacter, useLevelUp } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { levelUpSummary } from '@/features/characters/sheet/levelUpSummary'
import { THEME_COLORS } from '@/lib/theme'
import { getSystem } from '@/systems/registry'

type Choice = { input: Record<string, unknown>; ready: boolean }

export default function LevelUpScreen() {
  // Global params: a tab opened from the tab bar gets empty local params on web.
  const { id } = useGlobalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const levelUp = useLevelUp(id)
  const [choice, setChoice] = useState<Choice>({ input: {}, ready: false })
  const [saveError, setSaveError] = useState<string | null>(null)
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])
  const onChoice = useCallback((input: Record<string, unknown>, ready: boolean) => setChoice({ input, ready }), [])

  const back = (
    <View className="flex-row items-center">
      <Button variant="ghost" size="icon" accessibilityLabel="Back" onPress={() => router.back()}>
        <CaretLeft size={20} color={colors.foreground} />
      </Button>
    </View>
  )

  if (isLoading) {
    return (
      <ScreenBackground>
        <View className="gap-2" accessibilityLabel="Loading level up">
          {[0, 1].map((i) => (
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
        {back}
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
  const rule = system.rules.levelUp

  if (!rule || (system.maxLevel !== undefined && character.level >= system.maxLevel)) {
    return (
      <ScreenBackground>
        {back}
        <View className="gap-1">
          <Text variant="title">Max level</Text>
          <Text variant="body-sm" tone="muted">{`${character.name} is level ${character.level}. There is nowhere higher to go.`}</Text>
        </View>
      </ScreenBackground>
    )
  }

  const Choices = system.sheet?.sections?.levelUp
  const ready = Choices ? choice.ready : true
  const input = Choices ? choice.input : {}
  const preview = ready ? rule(character, picks, input) : null
  const rows = preview
    ? levelUpSummary(system, character, preview, picks)
    : [{ label: 'Level', value: `${character.level} → ${character.level + 1}` }]

  const submit = () => {
    if (!preview) return
    setSaveError(null)
    levelUp.mutate(
      { patch: preview, input },
      {
        onSuccess: () => router.replace(`/(app)/characters/${id}`),
        onError: (e) => setSaveError(e instanceof Error ? e.message : 'Couldn’t save. Try again.'),
      },
    )
  }

  return (
    <ScreenBackground scroll>
      {back}
      <View className="gap-1">
        <Text variant="title">Level up</Text>
        <Text variant="body-sm" tone="muted">{`${character.name} reaches level ${character.level + 1}.`}</Text>
      </View>

      {Choices ? <Choices character={character} picks={picks} onChange={onChoice} /> : null}

      <Card className="gap-2">
        <Text variant="label">Summary</Text>
        {rows.map((r) => (
          <View key={r.label} className="flex-row items-center justify-between">
            <Text variant="body-sm" tone="muted">{r.label}</Text>
            <Text variant="body-sm">{r.value}</Text>
          </View>
        ))}
      </Card>

      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      <Button variant="highlight" disabled={!ready || levelUp.isPending} onPress={submit}>
        <Text>{levelUp.isPending ? 'Leveling up…' : 'Level up'}</Text>
      </Button>
    </ScreenBackground>
  )
}
