// D&D sheet section: the character's languages (`details.languages`) with an editor the owner can open at any
// time. Registered as `sheet.sections.languages`. An unset list is "not recorded"; nothing is written until Apply.
import { useState } from 'react'
import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { SheetSectionProps } from '../../types'
import { characterLanguages, startingLanguages } from '../languages'
import { LanguagesSheet } from './LanguagesSheet'

export function LanguagesSection({ character, picks, onSaveDetails }: SheetSectionProps) {
  const [open, setOpen] = useState(false)
  const recorded = characterLanguages(character)
  const has = recorded !== null && recorded.length > 0
  const className = picks.find((p) => p.kind === 'class')?.content.name ?? ''
  // Unset: the editor starts from what every character of this class knows, so one tap records it.
  const editorValue = has ? recorded : startingLanguages({ className, species: [], background: [], chosen: [] })

  return (
    <SectionHeader id={`${character.id}:languages`} title="Languages" collapsible>
      <View className="gap-3">
        {has ? (
          <View className="flex-row flex-wrap gap-2">
            {recorded.map((l) => <Badge key={l}>{l}</Badge>)}
          </View>
        ) : (
          <Text variant="body-sm" tone="muted">No languages recorded yet</Text>
        )}
        {onSaveDetails ? (
          <>
            <Button variant="outline" size="sm" accessibilityLabel={has ? 'Edit languages' : 'Add languages'} onPress={() => setOpen(true)}>
              <Text>{has ? 'Edit' : 'Add languages'}</Text>
            </Button>
            <LanguagesSheet
              open={open}
              onOpenChange={setOpen}
              value={editorValue}
              onApply={(languages) => onSaveDetails({ languages })}
            />
          </>
        ) : null}
      </View>
    </SectionHeader>
  )
}
