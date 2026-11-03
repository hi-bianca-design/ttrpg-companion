// Editor for a character's languages: Common is fixed, everything else is typed free text.
import { useEffect, useState } from 'react'
import { AdjustSheet } from '@/components/game/AdjustSheet'
import { LanguageEditor } from '../LanguageEditor'
import { normalizeLanguages } from '../languages'

type LanguagesSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current languages, Common included or not. */
  value: string[]
  onApply: (next: string[]) => void
}

const COMMON = 'Common'
const withoutCommon = (list: string[]) => list.filter((l) => l.toLowerCase() !== COMMON.toLowerCase())

export function LanguagesSheet({ open, onOpenChange, value, onApply }: LanguagesSheetProps) {
  const [draft, setDraft] = useState<string[]>(withoutCommon(value))
  useEffect(() => {
    if (open) setDraft(withoutCommon(value))
  }, [open, value])

  return (
    <AdjustSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Languages"
      primaryLabel="Apply"
      onPrimary={() => {
        onApply(normalizeLanguages([COMMON, ...draft]))
        onOpenChange(false)
      }}
    >
      <LanguageEditor fixed={[COMMON]} value={draft} onChange={setDraft} />
    </AdjustSheet>
  )
}
