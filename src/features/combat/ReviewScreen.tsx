import { useEffect, useMemo, useRef, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { ArrowDown, ArrowUp, DotsSixVertical } from 'phosphor-react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { showToast } from '@/components/ui/toast'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import type { CharacterFull } from '@/features/characters/characters.api'
import type { Encounter } from '@/features/encounters/encounters.api'
import { useEncounters } from '@/features/encounters/encounters.queries'
import { ERROR_COPY } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'
import { reorderTarget } from './battleOrder'
import { useStartPreparedCombat } from './combat.queries'
import { EncounterPicker } from './EncounterPicker'
import { buildDraft, launchInput, moveBy, moveRow, toggleHidden, withParty, type DraftRow } from './reviewDraft'

const FALLBACK_ROW_HEIGHT = 56

const STORY_NOTES = [
  ['story_before', 'How they got here'],
  ['story_why', 'Why this fight exists'],
  ['story_after', 'What happens after'],
] as const

/** One draft line: a drag grip, the name, a Hidden toggle on enemies, and the Move up / Move down buttons. */
function DraftRowFrame({ row, index, count, onMoveTo, onMoveBy, onToggleHidden }: {
  row: DraftRow
  index: number
  count: number
  onMoveTo: (toIndex: number) => void
  onMoveBy: (delta: -1 | 1) => void
  onToggleHidden: () => void
}) {
  const height = useRef(FALLBACK_ROW_HEIGHT)
  const pos = index + 1
  // The drag only wraps reorderTarget; the Move buttons carry the tested, accessible behaviour.
  const drag = Gesture.Pan().runOnJS(true).onEnd((e) => {
    const to = reorderTarget(pos, e.translationY, height.current, count)
    if (to !== pos) onMoveTo(to - 1)
  })
  const icon = THEME_COLORS.accentForeground
  return (
    <Card
      compact
      testID={`draft-${row.key}`}
      className="flex-row items-center gap-2"
      onLayout={(e: LayoutChangeEvent) => { height.current = e.nativeEvent.layout.height || FALLBACK_ROW_HEIGHT }}
    >
      <GestureDetector gesture={drag}>
        <View className="h-11 w-8 items-center justify-center" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <DotsSixVertical size={20} color={icon} />
        </View>
      </GestureDetector>
      <View className="flex-1 gap-1">
        <Text variant="subhead" numberOfLines={1}>{row.name}</Text>
        {row.kind === 'enemy' ? <Badge>Enemy</Badge> : null}
      </View>
      {row.kind === 'enemy' ? (
        <ToggleChip
          size="sm"
          tone="outline"
          label="Hidden"
          accessibilityLabel={`Hidden: ${row.name}`}
          selected={row.hidden}
          onPress={onToggleHidden}
        />
      ) : null}
      <Button size="icon" variant="outline" disabled={pos === 1} accessibilityLabel={`Move up: ${row.name}`} onPress={() => onMoveBy(-1)}>
        <ArrowUp size={16} color={icon} />
      </Button>
      <Button size="icon" variant="outline" disabled={pos === count} accessibilityLabel={`Move down: ${row.name}`} onPress={() => onMoveBy(1)}>
        <ArrowDown size={16} color={icon} />
      </Button>
    </Card>
  )
}

/**
 * The pre-combat review: story notes, the enemies as they will appear, and the initiative order set by drag
 * (or the move buttons). The draft is local state; nothing reaches the server until Enter combat, which is
 * one startPreparedCombat call. Back leaves with nothing changed.
 */
export function ReviewScreen({ campaign, party, sessionId, initialEncounterId, onBack }: {
  campaign: CampaignFull
  party: CharacterFull[]
  sessionId: string
  initialEncounterId?: string
  onBack: () => void
}) {
  const encounters = useEncounters(campaign.id, true).data
  const launch = useStartPreparedCombat(campaign.id, sessionId)
  const [rows, setRows] = useState<DraftRow[]>(() => buildDraft({ party, encounters: [] }))
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const busy = useRef(false)
  // The party may load after the screen opens (a reload during a rolling combat), or someone joins late:
  // every member must be in the draft, or the launch would silently put them last.
  useEffect(() => {
    setRows((r) => withParty(r, party))
  }, [party])

  const addEncounter = (id: string) => {
    const found = encounters?.find((e) => e.id === id)
    if (!found || pickedIds.includes(id)) return
    setPickedIds((ids) => [...ids, id])
    setRows((r) => [...r, ...buildDraft({ party: [], encounters: [found] })])
  }

  // The pre-selected encounter joins once, as soon as the list has loaded.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !initialEncounterId || !encounters) return
    const found = encounters.find((e) => e.id === initialEncounterId)
    if (!found) return
    seeded.current = true
    setPickedIds([found.id])
    setRows((r) => [...r, ...buildDraft({ party: [], encounters: [found] })])
  }, [initialEncounterId, encounters])

  const picked = useMemo(
    () => pickedIds.flatMap((id) => encounters?.find((e) => e.id === id) ?? []),
    [pickedIds, encounters],
  )
  const withNotes = picked.filter((e) => STORY_NOTES.some(([k]) => !!e[k]?.trim()))

  const enter = async () => {
    if (busy.current) return
    busy.current = true
    try {
      await launch.mutateAsync(launchInput(rows))
    } catch (e) {
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
    } finally {
      busy.current = false
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Button variant="outline" accessibilityLabel="Back" onPress={onBack}><Text>Back</Text></Button>
        <Button accessibilityLabel="Enter combat" onPress={enter}><Text>Enter combat</Text></Button>
      </View>
      <Text variant="heading" accessibilityRole="header">
        {picked.length === 1 ? picked[0].name : 'Review the fight'}
      </Text>

      {withNotes.length > 0 ? (
        <View testID="story-panel" className="gap-2">
          <Text variant="subhead" accessibilityRole="header">Story</Text>
          {withNotes.map((e) => (
            <Card key={e.id} compact className="gap-2">
              <Text variant="subhead">{e.name}</Text>
              {STORY_NOTES.map(([k, label]) => (e[k]?.trim() ? (
                <View key={k} className="gap-1">
                  <Text variant="caption" tone="muted">{label}</Text>
                  <Text variant="body-sm">{e[k]}</Text>
                </View>
              ) : null))}
            </Card>
          ))}
        </View>
      ) : null}

      {picked.length > 0 ? <EnemyStrip encounters={picked} /> : null}

      <View className="gap-2">
        <Text variant="subhead" accessibilityRole="header">Initiative order</Text>
        <Text variant="caption" tone="muted">Drag to set the order, or use the arrows.</Text>
        {rows.map((row, i) => (
          <DraftRowFrame
            key={row.key}
            row={row}
            index={i}
            count={rows.length}
            onMoveTo={(to) => setRows((r) => moveRow(r, row.key, to))}
            onMoveBy={(d) => setRows((r) => moveBy(r, row.key, d))}
            onToggleHidden={() => setRows((r) => toggleHidden(r, row.key))}
          />
        ))}
      </View>

      <Button variant="outline" accessibilityLabel="Add encounter" onPress={() => setPicking((p) => !p)}>
        <Text>Add encounter</Text>
      </Button>
      {picking ? <EncounterPicker encounters={encounters ?? []} pickedIds={pickedIds} onPick={addEncounter} /> : null}
    </View>
  )
}

/** The picked encounters' enemies as compact cards. Numbers only; they are not live yet. */
function EnemyStrip({ encounters }: { encounters: Encounter[] }) {
  const enemies = encounters.flatMap((e) => e.enemies)
  if (enemies.length === 0) return null
  return (
    <View className="gap-2">
      <Text variant="subhead" accessibilityRole="header">Enemies</Text>
      <View className="flex-row flex-wrap gap-2">
        {enemies.map((e) => {
          const label = e.count > 1 ? `${e.name} ×${e.count}` : e.name
          const stats = [
            e.ac === null ? null : `AC ${e.ac}`,
            `HP ${e.max_hp}${e.count > 1 ? ' each' : ''}`,
            e.xp === null ? null : `XP ${e.xp}`,
          ].filter(Boolean).join(' · ')
          return (
            <Card key={e.id} compact className="gap-1" accessible accessibilityLabel={`Enemy preview: ${label}`}>
              <Text variant="subhead" numberOfLines={1}>{label}</Text>
              <Text variant="caption" tone="muted">{stats}</Text>
            </Card>
          )
        })}
      </View>
    </View>
  )
}
