import { useMemo, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { showToast } from '@/components/ui/toast'
import { toAppError } from '@/features/errors'
import { EncounterFields } from './EncounterFields'
import { blankDraft, draftFromEncounter } from './encounterForm'
import type { Encounter, EncounterInput } from './encounters.api'
import { useSaveEncounter } from './encounters.queries'

type Props = {
  campaignId: string
  /** Absent: a new encounter. Present: edit it, prefilled. */
  encounter?: Encounter | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Saving is ONE atomic RPC; on failure the sheet stays open with everything typed. */
function SheetForm({ campaignId, encounter, onClose }: { campaignId: string; encounter?: Encounter | null; onClose: () => void }) {
  const save = useSaveEncounter(campaignId)
  const initial = useMemo(() => (encounter ? draftFromEncounter(encounter) : blankDraft()), [encounter])
  const [busy, setBusy] = useState(false)
  // The ref is the guard (two taps in one frame both see the old state); the state only disables the button.
  const inFlight = useRef(false)

  const submit = async (input: EncounterInput) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      await save.mutateAsync({ input, encounterId: encounter?.id })
      onClose()
    } catch (e) {
      showToast(toAppError(e).message)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <EncounterFields initial={initial} submitLabel={encounter ? 'Save changes' : 'Create encounter'} busy={busy} onSubmit={submit} />
}

/** The GM's New / Edit encounter form in a bottom sheet. The form's state lives only while the sheet is open. */
export function EncounterFormSheet({ campaignId, encounter, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{encounter ? 'Edit encounter' : 'New encounter'}</SheetTitle>
        </SheetHeader>
        <SheetForm campaignId={campaignId} encounter={encounter} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
