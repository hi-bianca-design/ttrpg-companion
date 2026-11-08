import { PencilSimple, Plus, Sword, Trash } from 'phosphor-react-native'
import { View } from 'react-native'
import { EmptyState } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import type { Encounter } from '@/features/encounters/encounters.api'
import { THEME_COLORS } from '@/lib/theme'
import { NEW_ENCOUNTER_LABEL, NO_ENCOUNTERS_BODY, NO_ENCOUNTERS_TITLE } from './copy'

type EncounterPickerProps = {
  encounters: Encounter[]
  onPick: (id: string) => void
  /** Encounters already in the draft: shown, but not pickable again. */
  pickedIds?: readonly string[]
  /** GM authoring. Each is passed only to the GM, so a player (or the mid-fight Add enemy sheet) never sees the controls. */
  onCreate?: () => void
  onEdit?: (encounter: Encounter) => void
  onDelete?: (encounter: Encounter) => void
}

const enemyCount = (e: Encounter) => e.enemies.reduce((n, x) => n + x.count, 0)

/** The campaign's saved encounters as a plain list. Picking one never starts combat; it only reports the id. */
export function EncounterPicker({ encounters, onPick, pickedIds = [], onCreate, onEdit, onDelete }: EncounterPickerProps) {
  if (encounters.length === 0) {
    return (
      <EmptyState
        icon={Sword}
        title={NO_ENCOUNTERS_TITLE}
        body={NO_ENCOUNTERS_BODY}
        actionLabel={onCreate ? NEW_ENCOUNTER_LABEL : undefined}
        onAction={onCreate}
      />
    )
  }
  return (
    <View className="gap-2">
      {onCreate ? (
        <Button variant="secondary" accessibilityLabel={NEW_ENCOUNTER_LABEL} onPress={onCreate}>
          <Plus size={16} color={THEME_COLORS.secondaryForeground} />
          <Text>{NEW_ENCOUNTER_LABEL}</Text>
        </Button>
      ) : null}
      {encounters.map((e) => {
        const added = pickedIds.includes(e.id)
        const count = enemyCount(e)
        const detail = added ? 'Already added' : count === 1 ? '1 enemy' : `${count} enemies`
        return (
          <View key={e.id} className="flex-row items-center gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={added}
              accessibilityLabel={added ? `${e.name}, already added` : e.name}
              onPress={() => onPick(e.id)}
            >
              <Text numberOfLines={1}>{e.name}</Text>
              <Text variant="caption" tone="muted">{detail}</Text>
            </Button>
            {onEdit ? (
              <Button variant="ghost" size="icon" accessibilityLabel={`Edit ${e.name}`} onPress={() => onEdit(e)}>
                <PencilSimple size={16} color={THEME_COLORS.foreground} />
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" size="icon" accessibilityLabel={`Delete ${e.name}`} onPress={() => onDelete(e)}>
                <Trash size={16} color={THEME_COLORS.foreground} />
              </Button>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
