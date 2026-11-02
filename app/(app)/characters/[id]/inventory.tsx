import { useState } from 'react'
import { View } from 'react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { SectionHeader } from '@/components/game/SectionHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import type { ItemWithContent } from '@/features/characters/characters.api'
import { useCharacter, usePendingItemIds, useRemoveItem, useUpdateItem } from '@/features/characters/characters.queries'
import { AddItemSheet } from '@/features/characters/sheet/AddItemSheet'
import { filterItems, InventoryList, sortItems, type InventorySegment } from '@/features/characters/sheet/InventoryList'
import { SheetHeader } from '@/features/characters/sheet/SheetHeader'
import { ERROR_COPY } from '@/features/errors'
import { useCharacterRouteId } from '@/features/characters/useCharacterRouteId'
import { getSystem } from '@/systems/registry'

const EMPTY_COPY: Record<InventorySegment, string> = {
  all: 'Your pack is empty.',
  equipped: 'Nothing equipped yet.',
  magic: 'No magic items yet.',
}

export default function InventoryTab() {
  // Own param first, global as fallback (see useCharacterRouteId).
  const id = useCharacterRouteId()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const [segment, setSegment] = useState<InventorySegment>('all')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<ItemWithContent | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const onError = (e: unknown) => setSaveError(e instanceof Error ? e.message : ERROR_COPY.save_failed)
  const update = useUpdateItem(id, { onError })
  const remove = useRemoveItem(id, { onError })
  const pendingIds = usePendingItemIds(id)

  if (isLoading) {
    return (
      <ScreenBackground>
        <SheetHeader />
        <View className="gap-2" accessibilityLabel="Loading inventory">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3">
              <View className="h-4 w-1/2 rounded-sm bg-muted" />
              <View className="h-4 w-1/3 rounded-sm bg-muted" />
            </Card>
          ))}
        </View>
      </ScreenBackground>
    )
  }

  if (isError || !character) {
    return (
      <ScreenBackground>
        <SheetHeader />
        <View className="items-start gap-2">
          <Text variant="caption" tone="destructive">Couldn’t load this character. Check your connection.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      </ScreenBackground>
    )
  }

  const system = getSystem(character.system_id)
  const shown = filterItems(sortItems(character.items), segment)

  const openAdd = () => { setSaveError(null); setAdding(true) }

  return (
    <ScreenBackground scroll>
      <SheetHeader name={character.name} eyebrow="Inventory" />
      {saveError ? <Text variant="caption" tone="destructive">{saveError}</Text> : null}
      <SectionHeader
        id="inventory"
        title="Items"
        action={character.items.length > 0 ? (
          <Button size="sm" onPress={openAdd}>
            <Text>Add item</Text>
          </Button>
        ) : undefined}
      />
      {character.items.length > 0 ? (
        <Tabs value={segment} onValueChange={(v) => setSegment(v as InventorySegment)}>
          <TabsList>
            <TabsTrigger value="all" accessibilityLabel="All"><Text>All</Text></TabsTrigger>
            <TabsTrigger value="equipped" accessibilityLabel="Equipped"><Text>Equipped</Text></TabsTrigger>
            <TabsTrigger value="magic" accessibilityLabel="Magic"><Text>Magic</Text></TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {character.items.length === 0 ? (
        <View className="items-start gap-3">
          <Text variant="body-sm" tone="muted">{EMPTY_COPY.all}</Text>
          <Button onPress={openAdd}>
            <Text>Add item</Text>
          </Button>
        </View>
      ) : shown.length === 0 ? (
        <Text variant="body-sm" tone="muted">{EMPTY_COPY[segment]}</Text>
      ) : (
        <InventoryList
          items={shown}
          allItems={character.items}
          maxAttuned={system.rules.maxAttuned}
          pendingIds={pendingIds}
          onChange={(itemId, patch) => { setSaveError(null); update.mutate({ itemId, patch }) }}
          onRemove={setRemoving}
        />
      )}
      <AddItemSheet open={adding} onOpenChange={setAdding} characterId={character.id} systemId={character.system_id} />
      <Dialog open={removing !== null} onOpenChange={(o) => { if (!o) setRemoving(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove item?</DialogTitle>
            <DialogDescription>{`${removing?.content?.name ?? 'This item'} will be removed from your inventory.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setRemoving(null)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                if (removing) { setSaveError(null); remove.mutate(removing.id) }
                setRemoving(null)
              }}
            >
              <Text>Remove</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScreenBackground>
  )
}
