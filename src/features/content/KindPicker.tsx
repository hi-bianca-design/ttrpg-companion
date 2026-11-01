import { View } from 'react-native'
import { ToggleChip } from '@/components/ui/toggle-chip'
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
        <ToggleChip key={c.key ?? 'all'} label={c.label} selected={value === c.key} onPress={() => onChange(c.key)} />
      ))}
    </View>
  )
}
