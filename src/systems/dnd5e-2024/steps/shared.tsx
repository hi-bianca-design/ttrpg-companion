// Building blocks shared by the D&D builder steps: content loading, intro text,
// selectable cards and chips, loading/error states.
import { useColorScheme } from 'nativewind'
import { CheckCircle } from 'phosphor-react-native'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { useContentList } from '@/features/content/content.queries'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { dnd5eContentSchemas } from '../schemas'

export function useThemeColors() {
  const { colorScheme } = useColorScheme()
  return THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
}

type Kind = keyof typeof dnd5eContentSchemas
export type ContentItem<K extends Kind> = {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  owned: boolean
  data: z.infer<(typeof dnd5eContentSchemas)[K]>
}

/** D&D content of one kind with `data` parsed by its schema; rows that don't validate are dropped. */
export function useDndContent<K extends Kind>(kind: K) {
  const query = useContentList('dnd5e-2024', kind)
  const items = useMemo(() => (query.data ?? []).flatMap((row): ContentItem<K>[] => {
    const parsed = dnd5eContentSchemas[kind].safeParse(row.data)
    if (!parsed.success) return []
    return [{
      id: row.id, name: row.name, description: row.description, parent_id: row.parent_id,
      owned: row.owner_id !== null, data: parsed.data as ContentItem<K>['data'],
    }]
  }), [query.data, kind])
  return { items, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}

export function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <View className="gap-1">
      <Text variant="title">{title}</Text>
      <Text variant="body-sm" tone="muted">{description}</Text>
    </View>
  )
}

/** Skeleton cards while loading, a message plus "Try again" on error; null once loaded. */
export function QueryState({ isLoading, isError, onRetry }: { isLoading: boolean; isError: boolean; onRetry: () => void }) {
  if (isLoading) {
    return (
      <View className="gap-2" accessibilityLabel="Loading">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="gap-2">
            <View className="h-4 w-1/2 rounded-full bg-muted" />
            <View className="h-3 w-3/4 rounded-full bg-muted" />
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

/** A selectable card: border-primary and a check when selected; dimmed and inert when disabled. */
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
      <Card compact className={cn('gap-2', selected && 'border-primary', disabled && 'opacity-50')}>
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
  className?: string
}

/** Builder steps' selectable pill: the shared ToggleChip. */
export function Chip(props: ChipProps) {
  return <ToggleChip {...props} />
}
