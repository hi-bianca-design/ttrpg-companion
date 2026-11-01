import { Minus, Plus } from 'phosphor-react-native'
import { useColorScheme } from 'nativewind'
import { View } from 'react-native'
import { ContentCard } from '@/components/game/ContentCard'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { THEME_COLORS } from '@/lib/theme'
import type { ItemPatch, ItemWithContent } from '../characters.api'

export type InventorySegment = 'all' | 'equipped' | 'magic'

export const MAX_QUANTITY = 99

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

export function requiresAttunement(item: ItemWithContent): boolean {
  return asRecord(item.content?.data).requires_attunement === true
}

export function filterItems(items: ItemWithContent[], segment: InventorySegment): ItemWithContent[] {
  if (segment === 'equipped') return items.filter((i) => i.equipped)
  if (segment === 'magic') return items.filter((i) => i.content?.kind === 'magic_item')
  return items
}

/** Stable display order: when the item was added, then name. Equipping or attuning never moves a row. */
export function sortItems(items: ItemWithContent[]): ItemWithContent[] {
  return [...items].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? '') ||
    (a.content?.name ?? '').localeCompare(b.content?.name ?? '') ||
    a.id.localeCompare(b.id))
}

function metaFor(item: ItemWithContent): string | undefined {
  const data = asRecord(item.content?.data)
  const parts = [data.category, data.item_type, data.rarity].filter((x): x is string => typeof x === 'string')
  return parts.join(' · ') || undefined
}

type InventoryListProps = {
  items: ItemWithContent[]
  /** Every item the character owns (the attunement count ignores the active filter). */
  allItems: ItemWithContent[]
  /** Attunement cap from the system; undefined = no limit. */
  maxAttuned?: number
  /** Items whose update is in flight; their quantity stepper is blocked so taps can't overwrite each other. */
  pendingIds?: string[]
  onChange: (itemId: string, patch: ItemPatch) => void
  onRemove: (item: ItemWithContent) => void
}

/** One card per item; its quantity stepper, equip / attune toggles, remove and any helper caption sit inside the card. */
export function InventoryList({ items, allItems, maxAttuned, pendingIds = [], onChange, onRemove }: InventoryListProps) {
  const { colorScheme } = useColorScheme()
  const iconColor = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light'].accentForeground
  const attunedCount = allItems.filter((i) => i.attuned).length
  const atLimit = maxAttuned !== undefined && attunedCount >= maxAttuned

  return (
    <View className="gap-2">
      {items.map((item) => {
        const name = item.content?.name ?? 'Unknown item'
        const attunable = requiresAttunement(item)
        // Equipped / attuned state is shown by the toggles themselves, not repeated as tags.
        const tags = item.content?.kind === 'magic_item' ? ['Magic'] : undefined
        const saving = pendingIds.includes(item.id)
        const blocked = attunable && !item.attuned && atLimit
        const footer = (
          <View className="gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="flex-row items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel={`Decrease ${name} quantity`}
                  disabled={saving || item.quantity <= 1}
                  onPress={() => onChange(item.id, { quantity: item.quantity - 1 })}
                >
                  <Minus size={16} color={iconColor} />
                </Button>
                <Text variant="subhead" accessibilityLabel={`${name} quantity`}>{String(item.quantity)}</Text>
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel={`Increase ${name} quantity`}
                  disabled={saving || item.quantity >= MAX_QUANTITY}
                  onPress={() => onChange(item.id, { quantity: item.quantity + 1 })}
                >
                  <Plus size={16} color={iconColor} />
                </Button>
              </View>
              <ToggleChip
                size="sm"
                tone="outline"
                label={item.equipped ? 'Equipped' : 'Equip'}
                selected={item.equipped}
                accessibilityLabel={`${item.equipped ? 'Unequip' : 'Equip'} ${name}`}
                onPress={() => onChange(item.id, { equipped: !item.equipped })}
              />
              {attunable ? (
                <ToggleChip
                  size="sm"
                  tone="outline"
                  label={item.attuned ? 'Attuned' : 'Attune'}
                  selected={item.attuned}
                  disabled={blocked}
                  accessibilityLabel={`${item.attuned ? 'Unattune' : 'Attune'} ${name}`}
                  onPress={() => onChange(item.id, { attuned: !item.attuned })}
                />
              ) : null}
              {/* ml-auto keeps it right-aligned and still lets the row wrap when the toggles fill it. */}
              <Button size="sm" variant="ghost" className="ml-auto" accessibilityLabel={`Remove ${name}`} onPress={() => onRemove(item)}>
                <Text className="text-destructive">Remove</Text>
              </Button>
            </View>
            {blocked ? (
              <Text variant="caption" tone="muted">
                {`Attunement limit reached (${attunedCount} of ${maxAttuned}). Unattune an item to attune another.`}
              </Text>
            ) : null}
          </View>
        )
        return <ContentCard key={item.id} title={name} meta={metaFor(item)} tags={tags} footer={footer} />
      })}
    </View>
  )
}
