import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { titleCase } from './format'

/** Active conditions as tinted badges (status, not metadata). Renders nothing when there are none. */
export function ConditionChips({ conditions }: { conditions: string[] }) {
  if (conditions.length === 0) return null
  return (
    <View className="flex-row flex-wrap gap-2" accessible accessibilityLabel={`Conditions: ${conditions.map(titleCase).join(', ')}`}>
      {conditions.map((c) => <Badge key={c} variant="tinted">{titleCase(c)}</Badge>)}
    </View>
  )
}
