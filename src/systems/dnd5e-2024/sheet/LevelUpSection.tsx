// D&D level-up choices: HP method (average or a rolled hit die) and, once due, the subclass.
// Registered as `sheet.sections.levelUp`; reports its input and completeness through `onChange`.
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import type { SheetSectionProps } from '../../types'
import { getAbilityModifier, hitDieOf, hpGain, SUBCLASS_LEVEL } from '../rules'
import { ChoiceCard, Chip, QueryState, useDndContent } from '../steps/shared'

type HpMethod = 'average' | 'roll'

export function LevelUpSection({ character, picks, onChange }: SheetSectionProps) {
  const subclasses = useDndContent('subclass')
  const [hpMethod, setHpMethod] = useState<HpMethod>('average')
  const [rollText, setRollText] = useState('')
  const [subclassId, setSubclassId] = useState<string | null>(null)

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
  const ready = (hpMethod === 'average' || rollValid) && !subclassPending && (!needsSubclass || subclassId !== null)

  useEffect(() => {
    onChange?.(
      {
        hpMethod,
        ...(hpMethod === 'roll' && rollValid ? { roll } : {}),
        ...(needsSubclass && subclassId ? { subclassId } : {}),
      },
      ready,
    )
  }, [hpMethod, rollValid, roll, needsSubclass, subclassId, ready, onChange])

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
