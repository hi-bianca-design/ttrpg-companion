import { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { searchIndex, type SearchResult } from './search'

const KIND_LABELS: Record<string, string> = {
  spell: 'Spells',
  magic_item: 'Magic items',
  item: 'Items',
  feat: 'Feats',
  class: 'Classes',
  species: 'Species',
  background: 'Backgrounds',
  subclass: 'Subclasses',
  encounter: 'Encounters',
}
/** The side panel's width and its result list's height cap, in points (the spacing scale has no step this large). */
const PANEL_WIDTH = 384
const LIST_MAX_HEIGHT = 384
const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind

type FocusableLike = { focus?: () => void }
type KeyListener = (e: { key: string }) => void
type DocLike = { activeElement?: FocusableLike | null; addEventListener: (t: string, l: KeyListener) => void; removeEventListener: (t: string, l: KeyListener) => void }
const webDocument = (): DocLike | null => (Platform.OS === 'web' && typeof document !== 'undefined' ? (document as unknown as DocLike) : null)

/**
 * The GM's search, beside the cards (or over them on a narrow window: `overlay`). Results are grouped by
 * kind; picking one shows its description in the panel while the cards stay put. Escape closes, and on
 * web focus goes back to whatever had it before the panel opened.
 */
export function SearchPanel({ open, onClose, items, onPick, overlay = false }: {
  open: boolean
  onClose: () => void
  items: SearchResult[]
  onPick?: (r: SearchResult) => void
  overlay?: boolean
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<SearchResult | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Remember the focused element on open and give it back on close. On native there is nothing to restore.
  useEffect(() => {
    if (!open) return
    const doc = webDocument()
    const previous = doc?.activeElement ?? null
    return () => previous?.focus?.()
  }, [open])

  // On web Escape works wherever focus sits in the panel; native keyboards use the input's onKeyPress.
  useEffect(() => {
    const doc = webDocument()
    if (!open || !doc) return
    const onKey: KeyListener = (e) => { if (e.key === 'Escape') onCloseRef.current() }
    doc.addEventListener('keydown', onKey)
    return () => doc.removeEventListener('keydown', onKey)
  }, [open])

  const groups = useMemo(() => {
    const by = new Map<string, SearchResult[]>()
    for (const r of searchIndex(items, query)) by.set(r.kind, [...(by.get(r.kind) ?? []), r])
    return [...by.entries()]
  }, [items, query])

  if (!open) return null

  return (
    <View
      testID="search-panel"
      className={overlay ? 'absolute inset-0 z-10 gap-3 bg-background p-4' : 'gap-3'}
      style={overlay ? undefined : { width: PANEL_WIDTH }}
    >
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            accessibilityLabel="Search"
            placeholder="Search spells, items, encounters"
            value={query}
            onChangeText={(t: string) => { setQuery(t); setPicked(null) }}
            autoFocus
            onKeyPress={Platform.OS === 'web' ? undefined : (e: { nativeEvent: { key: string } }) => { if (e.nativeEvent.key === 'Escape') onClose() }}
          />
        </View>
        <Button variant="ghost" accessibilityLabel="Close search" onPress={onClose}>
          <Text>Close</Text>
        </Button>
      </View>

      {picked ? (
        <View testID="search-detail" className="gap-2">
          <Text variant="subhead">{picked.name}</Text>
          <Text variant="body-sm" tone="muted">{picked.summary ?? 'No description.'}</Text>
        </View>
      ) : null}

      <ScrollView style={{ maxHeight: LIST_MAX_HEIGHT }} keyboardShouldPersistTaps="handled">
        {groups.length === 0 && query.trim() ? <Text variant="body-sm" tone="muted">No matches</Text> : null}
        {groups.map(([kind, results]) => (
          <View key={kind} className="gap-1 pb-3">
            <Text variant="label" accessibilityRole="header">{kindLabel(kind)}</Text>
            {results.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={r.name}
                className="min-h-11 justify-center"
                onPress={() => { setPicked(r); onPick?.(r) }}
              >
                <Text variant="body-sm">{r.name}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
