import { Plus } from 'phosphor-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SheetBody } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import {
  NAME_MAX, STORY_MAX, blankEnemy, moveEnemy, toSaveInput, validateDraft, type EncounterDraft, type EnemyDraft,
} from './encounterForm'
import type { EncounterInput } from './encounters.api'
import { EnemyRowFields } from './EnemyRowFields'
import { FormField } from './FormField'

type Props = {
  initial: EncounterDraft
  submitLabel: string
  busy: boolean
  onSubmit: (input: EncounterInput) => void
}

/**
 * The encounter's name, three story notes and enemy rows. Its state is local to one open of the sheet.
 * Save stays disabled until the name and every enemy row are valid, and each gap shows its reason.
 */
export function EncounterFields({ initial, submitLabel, busy, onSubmit }: Props) {
  const [draft, setDraft] = useState(initial)
  const errors = validateDraft(draft)
  const set = (patch: Partial<EncounterDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setEnemy = (i: number, patch: Partial<EnemyDraft>) =>
    setDraft((d) => ({ ...d, enemies: d.enemies.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))

  return (
    <>
      <SheetBody maxShare={0.6} className="gap-3">
        <FormField label="Name" reason={errors.name} empty={draft.name.trim() === ''}>
          <Input accessibilityLabel="Encounter name" placeholder="Wolf ambush" value={draft.name} maxLength={NAME_MAX} onChangeText={(t) => set({ name: t })} />
        </FormField>
        <FormField label="How the party got here" reason={errors.storyBefore}>
          <Input accessibilityLabel="How the party got here" placeholder="Optional" multiline maxLength={STORY_MAX} value={draft.storyBefore} onChangeText={(t) => set({ storyBefore: t })} />
        </FormField>
        <FormField label="Why this fight exists" reason={errors.storyWhy}>
          <Input accessibilityLabel="Why this fight exists" placeholder="Optional" multiline maxLength={STORY_MAX} value={draft.storyWhy} onChangeText={(t) => set({ storyWhy: t })} />
        </FormField>
        <FormField label="What happens after" reason={errors.storyAfter}>
          <Input accessibilityLabel="What happens after" placeholder="Optional" multiline maxLength={STORY_MAX} value={draft.storyAfter} onChangeText={(t) => set({ storyAfter: t })} />
        </FormField>

        <Text variant="subhead" accessibilityRole="header">Enemies</Text>
        {draft.enemies.map((e, i) => (
          <EnemyRowFields
            key={e.key}
            index={i}
            total={draft.enemies.length}
            enemy={e}
            errors={errors.enemies[i]}
            onChange={(patch) => setEnemy(i, patch)}
            onMove={(dir) => set({ enemies: moveEnemy(draft.enemies, i, dir) })}
            onRemove={() => set({ enemies: draft.enemies.filter((_, j) => j !== i) })}
          />
        ))}
        {errors.tooManyEnemies ? <Text variant="caption" tone="destructive">{errors.tooManyEnemies}</Text> : null}
        <View>
          <Button variant="outline" accessibilityLabel="Add enemy" onPress={() => set({ enemies: [...draft.enemies, blankEnemy()] })}>
            <Plus size={16} color={THEME_COLORS.accentForeground} />
            <Text>Add enemy</Text>
          </Button>
        </View>
      </SheetBody>
      <Button disabled={busy || !errors.valid} onPress={() => onSubmit(toSaveInput(draft))}>
        <Text>{submitLabel}</Text>
      </Button>
    </>
  )
}
