import { useState } from 'react'
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import type { CharacterFull } from '@/features/characters/characters.api'
import { ERROR_COPY } from '@/features/errors'
import { SYSTEMS } from '@/systems/registry'
import { AddEnemySheet } from './AddEnemySheet'
import { buildGmOrder, selectGroup, toggleSelected, type GmEnemyRow, type PlayerRow } from './battleOrder'
import { BulkBar } from './BulkBar'
import { cardWidthFor, columnsFor } from './cardsLayout'
import type { Combat, EnemyPatch } from './combat.api'
import { useCombatEntries, useRemoveEntry, useUpdateEnemy } from './combat.queries'
import { EnemyCard } from './EnemyCard'
import { InitiativeStrip } from './InitiativeStrip'
import { PlayerRowCard } from './PlayerRowCard'
import { useCopyEnemy } from './useCopyEnemy'
import { useEnemyHp } from './useEnemyHp'
import { xpEarned } from './xp'

/**
 * The GM's combat screen: a header (XP earned, Add enemy), the initiative strip (round, order, Next turn), every enemy as a fixed-width card in a
 * wrapping grid (one to four across by window width), the bulk bar while anything is selected, and the
 * party as compact read-only cards. The server is the only place that computes anything; every action
 * refetches, so a stale tap or an ended fight simply repairs.
 */
export function GmCombatScreen({ campaign, combat, party }: { campaign: CampaignFull; combat: Combat; party: CharacterFull[] }) {
  const entries = useCombatEntries(combat, true)
  const hp = useEnemyHp(campaign.id, combat.id)
  const update = useUpdateEnemy(campaign.id, combat.id)
  const remove = useRemoveEntry(campaign.id, combat.id)
  const copyEnemy = useCopyEnemy(campaign.id, combat.id)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [gridWidth, setGridWidth] = useState(0)

  // The window sets the column count; a narrower measured container (a side panel, a padded page) can only lower it.
  const windowColumns = columnsFor(useWindowDimensions().width)
  const columns = gridWidth > 0 ? (Math.min(windowColumns, columnsFor(gridWidth)) as typeof windowColumns) : windowColumns
  const cardWidth = cardWidthFor(gridWidth, columns)
  const conditionOptions = SYSTEMS.find((s) => s.id === campaign.system_id)?.conditions ?? []

  const { round, currentId, rows } = buildGmOrder({ combat, entries: entries.data ?? [], party, userId: undefined })
  const enemies = rows.filter((r): r is GmEnemyRow => r.kind === 'enemy')
  const players = rows.filter((r): r is PlayerRow => r.kind === 'player')
  const selectedIds = enemies.filter((e) => selected.has(e.id)).map((e) => e.id)

  // Errors surface here, not per call: a refetch can unmount the card that started the request.
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (e) {
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
    }
  }
  const patch = (entryId: string) => (p: EnemyPatch) => run(() => update.mutateAsync({ entryId, patch: p }))
  const copy = (row: GmEnemyRow) => run(() => copyEnemy(row))

  // One column fills the width; otherwise every card has the same fixed width for this window.
  const cell = columns === 1 ? { className: 'w-full' } : { style: { width: cardWidth } }

  return (
    <View testID="gm-combat" className="gap-4" onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
      <View className="flex-row flex-wrap items-center gap-3">
        {/* Only where kill XP is awarded: some enemy carries an XP value. */}
        <View className="flex-1">
          {enemies.some((e) => e.xp !== null) ? <Text variant="subhead" tone="muted">{`XP earned: ${xpEarned(enemies)}`}</Text> : null}
        </View>
        <Button variant="outline" onPress={() => setAdding(true)}>
          <Text>Add enemy</Text>
        </Button>
      </View>
      <InitiativeStrip campaignId={campaign.id} combatId={combat.id} rows={rows} currentId={currentId} round={round} />

      {selectedIds.length > 0 ? (
        <View testID="bulk-bar">
          <BulkBar selectedIds={selectedIds} hp={hp} onClear={() => setSelected(new Set())} />
        </View>
      ) : null}

      {enemies.length === 0 ? (
        <Text variant="body-sm" tone="muted">No enemies yet</Text>
      ) : (
        <View className="flex-row flex-wrap gap-4">
          {enemies.map((row) => (
            <View key={row.id} testID={`card-${row.id}`} {...cell}>
              <EnemyCard
                row={row}
                selected={selected.has(row.id)}
                onToggleSelect={() => setSelected((s) => toggleSelected(s, row.id))}
                hp={hp}
                conditionOptions={conditionOptions}
                onSelectGroup={row.groupId && selectGroup(enemies, row.id).length > 1 ? () => setSelected(new Set(selectGroup(enemies, row.id))) : undefined}
                onPatch={patch(row.id)}
                onRemove={() => run(() => remove.mutateAsync({ entryId: row.id }))}
                onCopy={() => copy(row)}
              />
            </View>
          ))}
        </View>
      )}

      {players.length > 0 ? (
        <View className="gap-2">
          <Text variant="subhead" accessibilityRole="header">Party</Text>
          <View className="flex-row flex-wrap gap-4">
            {players.map((row) => (
              <View key={row.id} testID={`player-${row.id}`} {...cell}>
                <PlayerRowCard row={row} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <AddEnemySheet campaignId={campaign.id} combatId={combat.id} enemies={enemies} open={adding} onOpenChange={setAdding} />
    </View>
  )
}
