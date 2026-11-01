import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { CaretLeft } from 'phosphor-react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { useCharacter, useLevelUp } from '@/features/characters/characters.queries'
import { toRuleInput } from '@/features/characters/picks'
import { THEME_COLORS } from '@/lib/theme'
import { getSystem } from '@/systems/registry'
import { ChoiceCard, Chip, QueryState, useDndContent } from '@/systems/dnd5e-2024/steps/shared'
import { getAbilityModifier, hitDieOf, hpGain, MAX_LEVEL, SUBCLASS_LEVEL } from '@/systems/dnd5e-2024/rules'
import type { PoolValue, SlotsValue } from '@/systems/types'

type HpMethod = 'average' | 'roll'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="body-sm" tone="muted">{label}</Text>
      <Text variant="body-sm">{value}</Text>
    </View>
  )
}

export default function LevelUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const subclasses = useDndContent('subclass')
  const levelUp = useLevelUp(id)
  const [hpMethod, setHpMethod] = useState<HpMethod>('average')
  const [rollText, setRollText] = useState('')
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const picks = useMemo(() => (character ? toRuleInput(character.picks, character.items) : []), [character])

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

  if (character.level >= MAX_LEVEL || !system.rules.levelUp) {
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

  const newLevel = character.level + 1
  const classPick = picks.find((p) => p.kind === 'class')
  const hitDie = hitDieOf(picks)
  const conMod = getAbilityModifier(character.stats.constitution ?? 10)
  const averageGain = hpGain(hitDie, conMod, { hpMethod: 'average' })
  const roll = Number(rollText)
  const rollValid = Number.isInteger(roll) && roll >= 1 && roll <= hitDie
  const gain = hpMethod === 'average' ? averageGain : hpGain(hitDie, conMod, { hpMethod: 'roll', roll })

  const hasSubclass = picks.some((p) => p.kind === 'subclass')
  const options = subclasses.items.filter((s) => s.parent_id === classPick?.content_id)
  const subclassLevel = options[0]?.data.features.subclass_level ?? SUBCLASS_LEVEL
  const needsSubclass = !hasSubclass && options.length > 0 && newLevel >= subclassLevel
  const ready = (hpMethod === 'average' || rollValid) && (!needsSubclass || subclassId !== null)

  const input = { hpMethod, roll: hpMethod === 'roll' ? roll : undefined }
  const preview = ready ? system.rules.levelUp(character, picks, input) : null
  const hpBefore = character.resources.hp as PoolValue | undefined
  const hpAfter = preview?.resources.hp as PoolValue | undefined
  const slotsBefore = character.resources.spell_slots as SlotsValue | undefined
  const slotsAfter = preview?.resources.spell_slots as SlotsValue | undefined
  const profAfter = preview
    ? system.rules.derived({ ...character, ...preview }, picks).find((d) => d.key === 'proficiency')
    : undefined
  const slotChanges = slotsAfter
    ? Object.entries(slotsAfter.tiers).filter(([tier, s]) => s.max !== (slotsBefore?.tiers[tier]?.max ?? 0))
    : []

  const submit = () => {
    if (!preview) return
    setSaveError(null)
    levelUp.mutate(
      { patch: preview, subclassId: needsSubclass && subclassId ? subclassId : undefined },
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
        <Text variant="body-sm" tone="muted">{`${character.name} reaches level ${newLevel}.`}</Text>
      </View>

      <SectionHeader id="levelup-hp" title="Hit points">
        <View className="gap-2 pt-3">
          <ChoiceCard
            title="Take the average"
            accessibilityLabel={`Take the average, plus ${averageGain} HP`}
            selected={hpMethod === 'average'}
            aside={<Text variant="body-sm" tone="muted">{`+${averageGain} HP`}</Text>}
            onPress={() => setHpMethod('average')}
          />
          <ChoiceCard
            title="Roll the die"
            accessibilityLabel={`Roll the d${hitDie}`}
            selected={hpMethod === 'roll'}
            aside={<Text variant="body-sm" tone="muted">{`d${hitDie}`}</Text>}
            onPress={() => setHpMethod('roll')}
          >
            {hpMethod === 'roll' ? (
              <View className="gap-1">
                <Input
                  accessibilityLabel="Your roll"
                  placeholder={`1–${hitDie}`}
                  keyboardType="number-pad"
                  value={rollText}
                  onChangeText={setRollText}
                  maxLength={2}
                />
                {rollText !== '' && !rollValid ? (
                  <Text variant="caption" tone="destructive">{`Enter a number from 1 to ${hitDie}.`}</Text>
                ) : null}
              </View>
            ) : null}
          </ChoiceCard>
          <Text variant="caption" tone="muted">
            {`Your Constitution modifier (${conMod >= 0 ? '+' : ''}${conMod}) is added, for at least 1 HP.`}
          </Text>
        </View>
      </SectionHeader>

      {needsSubclass ? (
        <SectionHeader id="levelup-subclass" title="Subclass">
          <View className="gap-2 pt-3">
            <Text variant="body-sm" tone="muted">{`Choose your ${classPick?.content.name ?? 'class'} subclass.`}</Text>
            <View className="flex-row flex-wrap gap-2">
              {options.map((s) => (
                <Chip key={s.id} label={s.name} selected={subclassId === s.id} onPress={() => setSubclassId(s.id)} />
              ))}
            </View>
          </View>
        </SectionHeader>
      ) : null}
      {!hasSubclass && newLevel >= subclassLevel && (subclasses.isLoading || subclasses.isError) ? (
        <QueryState isLoading={subclasses.isLoading} isError={subclasses.isError} onRetry={() => subclasses.refetch()} />
      ) : null}

      <Card className="gap-2">
        <Text variant="label">Summary</Text>
        <Row label="Level" value={`${character.level} → ${newLevel}`} />
        <Row label="Max HP" value={`${hpBefore?.max ?? '—'} → ${hpAfter ? hpAfter.max : hpBefore ? hpBefore.max + gain : '—'}`} />
        <Row label="Hit dice" value={`+1 d${hitDie}`} />
        {profAfter ? <Row label="Proficiency" value={`+${profAfter.value}`} /> : null}
        {slotChanges.map(([tier, s]) => (
          <Row key={tier} label={`Level ${tier} slots`} value={`${slotsBefore?.tiers[tier]?.max ?? 0} → ${s.max}`} />
        ))}
      </Card>

      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      <Button variant="highlight" disabled={!ready || levelUp.isPending} onPress={submit}>
        <Text>{levelUp.isPending ? 'Leveling up…' : 'Level up'}</Text>
      </Button>
    </ScreenBackground>
  )
}
