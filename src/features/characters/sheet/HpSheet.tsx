import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { adjustPool, applyPoolChange, setTemp } from '@/systems/resources'
import type { PoolValue, ResourceDef } from '@/systems/types'
import { useResourceMutation } from '../characters.queries'

type HpSheetProps = {
  characterId: string
  pool: PoolValue
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 'adjust' (default): damage / heal by an amount. 'temp': grant bonus (temporary) HP. */
  mode?: 'adjust' | 'temp'
  resourceKey?: string
  /** The system's resources: reviving from 0 clears its showWhenEmpty trackers; the pool's emptyHint explains disabled damage. */
  resourceDefs?: ResourceDef[]
  /** Called for every failed write (the mutation has already rolled the cache back). */
  onError?: (error: unknown) => void
}

function parseAmount(text: string): number {
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function samePool(a: PoolValue, b: PoolValue) {
  return a.current === b.current && (a.temp ?? 0) === (b.temp ?? 0)
}

/** "Damage" / "Heal" column: what the typed amount would do, before you commit to it. */
function Preview({ label, from, to, bonus }: { label: string; from: number; to: number; bonus?: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text variant="label">{label}</Text>
      <Text variant="subhead">{`${from} → ${to}`}</Text>
      {bonus ? <Text variant="caption" tone="muted">{bonus}</Text> : null}
    </View>
  )
}

/**
 * Hit points sheet. Type an amount, then Damage or Heal applies it at once and closes; both
 * previews update as you type. Buttons stay disabled (with the reason) when the amount is empty or
 * would change nothing, so input is never silently dropped. Damage eats bonus HP first; healing
 * caps at max. Bonus mode sets temporary HP, which doesn't stack.
 */
const NO_DEFS: ResourceDef[] = []

export function HpSheet({ characterId, pool, open, onOpenChange, mode = 'adjust', resourceKey = 'hp', resourceDefs = NO_DEFS, onError }: HpSheetProps) {
  const mutation = useResourceMutation(characterId, { onError })
  const [amount, setAmount] = useState('')
  const n = parseAmount(amount)
  const temp = pool.temp ?? 0

  const close = (next: boolean) => {
    if (!next) setAmount('')
    onOpenChange(next)
  }
  const apply = (change: (cur: PoolValue) => PoolValue) => {
    // One atomic write from the latest cached resources, so a heal from 0 also clears death saves.
    mutation.mutate({ applyAll: (resources) => applyPoolChange(resources, resourceDefs, resourceKey, change) })
    close(false)
  }

  const amountInput = (
    <Input
      className="text-center"
      accessibilityLabel="Amount"
      placeholder="Amount"
      keyboardType="number-pad"
      inputMode="numeric"
      value={amount}
      onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
    />
  )

  let body: React.ReactNode
  if (mode === 'adjust') {
    const damaged = adjustPool(pool, -n)
    const healed = adjustPool(pool, n)
    const canDamage = n > 0 && !samePool(pool, damaged)
    const canHeal = n > 0 && !samePool(pool, healed)
    const def = resourceDefs.find((d) => d.key === resourceKey)
    const emptyHint = def?.kind === 'pool' ? def.emptyHint : undefined
    const reason = n === 0
      ? 'Enter an amount. Damage uses bonus HP first.'
      : !canHeal ? 'Already at full HP.'
      : !canDamage ? (emptyHint ?? 'Already at 0 HP.')
      : 'Damage uses bonus HP first.'
    body = (
      <>
        <View className="items-center gap-1">
          <Text variant="stat">{`${pool.current}/${pool.max}`}</Text>
          {temp > 0 ? <Text variant="caption" tone="muted">{`+${temp} bonus HP`}</Text> : null}
        </View>
        {amountInput}
        {n > 0 ? (
          <View className="flex-row gap-2">
            <Preview
              label="After damage"
              from={pool.current}
              to={damaged.current}
              bonus={temp > 0 ? `Bonus HP ${temp} → ${damaged.temp ?? 0}` : undefined}
            />
            <Preview label="After healing" from={pool.current} to={healed.current} />
          </View>
        ) : null}
        <Text variant="caption" tone="muted" className="text-center">{reason}</Text>
        <View className="flex-row gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!canDamage}
            accessibilityLabel={n > 0 ? `Take ${n} damage` : 'Damage'}
            onPress={() => apply((cur) => adjustPool(cur, -n))}
          >
            <Text numberOfLines={1}>{n > 0 ? `Take ${n} damage` : 'Damage'}</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={!canHeal}
            accessibilityLabel={n > 0 ? `Heal ${n}` : 'Heal'}
            onPress={() => apply((cur) => adjustPool(cur, n))}
          >
            <Text numberOfLines={1}>{n > 0 ? `Heal ${n}` : 'Heal'}</Text>
          </Button>
        </View>
      </>
    )
  } else {
    const next = setTemp(pool, n)
    const canSet = n > 0 && (next.temp ?? 0) !== temp
    const label = n > 0 ? `Set bonus HP to ${n}` : 'Set bonus HP'
    body = (
      <>
        <Text variant="body-sm" tone="muted">Bonus HP absorbs damage first. It doesn’t stack: the higher value is kept.</Text>
        {amountInput}
        <Text variant="caption" tone="muted" className="text-center">
          {n === 0 ? `Now ${temp}.` : canSet ? `Bonus HP ${temp} → ${next.temp ?? 0}` : `Bonus HP doesn’t stack: ${temp} is already higher.`}
        </Text>
        <Button disabled={!canSet} accessibilityLabel={label} onPress={() => apply((cur) => setTemp(cur, n))}>
          <Text>{label}</Text>
        </Button>
      </>
    )
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{mode === 'adjust' ? 'Hit points' : 'Bonus HP'}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
