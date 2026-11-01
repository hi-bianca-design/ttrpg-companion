import { Minus, Plus } from 'phosphor-react-native'
import { useColorScheme } from 'nativewind'
import { View } from 'react-native'
import { ContentCard } from '@/components/game/ContentCard'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
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

/** One card per item with quantity stepper, equip / attune toggles and remove. */
export function InventoryList({ items, allItems, maxAttuned, pendingIds = [], onChange, onRemove }: InventoryListProps) {
  const { colorScheme } = useColorScheme()
  const iconColor = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light'].foreground
  const attunedCount = allItems.filter((i) => i.attuned).length
  const atLimit = maxAttuned !== undefined && attunedCount >= maxAttuned

  return (
    <View className="gap-3">
      {atLimit ? (
        <Text variant="caption" tone="muted">
          {`Attunement limit reached (${attunedCount} of ${maxAttuned}). Unattune an item to attune another.`}
        </Text>
      ) : null}
      {items.map((item) => {
        const name = item.content?.name ?? 'Unknown item'
        const attunable = requiresAttunement(item)
        const tags = [
          ...(item.content?.kind === 'magic_item' ? ['Magic'] : []),
          ...(item.equipped ? ['Equipped'] : []),
          ...(item.attuned ? ['Attuned'] : []),
        ]
        const saving = pendingIds.includes(item.id)
        const blocked = !item.attuned && atLimit
        return (
          <View key={item.id} className="gap-2">
            <ContentCard title={name} meta={metaFor(item)} tags={tags} />
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="flex-row items-center gap-2">
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
              <Button
                size="sm"
                variant={item.equipped ? 'primary' : 'outline'}
                accessibilityLabel={`${item.equipped ? 'Unequip' : 'Equip'} ${name}`}
                accessibilityState={{ selected: item.equipped }}
                onPress={() => onChange(item.id, { equipped: !item.equipped })}
              >
                <Text>{item.equipped ? 'Equipped' : 'Equip'}</Text>
              </Button>
              {attunable ? (
                <Button
                  size="sm"
                  variant={item.attuned ? 'primary' : 'outline'}
                  accessibilityLabel={`${item.attuned ? 'Unattune' : 'Attune'} ${name}`}
                  accessibilityState={{ selected: item.attuned, disabled: blocked }}
                  disabled={blocked}
                  onPress={() => onChange(item.id, { attuned: !item.attuned })}
                >
                  <Text>{item.attuned ? 'Attuned' : 'Attune'}</Text>
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" accessibilityLabel={`Remove ${name}`} onPress={() => onRemove(item)}>
                <Text>Remove</Text>
              </Button>
            </View>
          </View>
        )
      })}
    </View>
  )
}
