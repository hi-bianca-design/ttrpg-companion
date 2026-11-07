import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { toAppError } from '@/features/errors'
import type { Encounter } from './encounters.api'
import { useDeleteEncounter } from './encounters.queries'

type Props = { campaignId: string; encounter: Encounter; onClose: () => void }

/** Confirms, then deletes the encounter (its enemies go with it). A failure keeps the dialog open. */
export function DeleteEncounterDialog({ campaignId, encounter, onClose }: Props) {
  const del = useDeleteEncounter(campaignId)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      await del.mutateAsync(encounter.id)
      onClose()
    } catch (e) {
      showToast(toAppError(e).message)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Delete ${encounter.name}?`}</DialogTitle>
          <DialogDescription>The encounter and its enemies are removed for good. Fights already started are not affected.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
          <Button variant="destructive" disabled={busy} accessibilityLabel="Delete encounter" onPress={confirm}>
            <Text>Delete</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
