import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { ConditionsSheet } from '@/features/characters/sheet/ConditionsSheet'
import { titleCase } from '@/features/characters/sheet/format'
import type { GmEnemyRow } from './battleOrder'
import type { EnemyPatch } from './combat.api'
import { TEMP_HP_LABEL } from './copy'
import { HpEntryBar } from './HpEntryBar'
import { CurrentMark } from './PlayerRowCard'
import type { EnemyHp } from './useEnemyHp'

type EnemyCardProps = {
  row: GmEnemyRow
  selected: boolean
  onToggleSelect: () => void
  hp: EnemyHp
  /** The campaign system's condition keys, the same list the character sheet picks from. Empty hides the picker. */
  conditionOptions: string[]
  /** Present only when the enemy belongs to a ×N group of more than one. */
  onSelectGroup?: () => void
  /** One typed change (exact hit points, notes, hidden, conditions). The caller owns the request and its errors. */
  onPatch: (patch: EnemyPatch) => Promise<void>
  onRemove: () => Promise<void>
  /** The **+1**: one more of this enemy at full health. */
  onCopy: () => Promise<void>
}

const xpText = (xp: number) => `XP ${xp}`

/**
 * One enemy on the GM's combat screen, everything at a glance: name, the main defense large, hit points as
 * text and a bar with the HP entry right on the card, condition chips, the attacks to read out, XP, and
 * a **Full stat block** expander (notes, exact HP, hide, group select, remove). A downed enemy collapses to
 * one line (name, Down, XP, Undo) and can be opened again to heal it.
 */
export function EnemyCard({ row, selected, onToggleSelect, hp, conditionOptions, onSelectGroup, onPatch, onRemove, onCopy }: EnemyCardProps) {
  const [statBlock, setStatBlock] = useState(false)
  const [showDowned, setShowDowned] = useState(false)
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [exact, setExact] = useState('')
  const [notes, setNotes] = useState(row.notes ?? '')
  // Opened while down, then healed: the next time it drops it collapses again.
  useEffect(() => {
    if (!row.isDown) setShowDowned(false)
  }, [row.isDown])

  const defenseLabel = row.defenseLabel ?? 'AC'
  const spoken = [
    row.name,
    `${row.hp} of ${row.maxHp} hit points${row.tempHp > 0 ? `, ${row.tempHp} temporary` : ''}`,
    row.isDown ? 'down' : null,
    row.ac === null ? null : `${defenseLabel} ${row.ac}`,
    row.hidden ? 'hidden from players' : null,
    row.isCurrent ? 'current turn' : null,
  ].filter(Boolean).join(', ')

  if (row.isDown && !showDowned) {
    return (
      <Card compact tone={row.isCurrent ? 'selected' : 'default'}>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="min-h-11 flex-1 flex-row items-center gap-2"
            accessibilityRole="button"
            accessibilityLabel={`Show ${row.name}`}
            accessibilityHint={spoken}
            onPress={() => setShowDowned(true)}
          >
            <Text variant="subhead" tone="muted" className="flex-1" numberOfLines={1}>{row.name}</Text>
            <Text variant="label">Down</Text>
            {row.xp !== null ? <Text variant="label" tone="muted">{xpText(row.xp)}</Text> : null}
          </Pressable>
          {hp.canUndo(row.id) ? (
            <Button variant="ghost" disabled={hp.pending} onPress={() => hp.undoFor(row.id)}>
              <Text>Undo</Text>
            </Button>
          ) : null}
        </View>
      </Card>
    )
  }

  const setExactHp = () => {
    const n = Number.parseInt(exact, 10)
    if (!Number.isFinite(n)) return
    onPatch({ hp: n })
    setExact('')
  }

  return (
    <Card compact tone={row.isCurrent ? 'selected' : 'default'} className="gap-3">
      <View className="flex-row items-start gap-2">
        <ToggleChip label="" size="square" tone="outline" selected={selected} accessibilityLabel={`Select ${row.name}`} onPress={onToggleSelect} />
        <View className="flex-1 gap-1" accessible accessibilityLabel={spoken}>
          <Text variant="subhead" numberOfLines={1}>{row.name}</Text>
          {row.isCurrent ? <CurrentMark /> : null}
          {row.isDown ? <Text variant="label">Down</Text> : null}
        </View>
        <Button variant="outline" accessibilityLabel={`Add another ${row.name}`} onPress={onCopy}>
          <Text>+1</Text>
        </Button>
      </View>

      <View className="flex-row items-end justify-between gap-2">
        <View className="flex-row items-end gap-2">
          <Text variant="label" tone="muted">{defenseLabel}</Text>
          <Text variant="stat">{row.ac === null ? '–' : String(row.ac)}</Text>
        </View>
        {row.xp !== null ? <Text variant="label" tone="muted">{xpText(row.xp)}</Text> : null}
      </View>

      <View className="gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="body-sm">{`${row.hp}/${row.maxHp}`}</Text>
          {row.tempHp > 0 ? <Text variant="body-sm" tone="muted">{`+${row.tempHp} ${TEMP_HP_LABEL}`}</Text> : null}
          {row.hidden ? <Badge variant="tinted">Hidden</Badge> : null}
        </View>
        <Progress value={row.maxHp > 0 ? (row.hp / row.maxHp) * 100 : 0} accessibilityLabel={`${row.name} hit points`} />
      </View>

      <HpEntryBar
        label={row.name}
        disabled={hp.pending}
        canUndo={hp.canUndo(row.id)}
        onDamage={(n) => hp.apply([row.id], 'damage', n)}
        onHeal={(n) => hp.apply([row.id], 'heal', n)}
        onTemp={(n) => hp.apply([row.id], 'temp', n)}
        onUndo={() => hp.undoFor(row.id)}
      />

      {row.conditions.length > 0 || conditionOptions.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-2">
          {row.conditions.map((c) => <Badge key={c} variant="tinted">{titleCase(c)}</Badge>)}
          {conditionOptions.length > 0 ? (
            <Button size="sm" variant="ghost" accessibilityLabel={`Conditions: ${row.name}`} onPress={() => setPicking(true)}>
              <Text>+ condition</Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      {row.attacks.length > 0 ? (
        <View className="gap-1">
          {row.attacks.map((a, i) => (
            <Text key={`${a.name}-${i}`} variant="body-sm" numberOfLines={2}>{[a.name, a.toHit].filter(Boolean).join(' ') + (a.damage ? ` · ${a.damage}` : '')}</Text>
          ))}
        </View>
      ) : null}

      <Pressable
        className="min-h-11 justify-center"
        accessibilityRole="button"
        accessibilityLabel={`Full stat block: ${row.name}`}
        accessibilityState={{ expanded: statBlock }}
        onPress={() => setStatBlock((o) => !o)}
      >
        <Text variant="body-sm" tone="accent">{`${statBlock ? '▾' : '▸'} Full stat block`}</Text>
      </Pressable>

      {statBlock ? (
        <View className="gap-3">
          {row.notes ? <Text variant="body-sm" tone="muted">{row.notes}</Text> : null}
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

      {row.isDown ? (
        <Button variant="ghost" accessibilityLabel={`Collapse ${row.name}`} onPress={() => setShowDowned(false)}>
          <Text>Collapse</Text>
        </Button>
      ) : null}

      <ConditionsSheet
        open={picking}
        onOpenChange={setPicking}
        options={conditionOptions}
        value={row.conditions}
        onApply={(conditions) => onPatch({ conditions })}
      />
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
