import { useEffect, useRef } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { Sword } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/useAuth'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useActiveCombat, useCombatOrder, useEndMyTurn } from '@/features/combat/combat.queries'
import { useCombatRealtime } from '@/features/combat/useCombatRealtime'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { ERROR_COPY } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'

/**
 * "Your turn" for the player whose row in the battle order is current, on their own sheet; nothing
 * otherwise. Read from the combat, so it works on every tab and updates as the GM moves the turn.
 */
export function TurnBanner() {
  const characterId = useCharacterRouteId()
  const campaignId = useCharacterCampaign(characterId).data?.id
  const { user } = useAuth()
  useCombatRealtime(campaignId, !!campaignId && !!user)
  const combat = useActiveCombat(campaignId).data ?? null
  const order = useCombatOrder(combat).data
  const endTurn = useEndMyTurn(campaignId ?? '', combat?.id)
  const ending = useRef(false)

  const mine = user && characterId ? order?.find((r) => r.user_id === user.id && r.character_id === characterId) : undefined
  const holds = !!combat && combat.status === 'active' && !!mine && combat.turn_entry_id === mine.id

  // The turn arrives by Realtime, so tell screen-reader users when it does.
  useEffect(() => {
    if (holds) AccessibilityInfo.announceForAccessibility('Your turn')
  }, [holds])

  if (!combat || !holds) return null

  // mutateAsync, not mutate's per-call onError: that callback is dropped if this banner unmounts
  // first, which it does as soon as the refetch finds the turn has moved on. The ref is the double-tap
  // guard: `isPending` only turns true on the next render.
  const end = () => {
    if (ending.current) return
    ending.current = true
    endTurn
      .mutateAsync({ expectedRound: combat.round })
      .catch((e) => showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed))
      .finally(() => { ending.current = false })
  }

  return (
    <Card tone="selected" className="gap-3" accessibilityLiveRegion="polite">
      <View className="flex-row items-start gap-3">
        <Sword size={20} color={THEME_COLORS.primary} weight="duotone" />
        <View className="flex-1 gap-1">
          <Text variant="heading" tone="accent" accessibilityRole="header">Your turn</Text>
          <Text variant="body-sm" tone="muted">Take your action, bonus action, and movement</Text>
        </View>
      </View>
      <Button accessibilityLabel="End Turn" disabled={endTurn.isPending} onPress={end}>
        <Text>End Turn</Text>
      </Button>
    </Card>
  )
}
