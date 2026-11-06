import { useState } from 'react'
import { Pressable, View } from 'react-native'
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
import { useEndCombat } from '@/features/combat/useEndCombat'
import { canEndCombat } from './combat'
import type { Session } from './sessions.api'
import { useActiveSession, useSetCombat } from './sessions.queries'
import { useCharacterSession } from './useCharacterSession'

// The badge plate is ~22pt tall; 11pt above and below brings the touch target to 44pt.
const HIT_SLOP = { top: 11, bottom: 11, left: 8, right: 8 }

/**
 * Combat state for a campaign's session: `Enter combat` for any member out of combat, `In combat`
 * once it starts (tappable to end it for the GM or whoever started it). Nothing without a session.
 * Takes the campaign and session explicitly so the sheet and the campaign screen can share it.
 */
export function CombatBadgeView({ campaignId, session }: { campaignId: string | undefined; session: Session | null }) {
  const gmId = useCampaign(campaignId).data?.gm_id
  const { user } = useAuth()
  const setCombat = useSetCombat(campaignId ?? '')
  const endCombat = useEndCombat(campaignId ?? '')
  const [confirming, setConfirming] = useState(false)

  if (!session) return null

  // mutateAsync, not mutate's per-call onError: that callback is dropped if this badge unmounts
  // first, which it does when a poll finds the session ended while the call is still in flight.
  const change = (inCombat: boolean) => {
    // Ending goes through useEndCombat so the round and XP are captured first and the summary shows after.
    ;(inCombat ? setCombat.mutateAsync({ sessionId: session.id, inCombat }) : endCombat(session.id))
      .catch((e) => showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed))
  }

  if (!session.in_combat) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Enter combat" hitSlop={HIT_SLOP} onPress={() => change(true)}>
        <Badge>
          <View className="flex-row items-center gap-2">
            <Shield size={14} color={THEME_COLORS.foreground} weight="duotone" />
            <Text variant="label">Enter combat</Text>
          </View>
        </Badge>
      </Pressable>
    )
  }

  if (!canEndCombat(session, user?.id, gmId)) return <Badge variant="tinted">In combat</Badge>

  // One wrapper, not a fragment: the dialog would otherwise be a third child of a justify-between row and push this badge off the right edge.
  return (
    <View>
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
    </View>
  )
}

/** The character sheet's combat badge: the campaign and session come from the open sheet's character. */
export function CombatBadge() {
  const characterId = useCharacterRouteId()
  const session = useCharacterSession(characterId)
  const campaignId = useCharacterCampaign(characterId).data?.id
  return <CombatBadgeView campaignId={campaignId} session={session} />
}

/** The campaign screen's combat badge (a GM has no sheet): the campaign is given, never looked up by character. */
export function CampaignCombatBadge({ campaignId }: { campaignId: string }) {
  const session = useActiveSession(campaignId).data ?? null
  return <CombatBadgeView campaignId={campaignId} session={session} />
}
