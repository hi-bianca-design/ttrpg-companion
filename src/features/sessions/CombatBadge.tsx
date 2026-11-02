import { useState } from 'react'
import { Pressable } from 'react-native'
import { Shield } from 'phosphor-react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/useAuth'
import { useCampaign, useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { ERROR_COPY } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'
import { canEndCombat } from './combat'
import { useSetCombat } from './sessions.queries'
import { useCharacterSession } from './useCharacterSession'

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 }

/**
 * Combat state for the sheet's session: `Enter combat` for any member out of combat, `In combat`
 * once it starts (tappable to end it for the GM or whoever started it). Nothing without a session.
 */
export function CombatBadge() {
  const characterId = useCharacterRouteId()
  const session = useCharacterSession(characterId)
  const campaignId = useCharacterCampaign(characterId).data?.id
  const gmId = useCampaign(campaignId).data?.gm_id
  const { user } = useAuth()
  const setCombat = useSetCombat(campaignId ?? '')
  const [confirming, setConfirming] = useState(false)

  if (!session) return null

  const change = (inCombat: boolean) =>
    setCombat.mutate(
      { sessionId: session.id, inCombat },
      { onError: (e) => showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed) },
    )

  if (!session.in_combat) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Enter combat" hitSlop={HIT_SLOP} onPress={() => change(true)}>
        <Badge>
          <Shield size={14} color={THEME_COLORS.foreground} weight="duotone" />
          <Text variant="label">Enter combat</Text>
        </Badge>
      </Pressable>
    )
  }

  if (!canEndCombat(session, user?.id, gmId)) return <Badge variant="tinted">In combat</Badge>

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="In combat" accessibilityHint="Ends combat" hitSlop={HIT_SLOP} onPress={() => setConfirming(true)}>
        <Badge variant="tinted">In combat</Badge>
      </Pressable>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End combat?</DialogTitle>
            <DialogDescription>The current turn will be cleared.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" accessibilityLabel="Cancel" onPress={() => setConfirming(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              accessibilityLabel="End combat"
              onPress={() => {
                change(false)
                setConfirming(false)
              }}
            >
              <Text>End combat</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
