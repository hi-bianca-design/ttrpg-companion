import { Sword } from 'phosphor-react-native'
import { View } from 'react-native'
import { EmptyState } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { Encounter } from '@/features/encounters/encounters.api'
import { NO_ENCOUNTERS_BODY, NO_ENCOUNTERS_TITLE } from './copy'

type EncounterPickerProps = {
  encounters: Encounter[]
  onPick: (id: string) => void
  /** Encounters already in the draft: shown, but not pickable again. */
  pickedIds?: readonly string[]
}

const enemyCount = (e: Encounter) => e.enemies.reduce((n, x) => n + x.count, 0)

/** The campaign's saved encounters as a plain list. Picking one never starts combat; it only reports the id. */
export function EncounterPicker({ encounters, onPick, pickedIds = [] }: EncounterPickerProps) {
  if (encounters.length === 0) {
    return <EmptyState icon={Sword} title={NO_ENCOUNTERS_TITLE} body={NO_ENCOUNTERS_BODY} />
  }
  return (
    <View className="gap-2">
      {encounters.map((e) => {
        const added = pickedIds.includes(e.id)
        const count = enemyCount(e)
        const detail = added ? 'Already added' : count === 1 ? '1 enemy' : `${count} enemies`
        return (
          <Button
            key={e.id}
            variant="outline"
            disabled={added}
            accessibilityLabel={added ? `${e.name}, already added` : e.name}
            onPress={() => onPick(e.id)}
          >
            <Text numberOfLines={1}>{e.name}</Text>
            <Text variant="caption" tone="muted">{detail}</Text>
          </Button>
        )
      })}
    </View>
  )
}
