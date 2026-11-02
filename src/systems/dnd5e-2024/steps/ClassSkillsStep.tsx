import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { SKILLS } from '../definition'
import { classSkillCount, strList, validClassSkills } from '../draft'
import { Chip, StepIntro } from './shared'

const label = (key: string) => SKILLS.find((s) => s.key === key)?.label ?? key

export function ClassSkillsStep({ draft, update }: BuilderStepProps) {
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const count = classSkillCount(draft)
  const options = strList(draft.class_skill_options)
  const granted = strList(draft.bg_skills)
  const picked = validClassSkills(draft)
  const full = picked.length >= count

  const toggle = (key: string) =>
    update({ class_skills: picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key] })

  return (
    <View className="gap-6">
      <StepIntro title="Choose skills" description={`${className} trains in ${count} of these skills.`} />
      <SectionHeader id="builder-class-skills" title="Class skills" action={<Text variant="label" tone="accent">{`${picked.length}/${count} chosen`}</Text>}>
        <View className="flex-row flex-wrap gap-2">
          {options.map((key) => {
            const fromBackground = granted.includes(key)
            const selected = picked.includes(key)
            return (
              <Chip
                key={key}
                label={label(key)}
                selected={selected}
                disabled={fromBackground || (full && !selected)}
                accessibilityHint={fromBackground ? 'Already granted by your background' : undefined}
                onPress={() => toggle(key)}
              />
            )
          })}
        </View>
        {granted.some((k) => options.includes(k)) ? (
          <Text variant="caption" tone="muted">
            {`Dimmed skills come from your background (${granted.map(label).join(', ')}).`}
          </Text>
        ) : null}
      </SectionHeader>
    </View>
  )
}
