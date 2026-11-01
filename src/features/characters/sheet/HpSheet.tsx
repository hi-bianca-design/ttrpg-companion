import { useState } from 'react'
import { View } from 'react-native'
import { AdjustSheet } from '@/components/game/AdjustSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { adjustPool, setTemp } from '@/systems/resources'
import type { PoolValue } from '@/systems/types'
import { useResourceMutation } from '../characters.queries'

type HpSheetProps = {
  characterId: string
  pool: PoolValue
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 'adjust' (default): damage / heal by an amount. 'temp': grant bonus (temporary) HP. */
  mode?: 'adjust' | 'temp'
  resourceKey?: string
  /** Called for every failed write (the mutation has already rolled the cache back). */
  onError?: (error: unknown) => void
}

function parseAmount(text: string): number {
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Hit points sheet. In adjust mode − / + fold the amount into a pending change (damage eats
 * bonus HP first; healing is capped at max); Confirm writes it through the resource mutation.
 */
export function HpSheet({ characterId, pool, open, onOpenChange, mode = 'adjust', resourceKey = 'hp', onError }: HpSheetProps) {
  const mutation = useResourceMutation(characterId, { onError })
  const [amount, setAmount] = useState('')
  const [delta, setDelta] = useState(0)
  const n = parseAmount(amount)
  const preview = mode === 'adjust' ? adjustPool(pool, delta) : setTemp(pool, n)

  const reset = () => { setAmount(''); setDelta(0) }
  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }
  const confirm = () => {
    if (mode === 'adjust' && delta !== 0) {
      const change = delta
      mutation.mutate({ key: resourceKey, apply: (cur) => adjustPool(cur as PoolValue, change) })
    } else if (mode === 'temp' && n > 0) {
      mutation.mutate({ key: resourceKey, apply: (cur) => setTemp(cur as PoolValue, n) })
    }
    close(false)
  }

  const amountInput = (className?: string) => (
    <Input
      className={cn('text-center', className)}
      accessibilityLabel="Amount"
      placeholder="Amount"
      keyboardType="number-pad"
      inputMode="numeric"
      value={amount}
      onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
    />
  )

  return (
    <AdjustSheet
      open={open}
      onOpenChange={close}
      title={mode === 'adjust' ? 'Hit points' : 'Bonus HP'}
      primaryLabel="Confirm"
      onPrimary={confirm}
      secondaryLabel="Reset"
      onSecondary={reset}
    >
      <View className="gap-3">
        {mode === 'adjust' ? (
          <>
            <View className="items-center gap-1">
              <Text variant="stat">{`${pool.current} → ${preview.current}`}</Text>
              <Text variant="caption" tone="muted">
                {(pool.temp ?? 0) > 0 ? `of ${pool.max} · bonus ${pool.temp} → ${preview.temp ?? 0}` : `of ${pool.max}`}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Button variant="outline" className="w-11 px-0" accessibilityLabel="Damage" onPress={() => setDelta((d) => d - n)}>
                <Text>−</Text>
              </Button>
              {amountInput('flex-1')}
              <Button variant="outline" className="w-11 px-0" accessibilityLabel="Heal" onPress={() => setDelta((d) => d + n)}>
                <Text>+</Text>
              </Button>
            </View>
            <Text variant="caption" tone="muted" className="text-center">Damage uses bonus HP first.</Text>
          </>
        ) : (
          <>
            <Text variant="body-sm" tone="muted">
              {`Bonus HP absorbs damage first. It doesn’t stack: the higher value is kept (now ${pool.temp ?? 0}).`}
            </Text>
            {amountInput()}
          </>
        )}
      </View>
    </AdjustSheet>
  )
}
