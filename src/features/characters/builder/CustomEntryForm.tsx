// A system-agnostic form for making your own class, species or background. Everything it needs
// (the extra fields, the official names to warn about) arrives by props. All state is local and the
// parent receives exactly one onSubmit per save, never per keystroke: a new custom class object in
// the wizard draft counts as a class change and wipes class skills and choices.
import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import type { FieldDef } from '@/systems/types'

export type CustomEntryValue = {
  name: string
  description: string
  library: boolean
  extras: Record<string, unknown>
}

type CustomEntryFormProps = {
  kindLabel: string
  fields: FieldDef[]
  initial?: CustomEntryValue
  officialNames: string[]
  onSubmit(entry: CustomEntryValue): void
  onCancel(): void
}

const MAX_NAME = 80

// Same trimmed, case-insensitive comparison as collidesWithOfficial in the dnd5e-2024 system. It is
// duplicated here on purpose so this component stays system-agnostic.
const collides = (name: string, officialNames: string[]) => {
  const n = name.trim().toLowerCase()
  return n !== '' && officialNames.some((o) => o.trim().toLowerCase() === n)
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Editing state per field: text/number as a string, boolean as boolean, select as string, multiselect as string[]. */
function initialState(fields: FieldDef[], extras: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const v = extras[f.key]
    if (f.type === 'boolean') out[f.key] = v === true
    else if (f.type === 'multiselect') out[f.key] = asStrings(v)
    else if (f.type === 'number') out[f.key] = typeof v === 'number' ? String(v) : ''
    else out[f.key] = typeof v === 'string' ? v : ''
  }
  return out
}

/** Only the fields the user filled; numbers as numbers. */
function toExtras(fields: FieldDef[], state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const v = state[f.key]
    if (f.type === 'boolean') {
      if (v === true) out[f.key] = true
    } else if (f.type === 'multiselect') {
      if (Array.isArray(v) && v.length > 0) out[f.key] = v
    } else if (f.type === 'number') {
      if (typeof v === 'string' && v !== '') out[f.key] = Number(v)
    } else if (typeof v === 'string' && v.trim() !== '') {
      out[f.key] = v
    }
  }
  return out
}

export function CustomEntryForm({ kindLabel, fields, initial, officialNames, onSubmit, onCancel }: CustomEntryFormProps) {
  const kind = kindLabel.toLowerCase()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [library, setLibrary] = useState(initial?.library ?? false)
  const [state, setState] = useState(() => initialState(fields, initial?.extras ?? {}))

  const set = (key: string, value: unknown) => setState((s) => ({ ...s, [key]: value }))
  const canSave = name.trim() !== ''

  const submit = () => {
    if (!canSave) return
    onSubmit({ name: name.trim(), description, library, extras: toExtras(fields, state) })
  }

  const control = (f: FieldDef) => {
    const v = state[f.key]
    if (f.type === 'boolean') {
      return <ToggleChip label={f.label} selected={v === true} onPress={() => set(f.key, v !== true)} />
    }
    if (f.type === 'select' || f.type === 'multiselect') {
      const picked = f.type === 'multiselect' ? (v as string[]) : v === '' ? [] : [v as string]
      return (
        <View className="flex-row flex-wrap gap-2">
          {(f.options ?? []).map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              selected={picked.includes(opt)}
              onPress={() => {
                if (f.type === 'multiselect') set(f.key, picked.includes(opt) ? picked.filter((p) => p !== opt) : [...picked, opt])
                else set(f.key, picked.includes(opt) ? '' : opt)
              }}
            />
          ))}
        </View>
      )
    }
    if (f.type === 'number') {
      return (
        <Input
          accessibilityLabel={f.label}
          keyboardType="number-pad"
          value={v as string}
          onChangeText={(t) => set(f.key, t.replace(/\D/g, ''))}
        />
      )
    }
    return (
      <Input
        accessibilityLabel={f.label}
        multiline={f.type === 'longtext'}
        value={v as string}
        onChangeText={(t) => set(f.key, t)}
      />
    )
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text variant="caption" tone="muted">Name</Text>
        <Input
          accessibilityLabel={`${kindLabel} name`}
          value={name}
          maxLength={MAX_NAME}
          onChangeText={(t) => setName(t.slice(0, MAX_NAME))}
          autoCapitalize="words"
        />
        {collides(name, officialNames) ? (
          <Text variant="caption" tone="muted">{`An official ${kind} has this name; picking it applies that ${kind}'s rules.`}</Text>
        ) : null}
      </View>
      <View className="gap-2">
        <Text variant="caption" tone="muted">Description</Text>
        <Input accessibilityLabel={`${kindLabel} description`} multiline value={description} onChangeText={setDescription} />
      </View>
      {fields.map((f) => (
        <View key={f.key} className="gap-2">
          {f.type === 'boolean' ? null : <Text variant="caption" tone="muted">{f.label}</Text>}
          {control(f)}
        </View>
      ))}
      <View className="flex-row">
        <ToggleChip label="Add to my homebrew library" selected={library} onPress={() => setLibrary((l) => !l)} />
      </View>
      <View className="flex-row gap-3">
        <Button accessibilityLabel={`Save ${kind}`} disabled={!canSave} onPress={submit}>
          <Text>Save</Text>
        </Button>
        <Button variant="outline" accessibilityLabel="Cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </View>
  )
}
