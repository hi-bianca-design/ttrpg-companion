import { TouchableOpacity, Text } from 'react-native'

type Props = { condition: string; onRemove?: () => void }

export function ConditionBadge({ condition, onRemove }: Props) {
  return (
    <TouchableOpacity
      onPress={onRemove}
      className="flex-row items-center bg-red/20 border border-red rounded-full px-3 py-1 mr-2 mb-2"
    >
      <Text className="text-red text-xs font-medium">{condition}</Text>
      {onRemove && <Text className="text-red text-xs ml-1">×</Text>}
    </TouchableOpacity>
  )
}
