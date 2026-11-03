// Building blocks shared by the D&D builder steps: content loading, intro text,
// selectable cards and chips, loading/error states.
import { CheckCircle } from 'phosphor-react-native'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import type { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { CustomEntryForm } from '@/features/characters/builder/CustomEntryForm'
import { useContentList, useCurrentUserId } from '@/features/content/content.queries'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { customExtraFields, type CustomEntry, type CustomKind } from '../customEntries'
import { dnd5eContentSchemas } from '../schemas'

export function useThemeColors() {
  return THEME_COLORS
}

type Kind = keyof typeof dnd5eContentSchemas
export type ContentItem<K extends Kind> = {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  owned: boolean
  /** Official (SRD) content: no owner. Campaign rows other members own and the user's own rows are not. */
  official: boolean
  data: z.infer<(typeof dnd5eContentSchemas)[K]>
}

/**
 * D&D content of one kind the user may pick (official, own, their campaigns'), with `data` parsed by
 * its schema; rows that don't validate are dropped. `owned` = the user's own homebrew; `official` = no owner.
 */
export function useDndContent<K extends Kind>(kind: K) {
  const query = useContentList('dnd5e-2024', kind, 'pickable')
  const uid = useCurrentUserId()
  const items = useMemo(() => (query.data ?? []).flatMap((row): ContentItem<K>[] => {
    const parsed = dnd5eContentSchemas[kind].safeParse(row.data)
    if (!parsed.success) return []
    return [{
      id: row.id, name: row.name, description: row.description, parent_id: row.parent_id,
      owned: uid !== undefined && row.owner_id === uid, official: row.owner_id == null, data: parsed.data as ContentItem<K>['data'],
    }]
  }), [query.data, kind, uid])
  return { items, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}

export { StepIntro } from '@/features/characters/builder/StepIntro'

/** Skeleton cards while loading, a message plus "Try again" on error; null once loaded. */
export function QueryState({ isLoading, isError, onRetry }: { isLoading: boolean; isError: boolean; onRetry: () => void }) {
  if (isLoading) {
    return (
      <View className="gap-2" accessibilityLabel="Loading">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="gap-2">
            <View className="h-4 w-1/2 rounded-sm bg-muted" />
            <View className="h-3 w-3/4 rounded-sm bg-muted" />
          </Card>
        ))}
      </View>
    )
  }
  if (isError) {
    return (
      <View className="items-start gap-2">
        <Text variant="caption" tone="destructive">Couldn’t load this list. Check your connection.</Text>
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }
  return null
}

type ChoiceCardProps = {
  title: string
  selected: boolean
  disabled?: boolean
  onPress: () => void
  accessibilityLabel?: string
  aside?: ReactNode
  children?: ReactNode
}

/** A selectable card: a gold edge and a check when selected; dimmed and inert when disabled. */
export function ChoiceCard({ title, selected, disabled = false, onPress, accessibilityLabel, aside, children }: ChoiceCardProps) {
  const colors = useThemeColors()
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Card compact tone={selected ? 'selected' : 'default'} className={cn('gap-2', disabled && 'opacity-50')}>
        <View className="flex-row items-center gap-2">
          <Text variant="subhead" className="flex-shrink">{title}</Text>
          {aside}
          <View className="flex-1" />
          {selected ? <CheckCircle size={20} weight="fill" color={colors.primary} /> : null}
        </View>
        {children}
      </Card>
    </Pressable>
  )
}

type ChipProps = {
  label: string
  selected?: boolean
  disabled?: boolean
  onPress: () => void
  accessibilityLabel?: string
  accessibilityHint?: string
  size?: 'default' | 'sm' | 'square'
  className?: string
}

/** Builder steps' selectable pill: the shared ToggleChip. */
export function Chip(props: ChipProps) {
  return <ToggleChip {...props} />
}

type CustomChoiceProps = {
  kind: CustomKind
  kindLabel: string
  /** The pending custom entry from the draft, or null. */
  entry: CustomEntry | null
  /** Names of the official (ownerless) items in the list, for the form's warning. */
  officialNames: string[]
  onSave(entry: CustomEntry): void
  onRemove(): void
}

/**
 * The end of a pick list: a "Make your own" card that opens the custom entry form inline, or the
 * pending custom entry as a selected card with Edit and Remove. The form keeps its own state and
 * calls `onSave` once per Save, never per keystroke.
 */
const sortedJson = (v: unknown): string => JSON.stringify(v, (_k, val: unknown) =>
  val && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : val)

/** Same name, description, library flag and extras (key order ignored). */
function sameEntry(a: CustomEntry, b: CustomEntry): boolean {
  return a.name === b.name && a.description === b.description && a.library === b.library && sortedJson(a.extras) === sortedJson(b.extras)
}

export function CustomChoice({ kind, kindLabel, entry, officialNames, onSave, onRemove }: CustomChoiceProps) {
  const [open, setOpen] = useState(false)
  // Bumped on every open so the form (which reads `initial` once) remounts with fresh state.
  const [opened, setOpened] = useState(0)
  const show = () => { setOpened((n) => n + 1); setOpen(true) }

  if (open) {
    return (
      <Card className="gap-3">
        <Text variant="subhead">{entry ? `Edit your ${kind}` : `Make your own ${kind}`}</Text>
        {entry && kind === 'class' ? (
          <Text variant="caption" tone="muted">Saving changes resets your skill picks and class choices.</Text>
        ) : null}
        <CustomEntryForm
          key={`${kind}-${entry ? 'edit' : 'new'}-${opened}`}
          kindLabel={kindLabel}
          fields={customExtraFields(kind)}
          initial={entry ?? undefined}
          officialNames={officialNames}
          onSubmit={(e) => {
            setOpen(false)
            // An unchanged save is a no-op: a new class_custom object would count as a class change and wipe picks.
            if (!entry || !sameEntry(entry, e)) onSave(e)
          }}
          onCancel={() => setOpen(false)}
        />
      </Card>
    )
  }

  if (entry) {
    // Edit and Remove sit below the card, not inside it: buttons nested in a pressable card are not
    // reachable by screen readers.
    return (
      <View className="gap-2">
        <ChoiceCard
          title={entry.name}
          accessibilityLabel={`${entry.name}, custom ${kind}`}
          selected
          aside={<Badge>Custom</Badge>}
          onPress={show}
        >
          {entry.description.trim() ? <Text variant="body-sm" tone="muted" numberOfLines={2}>{entry.description.trim()}</Text> : null}
          <Text variant="caption" tone="muted">
            {entry.library ? 'Saved to your homebrew library when you create the character' : 'Only for this character'}
          </Text>
        </ChoiceCard>
        <View className="flex-row gap-2">
          <Button variant="outline" size="sm" accessibilityLabel={`Edit custom ${kind}`} onPress={show}>
            <Text>Edit</Text>
          </Button>
          <Button variant="outline" size="sm" accessibilityLabel={`Remove custom ${kind}`} onPress={onRemove}>
            <Text>Remove</Text>
          </Button>
        </View>
      </View>
    )
  }

  return (
    <ChoiceCard title="Make your own" accessibilityLabel={`Make your own ${kind}`} selected={false} onPress={show}>
      <Text variant="body-sm" tone="muted">{`Describe a ${kind} that isn't in the list.`}</Text>
    </ChoiceCard>
  )
}
