import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { TEMP_HP_LABEL } from './copy'

type HpEntryBarProps = {
  /** Whose hit points these are, for screen readers (the visible label is the row's own name). */
  label: string
  disabled?: boolean
  canUndo: boolean
  onDamage: (n: number) => void
  onHeal: (n: number) => void
  onTemp: (n: number) => void
  onUndo: () => void
}

/**
 * One number and one tap: type an amount, then Damage, Heal or Temp HP. Shared by enemy rows, the bulk
 * bar and a player's own row, so it only reports the number; whoever mounts it decides what that does.
 * The field clears after an action so the next hit is typed fresh.
 */
export function HpEntryBar({ label, disabled, canUndo, onDamage, onHeal, onTemp, onUndo }: HpEntryBarProps) {
  const [amount, setAmount] = useState('')
  const n = Number.parseInt(amount, 10)
  const valid = Number.isFinite(n) && n > 0
  const off = disabled || !valid

  const act = (fn: (n: number) => void) => () => {
    if (off) return
    fn(n)
    setAmount('')
  }

  return (
    <View className="gap-2" accessibilityLabel={`${label} hit points`}>
      <Input
        className="text-center"
        accessibilityLabel="Amount"
        placeholder="Amount"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        editable={!disabled}
        value={amount}
        onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
      />
      <View className="flex-row flex-wrap gap-2">
        <Button variant="destructive" className="flex-1" disabled={off} onPress={act(onDamage)}>
          <Text>Damage</Text>
        </Button>
        <Button variant="secondary" className="flex-1" disabled={off} onPress={act(onHeal)}>
          <Text>Heal</Text>
        </Button>
        <Button variant="outline" className="flex-1" disabled={off} onPress={act(onTemp)}>
          <Text>{TEMP_HP_LABEL}</Text>
        </Button>
      </View>
      {canUndo ? (
        <Button variant="ghost" disabled={disabled} onPress={onUndo}>
          <Text>Undo</Text>
        </Button>
      ) : null}
    </View>
  )
}
