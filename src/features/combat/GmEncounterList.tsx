import { useState } from 'react'
import { DeleteEncounterDialog } from '@/features/encounters/DeleteEncounterDialog'
import { EncounterFormSheet } from '@/features/encounters/EncounterFormSheet'
import type { Encounter } from '@/features/encounters/encounters.api'
import { EncounterPicker } from './EncounterPicker'

type Props = {
  campaignId: string
  encounters: Encounter[]
  onPick: (id: string) => void
}

type Authoring = { kind: 'new' } | { kind: 'edit'; encounter: Encounter } | { kind: 'delete'; encounter: Encounter } | null

/**
 * The GM's encounter list: pick one to run, and create, edit or delete them. GM only: the caller
 * renders it for the GM alone. The form and the delete dialog mount only while in use, so a list
 * nobody is editing runs no mutation hooks.
 */
export function GmEncounterList({ campaignId, encounters, onPick }: Props) {
  const [authoring, setAuthoring] = useState<Authoring>(null)
  const close = () => setAuthoring(null)
  return (
    <>
      <EncounterPicker
        encounters={encounters}
        onPick={onPick}
        onCreate={() => setAuthoring({ kind: 'new' })}
        onEdit={(encounter) => setAuthoring({ kind: 'edit', encounter })}
        onDelete={(encounter) => setAuthoring({ kind: 'delete', encounter })}
      />
      {authoring?.kind === 'new' || authoring?.kind === 'edit' ? (
        <EncounterFormSheet
          campaignId={campaignId}
          encounter={authoring.kind === 'edit' ? authoring.encounter : null}
          open
          onOpenChange={(o) => { if (!o) close() }}
        />
      ) : null}
      {authoring?.kind === 'delete' ? <DeleteEncounterDialog campaignId={campaignId} encounter={authoring.encounter} onClose={close} /> : null}
    </>
  )
}
