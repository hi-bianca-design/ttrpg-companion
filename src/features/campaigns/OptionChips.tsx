import { View } from 'react-native'
import { ToggleChip } from '@/components/ui/toggle-chip'

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
        <ToggleChip
          key={o.value}
          label={o.label}
          selected={o.value === value}
          accessibilityLabel={`${label} ${o.label}`}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  )
}
