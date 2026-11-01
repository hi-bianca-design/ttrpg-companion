import { useState } from 'react'
import { Switch, View } from 'react-native'
import { useColorScheme } from 'nativewind'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { AppError } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'
import { getSystem } from '@/systems/registry'
import type { FieldDef, SystemId } from '@/systems/types'
import type { ContentRow } from './content.api'
import { useContentList, useDeleteHomebrew, useSaveHomebrew } from './content.queries'

type Values = Record<string, unknown>
type Errors = Record<string, string>

const NAME_KEY = 'name'
const DESCRIPTION_KEY = 'description'
const PARENT_KEY = 'parent_id'

/** "sleight-of-hand" → "Sleight of hand"; plain labels pass through. */
function optionLabel(option: string): string {
  const spaced = option.replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const isNumeric = (s: string) => s !== '' && !Number.isNaN(Number(s))
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/** Builds the kind's `data` from the form values: numbers parsed, blanks omitted, booleans always present. */
function toData(fields: FieldDef[], values: Values): Values {
  const data: Values = {}
  for (const f of fields) {
    const v = values[f.key]
    if (f.type === 'boolean') { data[f.key] = v === true; continue }
    if (isEmpty(v)) continue
    if (f.type === 'number') data[f.key] = Number(v)
    else if (f.type === 'select' && f.options?.every(isNumeric)) data[f.key] = Number(v)
    else data[f.key] = v
  }
  return data
}

function toValues(fields: FieldDef[], initial?: ContentRow): Values {
  const data = (initial?.data ?? {}) as Values
  const values: Values = {
    [NAME_KEY]: initial?.name ?? '',
    [DESCRIPTION_KEY]: initial?.description ?? '',
    [PARENT_KEY]: initial?.parent_id ?? null,
  }
  for (const f of fields) {
    const v = data[f.key]
    values[f.key] = f.type === 'number' || (f.type === 'select' && v !== undefined) ? (v === undefined || v === null ? '' : String(v)) : v
  }
  return values
}

function Chip({ label, group, selected, onPress }: { label: string; group: string; selected: boolean; onPress: () => void }) {
  return (
    <Button
      size="sm"
      variant={selected ? 'primary' : 'outline'}
      accessibilityLabel={`${group} ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
    >
      <Text>{label}</Text>
    </Button>
  )
}

function FieldBlock({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text variant="label">{label}</Text>
      {children}
      {error ? <Text variant="caption" tone="destructive">{error}</Text> : null}
    </View>
  )
}

type ContentFormProps = {
  systemId: SystemId
  kind: string
  initial?: ContentRow
  onSaved: (row: ContentRow) => void
  onDeleted?: () => void
}

export function ContentForm({ systemId, kind, initial, onSaved, onDeleted }: ContentFormProps) {
  const def = getSystem(systemId).contentKinds[kind]
  const [values, setValues] = useState<Values>(() => toValues(def.fields, initial))
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const save = useSaveHomebrew()
  const remove = useDeleteHomebrew()
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']

  const parentDef = def.parentKind ? getSystem(systemId).contentKinds[def.parentKind] : undefined
  const parents = useContentList(systemId, def.parentKind ?? '', 'all', !!def.parentKind)

  const set = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => { const { [key]: _drop, ...rest } = e; return rest })
  }

  const validate = (): { errors: Errors; data: Values } => {
    const found: Errors = {}
    const name = String(values[NAME_KEY] ?? '').trim()
    if (!name) found[NAME_KEY] = 'Name is required'
    if (parentDef && !values[PARENT_KEY]) found[PARENT_KEY] = `${parentDef.label} is required`
    for (const f of def.fields) {
      if (f.required && f.type !== 'boolean' && isEmpty(values[f.key])) found[f.key] = `${f.label} is required`
    }
    const data = toData(def.fields, values)
    if (Object.keys(found).length === 0) {
      const parsed = def.schema.safeParse(data)
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '')
          const label = def.fields.find((f) => f.key === key)?.label
          if (label && !found[key]) found[key] = `${label} is invalid`
          else if (!label && !found[NAME_KEY]) setFormError(issue.message)
        }
      }
    }
    return { errors: found, data }
  }

  const submit = () => {
    setFormError(null)
    const { errors: found, data } = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate(
      {
        id: initial?.id,
        systemId,
        kind,
        name: String(values[NAME_KEY]).trim(),
        description: String(values[DESCRIPTION_KEY] ?? '').trim() || undefined,
        data,
        parentId: (values[PARENT_KEY] as string | null) ?? undefined,
      },
      {
        onSuccess: (row) => onSaved(row),
        onError: (e) => {
          if (e instanceof AppError && e.code === 'duplicate') {
            setErrors({ [NAME_KEY]: `You already have a ${def.label.toLowerCase()} with this name.` })
          } else {
            setFormError(e instanceof Error ? e.message : 'Couldn’t save. Try again.')
          }
        },
      },
    )
  }

  const confirmDelete = () => {
    if (!initial) return
    setConfirmingDelete(false)
    remove.mutate(initial.id, {
      onSuccess: () => onDeleted?.(),
      onError: (e) => setFormError(e instanceof Error ? e.message : 'Couldn’t delete. Try again.'),
    })
  }

  const renderField = (f: FieldDef) => {
    const value = values[f.key]
    switch (f.type) {
      case 'text':
      case 'number':
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChangeText={(t) => set(f.key, t)}
            accessibilityLabel={f.label}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
          />
        )
      case 'longtext':
        return (
          <Input
            multiline
            className="h-auto min-h-11 rounded-card py-3"
            numberOfLines={4}
            textAlignVertical="top"
            value={typeof value === 'string' ? value : ''}
            onChangeText={(t) => set(f.key, t)}
            accessibilityLabel={f.label}
          />
        )
      case 'boolean':
        return (
          <View className="flex-row items-center justify-between">
            <Text variant="body">{f.label}</Text>
            <Switch
              value={value === true}
              onValueChange={(v) => set(f.key, v)}
              accessibilityLabel={f.label}
              trackColor={{ true: colors.primary, false: colors.muted }}
            />
          </View>
        )
      case 'select':
        return (
          <View className="flex-row flex-wrap gap-2">
            {(f.options ?? []).map((o) => (
              <Chip key={o} group={f.label} label={optionLabel(o)} selected={value === o} onPress={() => set(f.key, o)} />
            ))}
          </View>
        )
      case 'multiselect': {
        const chosen = Array.isArray(value) ? (value as string[]) : []
        return (
          <View className="flex-row flex-wrap gap-2">
            {(f.options ?? []).map((o) => (
              <Chip
                key={o}
                group={f.label}
                label={optionLabel(o)}
                selected={chosen.includes(o)}
                onPress={() => set(f.key, chosen.includes(o) ? chosen.filter((c) => c !== o) : [...chosen, o])}
              />
            ))}
          </View>
        )
      }
    }
  }

  return (
    <View className="gap-4">
      <FieldBlock label="Name" error={errors[NAME_KEY]}>
        <Input value={String(values[NAME_KEY] ?? '')} onChangeText={(t) => set(NAME_KEY, t)} accessibilityLabel="Name" />
      </FieldBlock>

      {parentDef ? (
        <FieldBlock label={parentDef.label} error={errors[PARENT_KEY]}>
          {parents.isError ? (
            <View className="items-start gap-2">
              <Text variant="caption" tone="destructive">{`Couldn’t load ${parentDef.plural.toLowerCase()}. Check your connection.`}</Text>
              <Button variant="outline" size="sm" onPress={() => parents.refetch()}>
                <Text>Try again</Text>
              </Button>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {(parents.data ?? []).map((p) => (
                <Chip key={p.id} group={parentDef.label} label={p.name} selected={values[PARENT_KEY] === p.id} onPress={() => set(PARENT_KEY, p.id)} />
              ))}
            </View>
          )}
        </FieldBlock>
      ) : null}

      {def.fields.map((f) =>
        f.type === 'boolean' ? (
          <View key={f.key}>{renderField(f)}</View>
        ) : (
          <FieldBlock key={f.key} label={f.label} error={errors[f.key]}>{renderField(f)}</FieldBlock>
        ),
      )}

      <FieldBlock label="Description">
        <Input
          multiline
          className="h-auto min-h-11 rounded-card py-3"
            numberOfLines={4}
          textAlignVertical="top"
          value={String(values[DESCRIPTION_KEY] ?? '')}
          onChangeText={(t) => set(DESCRIPTION_KEY, t)}
          accessibilityLabel="Description"
        />
      </FieldBlock>

      {formError ? <Text variant="caption" tone="destructive">{formError}</Text> : null}

      <View className="gap-2">
        <Button variant="primary" disabled={save.isPending} accessibilityLabel="Save" onPress={submit}>
          <Text>{save.isPending ? 'Saving…' : 'Save'}</Text>
        </Button>
        {initial ? (
          <Button variant="destructive" accessibilityLabel="Delete" onPress={() => setConfirmingDelete(true)}>
            <Text>Delete</Text>
          </Button>
        ) : null}
      </View>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Delete ${initial?.name ?? 'this'}?`}</DialogTitle>
            <DialogDescription>It’s removed from your homebrew and can’t be picked for new characters. This can’t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" accessibilityLabel="Cancel" onPress={() => setConfirmingDelete(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button variant="destructive" size="sm" accessibilityLabel="Delete" onPress={confirmDelete}>
              <Text>Delete</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
