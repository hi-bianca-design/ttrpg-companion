import { Minus, Plus } from 'phosphor-react-native'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { ABILITY_LABELS, type AbilityKey } from '../definition'
import { levelOf } from '../draft'
import { skillKey, weaponMasteryCountFor } from '../rules'
import { ChoiceCard, Chip, type ContentItem, QueryState, StepIntro, useDndContent, useThemeColors } from './shared'

/** Role grouping and one-line taglines for the SRD classes (D&D-specific presentation). */
export const CLASS_GROUPS: Array<{ role: string; classes: string[] }> = [
  { role: 'Martial', classes: ['Barbarian', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue'] },
  { role: 'Support', classes: ['Bard', 'Cleric'] },
  { role: 'Caster', classes: ['Druid', 'Sorcerer', 'Warlock', 'Wizard'] },
]

const TAGLINES: Record<string, string> = {
  Barbarian: 'Rage-fuelled melee powerhouse',
  Bard: 'Magic through music and words',
  Cleric: 'Divine healer and warrior',
  Druid: 'Nature magic and shapeshifting',
  Fighter: 'Versatile combat specialist',
  Monk: 'Disciplined unarmed striker',
  Paladin: 'Holy warrior bound by an oath',
  Ranger: 'Skilled hunter and tracker',
  Rogue: 'Stealthy precision striker',
  Sorcerer: 'Innate magic flows through you',
  Warlock: 'Pact magic from an otherworldly patron',
  Wizard: 'Studied master of the arcane',
}

const DEFAULT_SUBCLASS_LEVEL = 3

const abilityLabel = (key: string) => ABILITY_LABELS[key as AbilityKey] ?? key

type ClassItem = ContentItem<'class'>

function groupClasses(classes: ClassItem[]) {
  const known = new Set(CLASS_GROUPS.flatMap((g) => g.classes))
  const groups = CLASS_GROUPS.map((g) => ({
    role: g.role,
    items: g.classes.flatMap((name) => classes.filter((c) => c.name === name)),
  }))
  groups.push({ role: 'Other', items: classes.filter((c) => !known.has(c.name)) })
  return groups.filter((g) => g.items.length > 0)
}

function LevelPicker({ level, onChange }: { level: number; onChange: (level: number) => void }) {
  const colors = useThemeColors()
  return (
    <Card className="flex-row items-center justify-between gap-3">
      <View className="flex-1 gap-1">
        <Text variant="subhead">Starting level</Text>
        <Text variant="caption" tone="muted">Most campaigns start at level 1</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Button variant="outline" size="icon" accessibilityLabel="Lower level" disabled={level <= 1} onPress={() => onChange(level - 1)}>
          <Minus size={16} color={colors.accentForeground} />
        </Button>
        <Text variant="stat" accessibilityLabel={`Level ${level}`}>{level}</Text>
        <Button variant="outline" size="icon" accessibilityLabel="Raise level" disabled={level >= 20} onPress={() => onChange(level + 1)}>
          <Plus size={16} color={colors.accentForeground} />
        </Button>
      </View>
    </Card>
  )
}

export function ClassStep({ draft, update }: BuilderStepProps) {
  const classes = useDndContent('class')
  const subclasses = useDndContent('subclass')
  const level = levelOf(draft)

  function changeLevel(next: number) {
    const sub = subclasses.items.find((s) => s.id === draft.subclass_id)
    const minLevel = sub?.data.features.subclass_level ?? DEFAULT_SUBCLASS_LEVEL
    update(sub && next < minLevel ? { level: next, subclass_id: null } : { level: next })
  }

  return (
    <View className="gap-6">
      <StepIntro title="Choose a class" description="Your class defines how you fight, cast and explore the world." />
      <LevelPicker level={level} onChange={changeLevel} />
      <QueryState isLoading={classes.isLoading} isError={classes.isError} onRetry={() => classes.refetch()} />
      {groupClasses(classes.items).map((group) => (
        <SectionHeader key={group.role} id={`builder-class-${group.role}`} title={group.role}>
          <View className="gap-2">
            {group.items.map((cls) => {
              const selected = draft.class_id === cls.id
              const options = subclasses.items.filter((s) => s.parent_id === cls.id)
              const subclassLevel = options[0]?.data.features.subclass_level ?? DEFAULT_SUBCLASS_LEVEL
              return (
                <ChoiceCard
                  key={cls.id}
                  title={cls.name}
                  accessibilityLabel={`${cls.name}, d${cls.data.hit_die} hit die`}
                  selected={selected}
                  aside={<Badge>{`d${cls.data.hit_die}`}</Badge>}
                  onPress={() => {
                    if (!selected) update({
                      class_id: cls.id, class_name: cls.name, hit_die: cls.data.hit_die,
                      class_skill_count: cls.data.features.skill_choices?.count ?? 0,
                      class_fighting_style: (cls.data.features.level_features?.['1'] ?? []).includes('Fighting Style'),
                      class_mastery_count: weaponMasteryCountFor(cls.name, cls.data.features.level_features?.['1'] ?? []),
                      class_expertise_count: (cls.data.features.level_features?.['1'] ?? []).includes('Expertise') ? 2 : 0,
                      class_equipment_options: cls.data.features.starting_equipment_options ?? [],
                      class_skill_options: (cls.data.features.skill_choices?.from ?? []).map(skillKey),
                    })
                  }}
                >
                  <Text variant="body-sm" tone="muted">{TAGLINES[cls.name] ?? cls.description ?? ''}</Text>
                  {selected ? (
                    <View className="gap-3 pt-1">
                      {cls.description ? <Text variant="body-sm">{cls.description}</Text> : null}
                      <View className="gap-1">
                        <Text variant="label">Primary abilities</Text>
                        <View className="flex-row flex-wrap gap-1">
                          {cls.data.primary_abilities.map((a) => <Badge key={a}>{abilityLabel(a)}</Badge>)}
                        </View>
                      </View>
                      <View className="gap-1">
                        <Text variant="label">Saving throws</Text>
                        <View className="flex-row flex-wrap gap-1">
                          {cls.data.saving_throw_proficiencies.map((a) => <Badge key={a}>{abilityLabel(a)}</Badge>)}
                        </View>
                      </View>
                      {options.length > 0 ? (
                        <View className="gap-2">
                          <Text variant="label">Subclass</Text>
                          {level >= subclassLevel ? (
                            <View className="flex-row flex-wrap gap-2">
                              {options.map((s) => (
                                <Chip
                                  key={s.id}
                                  label={s.name}
                                  selected={draft.subclass_id === s.id}
                                  onPress={() => update({ subclass_id: draft.subclass_id === s.id ? null : s.id })}
                                />
                              ))}
                            </View>
                          ) : (
                            <Text variant="caption" tone="muted">{`Chosen at level ${subclassLevel}.`}</Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </ChoiceCard>
              )
            })}
          </View>
        </SectionHeader>
      ))}
    </View>
  )
}
