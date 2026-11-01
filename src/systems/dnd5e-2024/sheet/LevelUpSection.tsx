// D&D level-up choices: HP method (average or a rolled hit die), the Ability Score Improvement at
// levels 4/8/12/16/19 and, once due, the subclass.
// Registered as `sheet.sections.levelUp`; reports its input and completeness through `onChange`.
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import type { SheetSectionProps } from '../../types'
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from '../definition'
import {
  ABILITY_SCORE_CAP, type AsiChoice, getAbilityModifier, hitDieOf, hpGain, isAsiLevel, SUBCLASS_LEVEL,
} from '../rules'
import { ChoiceCard, Chip, QueryState, useDndContent } from '../steps/shared'

type HpMethod = 'average' | 'roll'
/** 'two': +2 to one ability. 'split': +1 to two different abilities. */
type AsiMode = 'two' | 'split'

export function LevelUpSection({ character, picks, onChange }: SheetSectionProps) {
  const subclasses = useDndContent('subclass')
  const [hpMethod, setHpMethod] = useState<HpMethod>('average')
  const [rollText, setRollText] = useState('')
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [asiMode, setAsiMode] = useState<AsiMode>('two')
  const [asiPicks, setAsiPicks] = useState<AbilityKey[]>([])

  const newLevel = character.level + 1
  const classPick = picks.find((p) => p.kind === 'class')
  const hitDie = hitDieOf(picks)
  const conMod = getAbilityModifier(character.stats.constitution ?? 10)
  const averageGain = hpGain(hitDie, conMod, { hpMethod: 'average' })
  const roll = Number(rollText)
  const rollValid = Number.isInteger(roll) && roll >= 1 && roll <= hitDie

  const hasSubclass = picks.some((p) => p.kind === 'subclass')
  const options = subclasses.items.filter((s) => s.parent_id === classPick?.content_id)
  const subclassLevel = options[0]?.data.features.subclass_level ?? SUBCLASS_LEVEL
  const subclassPending = !hasSubclass && newLevel >= SUBCLASS_LEVEL && (subclasses.isLoading || subclasses.isError)
  const needsSubclass = !hasSubclass && options.length > 0 && newLevel >= subclassLevel
  const asiDue = isAsiLevel(newLevel)
  const asiStep = asiMode === 'two' ? 2 : 1
  const score = (k: AbilityKey) => character.stats[k] ?? 10
  const asi = useMemo<AsiChoice>(() => Object.fromEntries(asiPicks.map((k) => [k, asiStep])), [asiPicks, asiStep])
  // Every score already at 20: nothing to raise, so the ASI can't block the level up.
  const asiBlocked = ABILITY_KEYS.every((k) => score(k) >= ABILITY_SCORE_CAP)
  const asiComplete = asiPicks.length * asiStep === 2
  const asiReady = !asiDue || asiComplete || asiBlocked

  const ready = (hpMethod === 'average' || rollValid) && !subclassPending && (!needsSubclass || subclassId !== null) && asiReady

  useEffect(() => {
    onChange?.(
      {
        hpMethod,
        ...(hpMethod === 'roll' && rollValid ? { roll } : {}),
        ...(needsSubclass && subclassId ? { subclassId } : {}),
        ...(asiDue && asiComplete ? { asi } : {}),
      },
      ready,
    )
  }, [hpMethod, rollValid, roll, needsSubclass, subclassId, asiDue, asiComplete, asi, ready, onChange])

  const chooseAsiMode = (mode: AsiMode) => {
    if (mode === asiMode) return
    setAsiMode(mode)
    setAsiPicks([])
  }
  const toggleAsi = (k: AbilityKey) => {
    if (asiMode === 'two') setAsiPicks((p) => (p[0] === k ? [] : [k]))
    else setAsiPicks((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k].slice(0, 2)))
  }

  return (
    <>
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
            aside={
              <Text variant="body-sm" tone="muted">
                {hpMethod === 'roll' && rollValid ? `+${hpGain(hitDie, conMod, { hpMethod, roll })} HP` : `d${hitDie}`}
              </Text>
            }
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

      {asiDue ? (
        <SectionHeader
          id="levelup-asi"
          title="Ability Score Improvement"
          action={<Text variant="label" tone="accent">{`${asiPicks.length * asiStep}/2`}</Text>}
        >
          <View className="gap-3 pt-3">
            <Text variant="body-sm" tone="muted">
              {`Raise one score by 2, or two scores by 1. No score can go above ${ABILITY_SCORE_CAP}.`}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="+2 to one" selected={asiMode === 'two'} onPress={() => chooseAsiMode('two')} />
              <Chip label="+1 to two" selected={asiMode === 'split'} onPress={() => chooseAsiMode('split')} />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {ABILITY_KEYS.map((k) => {
                const selected = asiPicks.includes(k)
                const full = asiMode === 'split' && asiPicks.length >= 2
                const capped = score(k) + asiStep > ABILITY_SCORE_CAP
                return (
                  <Chip
                    key={k}
                    label={selected ? `${ABILITY_LABELS[k]} ${score(k)} → ${score(k) + asiStep}` : `${ABILITY_LABELS[k]} ${score(k)}`}
                    accessibilityLabel={`${ABILITY_LABELS[k]} ${score(k)}, plus ${asiStep}`}
                    selected={selected}
                    disabled={!selected && (capped || full)}
                    onPress={() => toggleAsi(k)}
                  />
                )
              })}
            </View>
            {asiBlocked ? (
              <Text variant="caption" tone="muted">{`Every score is already ${ABILITY_SCORE_CAP}.`}</Text>
            ) : null}
          </View>
        </SectionHeader>
      ) : null}

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
      {subclassPending ? (
        <QueryState isLoading={subclasses.isLoading} isError={subclasses.isError} onRetry={() => subclasses.refetch()} />
      ) : null}
    </>
  )
}
