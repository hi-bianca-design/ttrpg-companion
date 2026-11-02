import { Minus, Plus } from 'phosphor-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { ContentCard } from '@/components/game/ContentCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { useCharacterCampaign } from '@/features/campaigns/campaigns.queries'
import { useContentSearch } from '@/features/content/content.queries'
import type { ContentScope } from '@/lib/query-client'
import { THEME_COLORS } from '@/lib/theme'
import type { SystemId } from '@/systems/types'
import { useAddItem } from '../characters.queries'
import { MAX_QUANTITY } from './InventoryList'

const ITEM_KINDS = ['item', 'magic_item']

type SourceKey = 'srd' | 'mine' | 'campaign'

type AddItemSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  characterId: string
  systemId: SystemId
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

/** Search the system's items (SRD, own homebrew, campaign) and add one with a quantity. */
export function AddItemSheet({ open, onOpenChange, characterId, systemId }: AddItemSheetProps) {
  const iconColor = THEME_COLORS.accentForeground
  const { data: campaign } = useCharacterCampaign(characterId)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<SourceKey>('srd')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const scope: ContentScope = source === 'srd' ? 'official' : source === 'mine' ? 'mine' : { campaignId: campaign?.id ?? '' }
  const results = useContentSearch(systemId, ITEM_KINDS, scope, search)
  const add = useAddItem(characterId)

  useEffect(() => {
    if (open) { add.reset(); setSearch(''); setSource('srd'); setSelectedId(null); setQuantity(1) }
  }, [open])
  useEffect(() => {
    if (source === 'campaign' && !campaign) setSource('srd')
  }, [source, campaign])

  const selected = results.data.find((r) => r.id === selectedId)

  const sources: Array<{ key: SourceKey; label: string }> = [
    { key: 'srd', label: 'SRD' },
    { key: 'mine', label: 'My homebrew' },
    ...(campaign ? [{ key: 'campaign' as const, label: campaign.name }] : []),
  ]

  const confirm = () => {
    if (!selected) return
    const name = selected.name
    add.mutate({ contentId: selected.id, quantity }, {
      onSuccess: () => {
        showToast(quantity > 1 ? `Added ${name} ×${quantity}.` : `Added ${name}.`)
        onOpenChange(false)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add item</SheetTitle>
        </SheetHeader>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search items"
          accessibilityLabel="Search items"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View className="flex-row flex-wrap gap-2">
          {sources.map((s) => (
            <ToggleChip
              key={s.key}
              label={s.label}
              selected={source === s.key}
              onPress={() => { setSource(s.key); setSelectedId(null) }}
            />
          ))}
        </View>
        <SheetBody>
          {results.isError ? (
            <View className="items-start gap-2">
              <Text variant="caption" tone="destructive">Couldn’t load items. Check your connection.</Text>
              <Button variant="outline" size="sm" onPress={() => results.refetch()}>
                <Text>Try again</Text>
              </Button>
            </View>
          ) : results.isLoading ? (
            <View accessibilityLabel="Loading items" className="gap-2">
              {[0, 1, 2].map((i) => <View key={i} className="h-11 w-full rounded-card bg-muted" />)}
            </View>
          ) : results.data.length === 0 ? (
            <Text variant="body-sm" tone="muted">No items match your search.</Text>
          ) : (
            results.data.map((row) => {
              const data = asRecord(row.data)
              const meta = [data.category, data.item_type, data.rarity].filter((x): x is string => typeof x === 'string').join(' · ')
              return (
                <ContentCard
                  key={row.id}
                  title={row.name}
                  meta={meta || undefined}
                  tags={row.id === selectedId ? ['Selected'] : undefined}
                  onPress={() => setSelectedId(row.id)}
                />
              )
            })
          )}
        </SheetBody>
        <View className="flex-row items-center justify-center gap-4">
          <Button
            size="icon"
            variant="outline"
            accessibilityLabel="Decrease quantity"
            disabled={quantity <= 1}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus size={16} color={iconColor} />
          </Button>
          <Text variant="stat" accessibilityLabel="Quantity">{String(quantity)}</Text>
          <Button
            size="icon"
            variant="outline"
            accessibilityLabel="Increase quantity"
            disabled={quantity >= MAX_QUANTITY}
            onPress={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          >
            <Plus size={16} color={iconColor} />
          </Button>
        </View>
        {add.isError ? (
          <Text variant="caption" tone="destructive">
            {add.error instanceof Error ? add.error.message : 'Couldn’t add the item. Try again.'}
          </Text>
        ) : null}
        <Button disabled={!selected || add.isPending} onPress={confirm}>
          <Text variant="subhead" className="text-primary-foreground">Add to inventory</Text>
        </Button>
      </SheetContent>
    </Sheet>
  )
}
