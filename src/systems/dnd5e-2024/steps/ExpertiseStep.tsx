import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { SKILLS } from '../definition'
import { expertiseCount, proficientSkills, strList } from '../draft'
import { Chip, StepIntro } from './shared'

export function ExpertiseStep({ draft, update }: BuilderStepProps) {
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const count = expertiseCount(draft)
  const picked = strList(draft.expertise)
  const full = picked.length >= count
  const known = proficientSkills(draft)

  const toggle = (key: string) => update({ expertise: picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key] })

  return (
    <View className="gap-6">
      <StepIntro title="Expertise" description={`${className} doubles the proficiency bonus on ${count} skills they are proficient in.`} />
      <SectionHeader id="builder-expertise" title="Skills" action={<Text variant="label" tone="accent">{`${picked.length}/${count} chosen`}</Text>}>
        <View className="flex-row flex-wrap gap-2">
          {SKILLS.filter((s) => known.includes(s.key)).map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              selected={picked.includes(s.key)}
              disabled={full && !picked.includes(s.key)}
              onPress={() => toggle(s.key)}
            />
          ))}
        </View>
      </SectionHeader>
    </View>
  )
}
