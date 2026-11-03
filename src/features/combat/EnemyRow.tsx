import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import type { EnemyPatch } from './combat.api'
import { TEMP_HP_LABEL } from './copy'
import type { GmEnemyRow } from './battleOrder'
import { HpEntryBar } from './HpEntryBar'
import { CurrentMark, initText } from './PlayerRowCard'
import type { EnemyHp } from './useEnemyHp'

type EnemyRowProps = {
  row: GmEnemyRow
  selected: boolean
  onToggleSelect: () => void
  hp: EnemyHp
  /** Present only when the row belongs to a ×N group of more than one. */
  onSelectGroup?: () => void
  /** One typed change (exact hit points, notes, hidden). The caller owns the request and its errors. */
  onPatch: (patch: EnemyPatch) => Promise<void>
  onRemove: () => Promise<void>
}

/**
 * An enemy in the GM's list: name, initiative, hit points as text and a bar, armor class, notes, hidden and
 * down state. Tap the body for the controls: Damage / Heal / Temp HP with undo, an exact Set HP, notes,
 * Hide/Reveal, Select group and Remove. The leading toggle adds the row to the bulk selection.
 */
export function EnemyRow({ row, selected, onToggleSelect, hp, onSelectGroup, onPatch, onRemove }: EnemyRowProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [exact, setExact] = useState('')
  const [notes, setNotes] = useState(row.notes ?? '')

  const spoken = [
    row.name,
    `${row.hp} of ${row.maxHp} hit points${row.tempHp > 0 ? `, ${row.tempHp} temporary` : ''}`,
    row.isDown ? 'down' : null,
    row.initiative === null ? null : `initiative ${row.initiative}`,
    row.ac === null ? null : `armor class ${row.ac}`,
    row.hidden ? 'hidden from players' : null,
    row.isCurrent ? 'current turn' : null,
  ].filter(Boolean).join(', ')

  const setExactHp = () => {
    const n = Number.parseInt(exact, 10)
    if (!Number.isFinite(n)) return
    onPatch({ hp: n })
    setExact('')
  }

  return (
    <Card compact tone={row.isCurrent ? 'selected' : 'default'} className="gap-2">
      <View className="flex-row items-start gap-2">
        <ToggleChip
          label=""
          size="square"
          tone="outline"
          selected={selected}
          accessibilityLabel={`Select ${row.name}`}
          onPress={onToggleSelect}
        />
        <Pressable
          className="flex-1 gap-1"
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
        >
          <View className="flex-row items-center gap-2">
            <Text variant="subhead" className="flex-1" numberOfLines={1}>{row.name}</Text>
            <Text variant="label" tone="muted">{initText(row.initiative)}</Text>
          </View>
          {row.isCurrent ? <CurrentMark /> : null}
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="body-sm">{`${row.hp}/${row.maxHp}`}</Text>
            {row.tempHp > 0 ? <Text variant="body-sm" tone="muted">{`+${row.tempHp} ${TEMP_HP_LABEL}`}</Text> : null}
            {row.isDown ? <Text variant="label">Down</Text> : null}
          </View>
          <Progress value={row.maxHp > 0 ? (row.hp / row.maxHp) * 100 : 0} accessibilityLabel={`${row.name} hit points`} />
          <View className="flex-row flex-wrap gap-1">
            {row.ac !== null ? <Badge>{`AC ${row.ac}`}</Badge> : null}
            {row.hidden ? <Badge variant="tinted">Hidden</Badge> : null}
          </View>
          {row.notes ? <Text variant="caption" tone="muted" numberOfLines={2}>{row.notes}</Text> : null}
        </Pressable>
      </View>
      {!open && hp.canUndo(row.id) ? (
        <Button variant="ghost" onPress={() => hp.undoFor(row.id)}>
          <Text>Undo</Text>
        </Button>
      ) : null}
      {open ? (
        <View className="gap-3">
          <HpEntryBar
            label={row.name}
            disabled={hp.pending}
            canUndo={hp.canUndo(row.id)}
            onDamage={(n) => hp.apply([row.id], 'damage', n)}
            onHeal={(n) => hp.apply([row.id], 'heal', n)}
            onTemp={(n) => hp.apply([row.id], 'temp', n)}
            onUndo={() => hp.undoFor(row.id)}
          />
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input
                className="text-center"
                accessibilityLabel="Set HP to"
                placeholder="Exact HP"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={4}
                value={exact}
                onChangeText={(t) => setExact(t.replace(/[^0-9]/g, ''))}
              />
            </View>
            <Button variant="outline" onPress={setExactHp}>
              <Text>Set HP</Text>
            </Button>
          </View>
          <Input accessibilityLabel="Notes" placeholder="Notes" multiline value={notes} onChangeText={setNotes} />
          <Button variant="outline" onPress={() => onPatch({ notes: notes.trim() || null })}>
            <Text>Save notes</Text>
          </Button>
          <View className="flex-row flex-wrap gap-2">
            <Button variant="outline" onPress={() => onPatch({ hidden: !row.hidden })}>
              <Text>{row.hidden ? 'Reveal' : 'Hide'}</Text>
            </Button>
            {onSelectGroup ? (
              <Button variant="outline" onPress={onSelectGroup}>
                <Text>Select group</Text>
              </Button>
            ) : null}
            <Button variant="destructive" onPress={() => setConfirming(true)}>
              <Text>Remove</Text>
            </Button>
          </View>
        </View>
      ) : null}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Remove ${row.name}?`}</DialogTitle>
            <DialogDescription>It leaves the fight for good.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setConfirming(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              accessibilityLabel={`Remove ${row.name}`}
              onPress={() => {
                setConfirming(false)
                onRemove()
              }}
            >
              <Text>Remove</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
