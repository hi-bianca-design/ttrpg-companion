import { useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import type { CharacterFull } from '@/features/characters/characters.api'
import { ERROR_COPY } from '@/features/errors'
import { AddEnemyForm } from './AddEnemyForm'
import { buildGmOrder } from './battleOrder'
import type { Combat } from './combat.api'
import { useCombatEntries, useSetInitiative, useStartCombat } from './combat.queries'

const MIN_INITIATIVE = -20
const MAX_INITIATIVE = 99

const signed = (t: string) => (t.startsWith('-') ? '-' : '') + t.replace(/[^0-9]/g, '')
const errorCopy = (e: unknown) => (e instanceof Error ? e.message : ERROR_COPY.save_failed)

/** Blank stays null (clears the number); anything else is a whole number held to what the server accepts. */
function parseInitiative(text: string): number | null {
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) ? Math.max(MIN_INITIATIVE, Math.min(MAX_INITIATIVE, n)) : null
}

/**
 * The GM's roll call: one number-pad row per party member and enemy, in the order the server keeps
 * (so the list re-sorts as numbers land), enter moving to the next row. Players see none of this.
 */
export function RollCall({ combat, party }: { combat: Combat; party: CharacterFull[] }) {
  const entries = useCombatEntries(combat, true)
  const setInit = useSetInitiative(combat.campaign_id, combat.id)
  const start = useStartCombat(combat.campaign_id, combat.id)
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const inputs = useRef<(TextInput | null)[]>([])
  const starting = useRef(false)

  const { rows } = buildGmOrder({ combat, entries: entries.data ?? [], party, userId: undefined })
  const blank = rows.filter((r) => r.initiative === null).length

  // One request per row at a time: enter and end-editing both fire for the same number.
  const saving = useRef(new Set<string>())
  const save = async (row: (typeof rows)[number]) => {
    const text = typed[row.id]
    if (text === undefined || saving.current.has(row.id)) return
    const value = parseInitiative(text)
    const forget = () => setTyped(({ [row.id]: _, ...rest }) => rest)
    if (value === row.initiative) return forget()
    saving.current.add(row.id)
    try {
      await setInit.mutateAsync({ entryId: row.id, initiative: value })
    } catch (e) {
      showToast(errorCopy(e))
    } finally {
      saving.current.delete(row.id)
      forget()
    }
  }

  const advance = (index: number) => {
    const next = inputs.current[index + 1]
    if (next) next.focus()
    else inputs.current[index]?.blur()
    return save(rows[index])
  }

  const startCombat = async () => {
    if (starting.current) return
    starting.current = true
    try {
      // The keyboard may never have sent what is still typed: send it before the order locks.
      await Promise.all(rows.map(save))
      await start.mutateAsync()
    } catch (e) {
      showToast(errorCopy(e))
    } finally {
      starting.current = false
    }
  }

  return (
    <View className="gap-3">
      <Text variant="heading" accessibilityRole="header">Roll initiative</Text>
      {entries.isPending && !entries.data ? null : rows.length === 0 ? (
        <Text variant="body-sm" tone="muted">No one has joined with a character yet</Text>
      ) : (
        <View className="gap-2">
          {rows.map((row, i) => (
            <Card key={row.id} compact className="flex-row items-center gap-3">
              <View className="flex-1 gap-1">
                <Text variant="subhead" numberOfLines={1}>{row.name}</Text>
                {row.kind === 'enemy' ? (
                  <View className="flex-row gap-1">
                    <Badge>Enemy</Badge>
                    {row.hidden ? <Badge variant="tinted">Hidden</Badge> : null}
                  </View>
                ) : null}
              </View>
              <Input
                ref={(el) => { inputs.current[i] = el }}
                className="w-1/3 text-center"
                accessibilityLabel={`Initiative for ${row.name}`}
                placeholder="Init"
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                blurOnSubmit={false}
                value={typed[row.id] ?? (row.initiative === null ? '' : String(row.initiative))}
                onChangeText={(t) => setTyped((prev) => ({ ...prev, [row.id]: signed(t) }))}
                onSubmitEditing={() => advance(i)}
                onEndEditing={() => save(row)}
              />
            </Card>
          ))}
        </View>
      )}
      {blank > 0 ? (
        <Text variant="caption" tone="muted">
          {blank === 1 ? '1 row has no number yet. It goes last.' : `${blank} rows have no number yet. They go last.`}
        </Text>
      ) : null}
      <Button variant="outline" onPress={() => setAdding(true)}>
        <Text>Add enemy</Text>
      </Button>
      <Button onPress={startCombat}>
        <Text>Start combat</Text>
      </Button>
      <AddEnemyForm campaignId={combat.campaign_id} combatId={combat.id} open={adding} onOpenChange={setAdding} />
    </View>
  )
}
