import { View, Text } from 'react-native'
import { getAbilityModifier, formatModifier } from '@/modules/character/character.utils'

type Props = {
  label: string
  base: number
  bgBonus?: number
}

export function AbilityScoreBlock({ label, base, bgBonus = 0 }: Props) {
  const total = base + bgBonus
  const modifier = getAbilityModifier(total)

  return (
    <View className="bg-legacy-surface rounded-xl p-3 items-center flex-1">
      <Text className="text-legacy-muted text-xs mb-1">{label.slice(0, 3).toUpperCase()}</Text>
      <Text className="text-legacy-text text-2xl font-bold">{total}</Text>
      <Text className="text-legacy-primary text-sm">{formatModifier(modifier)}</Text>
      {bgBonus !== 0 && (
        <View className="mt-1 bg-legacy-overlay rounded px-1">
          <Text className="text-legacy-green text-xs">Bg+{bgBonus}</Text>
        </View>
      )}
    </View>
  )
}
