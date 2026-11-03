import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { useAuth } from '@/features/auth/useAuth'
import type { CharacterFull } from '@/features/characters/characters.api'
import { buildPlayerOrder, type PlayerRow, type PlayerSideEnemyRow } from './battleOrder'
import type { Combat } from './combat.api'
import { useCombatOrder } from './combat.queries'
import { HpEntryBar } from './HpEntryBar'
import { CurrentMark, initText, PlayerRowCard } from './PlayerRowCard'
import { usePlayerCombatHp } from './usePlayerCombatHp'

/** A teammate's row is read-only; the viewer's own row opens the HP entry, wired to their own character only. */
function OwnRow({ row, character, campaignId }: { row: PlayerRow; character: CharacterFull; campaignId: string }) {
  const [open, setOpen] = useState(false)
  const hp = usePlayerCombatHp(character, campaignId)
  return (
    <PlayerRowCard row={row} expanded={open} onPress={() => setOpen((o) => !o)}>
      {open ? (
        <HpEntryBar label={row.name} canUndo={hp.canUndo} onDamage={hp.damage} onHeal={hp.heal} onTemp={hp.temp} onUndo={hp.undo} />
      ) : null}
    </PlayerRowCard>
  )
}

/** An enemy as a player sees it: a name and a place in the order, nothing else. */
function EnemyOrderRow({ row }: { row: PlayerSideEnemyRow }) {
  const spoken = [row.name, row.initiative === null ? null : `initiative ${row.initiative}`, row.isCurrent ? 'current turn' : null].filter(Boolean).join(', ')
  return (
    <View accessible accessibilityLabel={spoken}>
      <Card compact tone={row.isCurrent ? 'selected' : 'default'} className="gap-1">
        <View className="flex-row items-center gap-2">
          <Text variant="subhead" className="flex-1" numberOfLines={1}>{row.name}</Text>
          <Text variant="label" tone="muted">{initText(row.initiative)}</Text>
        </View>
        {row.isCurrent ? <CurrentMark /> : null}
      </Card>
    </View>
  )
}

/**
 * The battle order as a player sees it: the round, then everyone in turn order. While a hidden enemy
 * holds the turn nothing changes on screen (no row, no flag). Enemies are names only. Built
 * from view models whose enemy type has no hit point, armor class, notes or hidden field, so there is
 * nothing here that could leak one.
 */
export function PlayerBattleOrder({ campaign, combat, party }: { campaign: CampaignFull; combat: Combat; party: CharacterFull[] }) {
  const { user } = useAuth()
  const order = useCombatOrder(combat)
  const { round, rows } = buildPlayerOrder({ combat, order: order.data ?? [], party, userId: user?.id })

  const lastRound = useRef(round)
  useEffect(() => {
    if (round !== lastRound.current) AccessibilityInfo.announceForAccessibility(`Round ${round}`)
    lastRound.current = round
  }, [round])

  return (
    <View className="gap-3">
      <Text variant="heading" accessibilityRole="header">{`Round ${round}`}</Text>
      <View className="gap-2">
        {rows.map((row) => {
          const character = row.kind === 'player' ? party.find((c) => c.id === row.characterId) : undefined
          return (
            <View key={row.id} testID={`row-${row.id}`}>
              {row.kind === 'enemy' ? (
                <EnemyOrderRow row={row} />
              ) : row.isMine && character ? (
                <OwnRow row={row} character={character} campaignId={campaign.id} />
              ) : (
                <PlayerRowCard row={row} />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
