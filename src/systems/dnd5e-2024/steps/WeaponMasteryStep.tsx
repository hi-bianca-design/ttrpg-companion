import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Text } from '@/components/ui/text'
import type { BuilderStepProps } from '../../types'
import { strList, weaponMasteryCount } from '../draft'
import { canMaster } from '../rules'
import { Chip, QueryState, StepIntro, useDndContent } from './shared'

export function WeaponMasteryStep({ draft, update }: BuilderStepProps) {
  const items = useDndContent('item')
  const className = typeof draft.class_name === 'string' ? draft.class_name : 'Your class'
  const count = weaponMasteryCount(draft)
  const picked = strList(draft.mastery_ids)
  const full = picked.length >= count
  const weapons = items.items.filter((i) => canMaster(className, i.data))

  const toggle = (id: string) => update({ mastery_ids: picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id] })

  return (
    <View className="gap-6">
      <StepIntro title="Weapon mastery" description={`${className} masters ${count} kinds of weapon, using their mastery property.`} />
      <QueryState isLoading={items.isLoading} isError={items.isError} onRetry={() => items.refetch()} />
      {items.isLoading || items.isError ? null : (
        <SectionHeader id="builder-weapon-mastery" title="Weapons" action={<Text variant="label" tone="accent">{`${picked.length}/${count} chosen`}</Text>}>
          <View className="flex-row flex-wrap gap-2">
            {weapons.map((w) => (
              <Chip
                key={w.id}
                label={`${w.name} · ${w.data.properties.mastery}`}
                accessibilityLabel={w.name}
                selected={picked.includes(w.id)}
                disabled={full && !picked.includes(w.id)}
                onPress={() => toggle(w.id)}
              />
            ))}
          </View>
        </SectionHeader>
      )}
    </View>
  )
}
