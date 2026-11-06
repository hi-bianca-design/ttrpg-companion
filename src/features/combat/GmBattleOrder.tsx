import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { ArrowDown, ArrowUp, DotsSixVertical } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import type { CharacterFull } from '@/features/characters/characters.api'
import { ERROR_COPY } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'
import { AddEnemyForm } from './AddEnemyForm'
import { buildGmOrder, reorderTarget, selectGroup, toggleSelected, type GmEnemyRow, type PlayerRow } from './battleOrder'
import { BulkBar } from './BulkBar'
import type { Combat, EnemyPatch } from './combat.api'
import {
  useCombatEntries, useDelayTurn, useMoveEntry, useNextTurn, useRemoveEntry, useSetCurrentEntry, useUpdateEnemy,
} from './combat.queries'
import { EnemyRow } from './EnemyRow'
import { PlayerRowCard } from './PlayerRowCard'
import { useEnemyHp } from './useEnemyHp'

const FALLBACK_ROW_HEIGHT = 120

/** One list row: a drag grip, the row, and the always-visible turn tools (Make current / Delay, Move up / down). */
function RowFrame({ row, index, count, onMove, onMakeCurrent, onDelay, children }: {
  row: PlayerRow | GmEnemyRow
  index: number
  count: number
  onMove: (toPosition: number) => void
  onMakeCurrent: () => void
  onDelay: () => void
  children: React.ReactNode
}) {
  const height = useRef(FALLBACK_ROW_HEIGHT)
  const pos = index + 1
  // The drag is only a wrapper around reorderTarget; the Move buttons carry the tested, accessible behaviour.
  const drag = Gesture.Pan().runOnJS(true).onEnd((e) => {
    const to = reorderTarget(pos, e.translationY, height.current, count)
    if (to !== pos) onMove(to)
  })
  const icon = THEME_COLORS.accentForeground
  return (
    <View testID={`row-${row.id}`} className="gap-1" onLayout={(e: LayoutChangeEvent) => { height.current = e.nativeEvent.layout.height || FALLBACK_ROW_HEIGHT }}>
      <View className="flex-row items-start gap-1">
        <GestureDetector gesture={drag}>
          <View className="h-11 w-8 items-center justify-center" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <DotsSixVertical size={20} color={icon} />
          </View>
        </GestureDetector>
        <View className="flex-1">{children}</View>
      </View>
      <View className="flex-row flex-wrap items-center justify-end gap-2">
        {row.isCurrent ? (
          <Button size="sm" variant="outline" accessibilityLabel={`Delay: ${row.name}`} onPress={onDelay}><Text>Delay</Text></Button>
        ) : (
          <Button size="sm" variant="outline" accessibilityLabel={`Make current: ${row.name}`} onPress={onMakeCurrent}><Text>Make current</Text></Button>
        )}
        <Button size="icon" variant="outline" disabled={pos === 1} accessibilityLabel={`Move up: ${row.name}`} onPress={() => onMove(pos - 1)}>
          <ArrowUp size={16} color={icon} />
        </Button>
        <Button size="icon" variant="outline" disabled={pos === count} accessibilityLabel={`Move down: ${row.name}`} onPress={() => onMove(pos + 1)}>
          <ArrowDown size={16} color={icon} />
        </Button>
      </View>
    </View>
  )
}

/**
 * The GM's battle order: one list in turn order, players read-only (their numbers are theirs), enemies
 * with their controls, bulk damage by selection or group, and the turn tools. The server is the only
 * place that computes anything; every action refetches, so a stale tap or an ended fight simply repairs.
 */
export function GmBattleOrder({ campaign, combat, party }: { campaign: CampaignFull; combat: Combat; party: CharacterFull[] }) {
  const entries = useCombatEntries(combat, true)
  const hp = useEnemyHp(campaign.id, combat.id)
  const next = useNextTurn(campaign.id, combat.id)
  const delay = useDelayTurn(campaign.id, combat.id)
  const makeCurrent = useSetCurrentEntry(campaign.id, combat.id)
  const move = useMoveEntry(campaign.id, combat.id)
  const update = useUpdateEnemy(campaign.id, combat.id)
  const remove = useRemoveEntry(campaign.id, combat.id)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const turnBusy = useRef(false)

  const { round, currentId, rows } = buildGmOrder({ combat, entries: entries.data ?? [], party, userId: undefined })
  const enemies = rows.filter((r): r is GmEnemyRow => r.kind === 'enemy')
  const selectedIds = enemies.filter((e) => selected.has(e.id)).map((e) => e.id)

  const lastRound = useRef(round)
  useEffect(() => {
    if (round !== lastRound.current) AccessibilityInfo.announceForAccessibility(`Round ${round}`)
    lastRound.current = round
  }, [round])

  // Errors surface here, not per call: a refetch can unmount the row that started the request.
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
  const patch = (entryId: string) => (p: EnemyPatch) => run(() => update.mutateAsync({ entryId, patch: p }))

  return (
    <View className="gap-3">
      <Text variant="heading" accessibilityRole="header">{`Round ${round}`}</Text>
      <Button disabled={!currentId} onPress={() => currentId && run(() => next.mutateAsync({ expectedEntryId: currentId }), true)}>
        <Text>Next turn</Text>
      </Button>
      {selectedIds.length > 0 ? <BulkBar selectedIds={selectedIds} hp={hp} onClear={() => setSelected(new Set())} /> : null}
      <View className="gap-3">
        {rows.map((row, i) => (
          <RowFrame
            key={row.id}
            row={row}
            index={i}
            count={rows.length}
            onMove={(to) => run(() => move.mutateAsync({ entryId: row.id, toPosition: to }))}
            onMakeCurrent={() => run(() => makeCurrent.mutateAsync({ entryId: row.id }), true)}
            onDelay={() => run(() => delay.mutateAsync({ expectedEntryId: row.id }), true)}
          >
            {row.kind === 'enemy' ? (
              <EnemyRow
                row={row}
                selected={selected.has(row.id)}
                onToggleSelect={() => setSelected((s) => toggleSelected(s, row.id))}
                hp={hp}
                onSelectGroup={row.groupId && selectGroup(enemies, row.id).length > 1 ? () => setSelected(new Set(selectGroup(enemies, row.id))) : undefined}
                onPatch={patch(row.id)}
                onRemove={() => run(() => remove.mutateAsync({ entryId: row.id }))}
              />
            ) : (
              <PlayerRowCard row={row} />
            )}
          </RowFrame>
        ))}
      </View>
      {enemies.length === 0 ? <Text variant="body-sm" tone="muted">No enemies yet</Text> : null}
      <Button variant="outline" onPress={() => setAdding(true)}>
        <Text>Add enemy</Text>
      </Button>
      <AddEnemyForm campaignId={campaign.id} combatId={combat.id} open={adding} onOpenChange={setAdding} />
    </View>
  )
}
