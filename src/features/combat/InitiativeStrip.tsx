import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { ERROR_COPY } from '@/features/errors'
import { cn } from '@/lib/utils'
import type { GmEnemyRow, PlayerRow } from './battleOrder'
import { useMoveEntry, useNextTurn, useSetCurrentEntry } from './combat.queries'
import { sentOrQueued } from './offlineMutations'
import { CurrentMark } from './PlayerRowCard'

/**
 * The turn control: the round, everyone in order as chips, and one large Next turn. It reads the GM order
 * rows the screen already built (no second source of truth). The server skips downed enemies on Next turn;
 * tapping a chip is how the GM stops on one. Order changes are the move buttons: a chip's 1-based row index
 * plus or minus one (the server keeps positions dense, so index and stored position agree). One slim row:
 * Round, the chips in a single horizontal scroll (the current one scrolled into view), then Next turn.
 */
export function InitiativeStrip({ campaignId, combatId, rows, currentId, round }: {
  campaignId: string
  combatId: string
  rows: (PlayerRow | GmEnemyRow)[]
  currentId: string | null
  round: number
}) {
  const next = useNextTurn(campaignId, combatId)
  const setCurrent = useSetCurrentEntry(campaignId, combatId)
  const move = useMoveEntry(campaignId, combatId)
  const turnBusy = useRef(false)
  const scroller = useRef<ScrollView>(null)
  const chipX = useRef(new Map<string, number>())

  const lastRound = useRef(round)
  useEffect(() => {
    if (round !== lastRound.current) AccessibilityInfo.announceForAccessibility(`Round ${round}`)
    lastRound.current = round
  }, [round])

  useEffect(() => {
    const x = currentId ? chipX.current.get(currentId) : undefined
    if (x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: true })
  }, [currentId])

  // Errors surface here, not per call: a refetch can unmount the chip that started the request. Offline,
  // each call resolves once queued (the cards already show it), so the busy guard never blocks the next tap.
  const run = async (fn: () => Promise<unknown>, exclusive = false) => {
    if (exclusive) {
      if (turnBusy.current) return
      turnBusy.current = true
    }
    try {
      await fn()
    } catch (e) {
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
    } finally {
      if (exclusive) turnBusy.current = false
    }
  }

  return (
    <View testID="initiative-strip" className="flex-row items-center gap-3">
      <Text variant="heading" accessibilityRole="header">{`Round ${round}`}</Text>
      <ScrollView testID="strip-scroll" ref={scroller} horizontal showsHorizontalScrollIndicator className="flex-1">
        <View className="flex-row items-center gap-2">
        {rows.map((row, i) => {
          const down = row.kind === 'enemy' && row.isDown
          const hidden = row.kind === 'enemy' && row.hidden
          const label = [row.name, row.isCurrent ? 'current turn' : null, down ? 'down' : null, hidden ? 'hidden' : null].filter(Boolean).join(', ')
          return (
            <View
              key={row.id}
              testID={`chip-${row.id}`}
              onLayout={(e) => {
                chipX.current.set(row.id, e.nativeEvent.layout.x)
                if (row.id === currentId) scroller.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 16), animated: false })
              }}
              className={cn('flex-row items-center gap-1 shrink-0 rounded-sm border px-2', row.isCurrent ? 'border-accent' : 'border-border')}
            >
              {i > 0 ? (
                <Button variant="ghost" size="icon" accessibilityLabel={`Move earlier: ${row.name}`} onPress={() => run(() => sentOrQueued(move.mutateAsync({ entryId: row.id, toPosition: i })))}>
                  <Text>‹</Text>
                </Button>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                className="min-h-11 justify-center px-1"
                onPress={() => run(() => sentOrQueued(setCurrent.mutateAsync({ entryId: row.id })))}
              >
                <Text variant="subhead" numberOfLines={1} className={down ? 'line-through' : undefined}>{row.name}</Text>
                <View className="flex-row items-center gap-1">
                  {row.isCurrent ? <CurrentMark /> : null}
                  {down ? <Text variant="label">Down</Text> : null}
                  {hidden ? <Text variant="label" tone="muted">Hidden</Text> : null}
                </View>
              </Pressable>
              {i < rows.length - 1 ? (
                <Button variant="ghost" size="icon" accessibilityLabel={`Move later: ${row.name}`} onPress={() => run(() => sentOrQueued(move.mutateAsync({ entryId: row.id, toPosition: i + 2 })))}>
                  <Text>›</Text>
                </Button>
              ) : null}
            </View>
          )
        })}
        </View>
      </ScrollView>
      <Button disabled={!currentId} onPress={() => currentId && run(() => sentOrQueued(next.mutateAsync({ expectedEntryId: currentId })), true)}>
        <Text>Next turn</Text>
      </Button>
    </View>
  )
}
