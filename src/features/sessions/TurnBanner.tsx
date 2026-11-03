import { useEffect } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { Sword } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/useAuth'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacter } from '@/features/characters/characters.queries'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { ERROR_COPY } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'
import { useEndTurn } from './sessions.queries'
import { holdsTurn } from './turn'
import { useCharacterSession } from './useCharacterSession'

/** "Your turn" for the player the GM gave the turn to, on their own sheet; nothing otherwise. */
export function TurnBanner() {
  const characterId = useCharacterRouteId()
  const session = useCharacterSession(characterId)
  const campaignId = useCharacterCampaign(characterId).data?.id
  const ownerId = useCharacter(characterId).data?.owner_id
  const { user } = useAuth()
  const endTurn = useEndTurn(campaignId ?? '')

  const holds = !!session && holdsTurn(session, user?.id, ownerId)

  // The turn arrives by poll, so tell screen-reader users when it does.
  useEffect(() => {
    if (holds) AccessibilityInfo.announceForAccessibility('Your turn')
  }, [holds])

  if (!session || !holds) return null

  // mutateAsync, not mutate's per-call onError: that callback is dropped if this banner unmounts
  // first, which it does as soon as a poll finds the turn has moved on.
  const end = () => {
    endTurn
      .mutateAsync(session.id)
      .catch((e) => showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed))
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
