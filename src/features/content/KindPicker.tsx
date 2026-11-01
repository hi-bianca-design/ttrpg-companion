import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { getSystem } from '@/systems/registry'
import type { ContentKindDef, SystemId } from '@/systems/types'

/** The system's homebrew-able content kinds, in declaration order. */
export function homebrewKinds(systemId: SystemId): ContentKindDef[] {
  return Object.values(getSystem(systemId).contentKinds).filter((k) => k.homebrew)
}

type KindPickerProps = {
  systemId: SystemId
  value: string | null
  onChange: (kind: string | null) => void
  /** Adds a leading "All" chip that selects `null`. */
  allowAll?: boolean
}

export function KindPicker({ systemId, value, onChange, allowAll = false }: KindPickerProps) {
  const chips: Array<{ key: string | null; label: string }> = [
    ...(allowAll ? [{ key: null, label: 'All' }] : []),
    ...homebrewKinds(systemId).map((k) => ({ key: k.kind, label: k.plural })),
  ]
  return (
    <View className="flex-row flex-wrap gap-2">
      {chips.map((c) => (
        <Button
          key={c.key ?? 'all'}
          size="sm"
          variant={value === c.key ? 'primary' : 'outline'}
          accessibilityLabel={c.label}
          accessibilityState={{ selected: value === c.key }}
          onPress={() => onChange(c.key)}
        >
          <Text>{c.label}</Text>
        </Button>
      ))}
    </View>
  )
}
