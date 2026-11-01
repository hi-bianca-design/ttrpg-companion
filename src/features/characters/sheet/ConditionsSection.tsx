import { View } from 'react-native'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { CharacterFull } from '../characters.api'
import { titleCase } from './format'

/** Active conditions as chips, with an Edit action that opens the conditions sheet. */
export function ConditionsSection({ character, onEdit }: { character: CharacterFull; onEdit: () => void }) {
  return (
    <SectionHeader
      id={`${character.id}:conditions`}
      title="Conditions"
      action={(
        <Button variant="ghost" size="sm" accessibilityLabel="Edit conditions" onPress={onEdit}>
          <Text>Edit</Text>
        </Button>
      )}
    >
      {character.conditions.length === 0 ? (
        <Text variant="caption" tone="muted">None</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {character.conditions.map((c) => <Badge key={c}>{titleCase(c)}</Badge>)}
        </View>
      )}
    </SectionHeader>
  )
}
