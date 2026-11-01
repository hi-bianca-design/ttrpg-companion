import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

export type Option = { value: string; label: string }

type OptionChipsProps = {
  label: string
  options: Option[]
  value: string | null
  onChange: (value: string) => void
}

/** Single-choice picker rendered as wrapping chips (same pattern as the homebrew form). */
export function OptionChips({ label, options, value, onChange }: OptionChipsProps) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={o.value === value ? 'primary' : 'outline'}
          accessibilityLabel={`${label} ${o.label}`}
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
        >
          <Text>{o.label}</Text>
        </Button>
      ))}
    </View>
  )
}
