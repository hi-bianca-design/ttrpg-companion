import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AdjustSheet } from '@/components/game/AdjustSheet'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { titleCase } from './format'

type ConditionsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The system's condition keys, in display order. */
  options: string[]
  value: string[]
  onApply: (next: string[]) => void
}

const CHIP_HIT_SLOP = { top: 6, bottom: 6 }

/** Multi-select of the system's conditions; "Apply (n)" saves the selection in option order. */
export function ConditionsSheet({ open, onOpenChange, options, value, onApply }: ConditionsSheetProps) {
  const [selected, setSelected] = useState<string[]>(value)
  useEffect(() => {
    if (open) setSelected(value)
  }, [open, value])

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))

  return (
    <AdjustSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Conditions"
      primaryLabel={`Apply (${selected.length})`}
      onPrimary={() => {
        onApply(options.filter((o) => selected.includes(o)))
        onOpenChange(false)
      }}
      secondaryLabel="Clear all"
      onSecondary={() => setSelected([])}
    >
      <View className="flex-row flex-wrap gap-2">
        {options.map((key) => {
          const on = selected.includes(key)
          const label = titleCase(key)
          return (
            <Button
              key={key}
              size="sm"
              variant={on ? 'primary' : 'outline'}
              accessibilityLabel={label}
              accessibilityState={{ selected: on }}
              hitSlop={CHIP_HIT_SLOP}
              onPress={() => toggle(key)}
            >
              <Text>{label}</Text>
            </Button>
          )
        })}
      </View>
    </AdjustSheet>
  )
}
