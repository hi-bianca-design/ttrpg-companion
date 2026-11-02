import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import { useActiveSession, useEndSession, useOpenSession } from './sessions.queries'

/**
 * Open / End session for a campaign. Any active member (and the GM, who may have no character)
 * can open; the GM or whoever opened it can end, after a confirm. Invited members see nothing.
 */
export function SessionControls({ campaign }: { campaign: CampaignFull }) {
  const { user } = useAuth()
  const session = useActiveSession(campaign.id).data ?? null
  const open = useOpenSession(campaign.id)
  const end = useEndSession(campaign.id)
  const [confirming, setConfirming] = useState(false)

  const isGm = campaign.gm_id === user?.id
  const mine = campaign.members.find((m) => m.user_id === user?.id)
  if (!isGm && mine?.status !== 'active') return null

  const canEnd = !!session && (isGm || session.opened_by === user?.id)
  const error = (session ? end.error : open.error) as Error | null

  return (
    <View className="items-start gap-2">
      {!session ? (
        <Button accessibilityLabel="Open session" disabled={open.isPending} onPress={() => open.mutate()}>
          <Text>Open session</Text>
        </Button>
      ) : canEnd ? (
        <Button variant="destructive" accessibilityLabel="End session" onPress={() => setConfirming(true)}>
          <Text>End session</Text>
        </Button>
      ) : (
        <Text variant="body-sm" tone="muted">A session is in progress.</Text>
      )}
      {error ? <Text variant="caption" tone="destructive">{error.message}</Text> : null}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>Combat and any active turn will end too.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" accessibilityLabel="Cancel" onPress={() => setConfirming(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              accessibilityLabel="End session"
              onPress={() => {
                if (session) end.mutate(session.id)
                setConfirming(false)
              }}
            >
              <Text>End session</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
