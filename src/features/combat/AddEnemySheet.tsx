import { useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { showToast } from '@/components/ui/toast'
import { ERROR_COPY } from '@/features/errors'
import { useEncounters } from '@/features/encounters/encounters.queries'
import type { GmEnemyRow } from './battleOrder'
import { useAddEncounterEnemies, useAddEnemies } from './combat.queries'
import { EncounterPicker } from './EncounterPicker'
import { nameStem, useCopyEnemy } from './useCopyEnemy'

const NAME_MAX = 60
const COUNT_MAX = 20

type Path = 'copy' | 'encounter' | 'blank'
type Props = {
  campaignId: string
  combatId: string
  /** The enemies in the fight now: the Copy path lists them, one per name. */
  enemies: GmEnemyRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const digits = (t: string) => t.replace(/[^0-9]/g, '')
const toInt = (t: string): number | null => {
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}
function clampCount(t: string): string {
  const d = digits(t)
  if (d === '') return ''
  return String(Math.max(1, Math.min(COUNT_MAX, Number.parseInt(d, 10))))
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text variant="label">{label}</Text>
      {children}
    </View>
  )
}

/** One row per name stem (Wolf 1, Wolf 2 → Wolf), first in order wins. */
function distinctByStem(enemies: GmEnemyRow[]): GmEnemyRow[] {
  const seen = new Set<string>()
  return enemies.filter((e) => {
    const stem = nameStem(e.name)
    if (seen.has(stem)) return false
    seen.add(stem)
    return true
  })
}

/**
 * Add an enemy mid-fight, fastest path first: copy one already in the fight, bring in a saved
 * encounter, or type a blank one (name and hit points). Every add lands at the bottom of the order,
 * so initiative is never asked. The sheet stays open after an add, and a failed add keeps what was typed.
 */
export function AddEnemySheet({ campaignId, combatId, enemies, open, onOpenChange }: Props) {
  const add = useAddEnemies(campaignId, combatId)
  const addEncounter = useAddEncounterEnemies(campaignId, combatId)
  const copyEnemy = useCopyEnemy(campaignId, combatId)
  const encounters = useEncounters(campaignId, true)
  const nameRef = useRef<TextInput>(null)
  const [chosen, setChosen] = useState<Path | null>(null)
  const [name, setName] = useState('')
  const [maxHp, setMaxHp] = useState('')
  const [ac, setAc] = useState('')
  const [notes, setNotes] = useState('')
  const [hidden, setHidden] = useState(false)
  const [count, setCount] = useState('1')
  const [busy, setBusy] = useState(false)

  const path: Path = chosen ?? (enemies.length > 0 ? 'copy' : 'blank')
  const copies = toInt(count) ?? 1
  const hp = toInt(maxHp)
  const valid = name.trim().length > 0 && hp !== null && hp >= 1

  const reset = () => {
    setName(''); setMaxHp(''); setAc(''); setNotes(''); setHidden(false); setCount('1')
  }

  // One guard and one toast for all three paths.
  const guarded = async (fn: () => Promise<unknown>): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    try {
      await fn()
      return true
    } catch (e) {
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!valid) return
    const ok = await guarded(() =>
      add.mutateAsync({ name: name.trim(), count: copies, maxHp: hp!, initiative: null, ac: toInt(ac), notes: notes.trim() || null, hidden }),
    )
    if (ok) {
      reset()
      nameRef.current?.focus()
    }
  }

  const stems = distinctByStem(enemies)
  const saved = encounters.data ?? []

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); setChosen(null) } onOpenChange(o) }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add enemy</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Tabs value={path} onValueChange={(v) => setChosen(v as Path)} className="gap-3">
            <TabsList>
              <TabsTrigger value="copy"><Text>Copy</Text></TabsTrigger>
              <TabsTrigger value="encounter"><Text>Encounter</Text></TabsTrigger>
              <TabsTrigger value="blank"><Text>Blank</Text></TabsTrigger>
            </TabsList>

            <TabsContent value="copy">
              {stems.length === 0 ? (
                <Text variant="body-sm" tone="muted">No enemies in the fight yet</Text>
              ) : (
                <View className="gap-2">
                  {stems.map((e) => (
                    <Button key={e.id} variant="outline" disabled={busy} accessibilityLabel={`Copy ${nameStem(e.name)}`} onPress={() => guarded(() => copyEnemy(e))}>
                      <Text numberOfLines={1}>{nameStem(e.name)}</Text>
                      <Text variant="caption" tone="muted">{`HP ${e.maxHp}`}</Text>
                    </Button>
                  ))}
                </View>
              )}
            </TabsContent>

            <TabsContent value="encounter">
              <EncounterPicker encounters={saved} onPick={(id) => { void guarded(() => addEncounter.mutateAsync({ encounterId: id })) }} />
            </TabsContent>

            <TabsContent value="blank" className="gap-3">
              <Field label="Name">
                <Input
                  ref={nameRef}
                  accessibilityLabel="Name"
                  placeholder="Goblin"
                  value={name}
                  onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
                  autoFocus
                />
              </Field>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Field label="Max HP">
                    <Input accessibilityLabel="Max HP" keyboardType="number-pad" inputMode="numeric" maxLength={4} value={maxHp} onChangeText={(t) => setMaxHp(digits(t))} />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="AC">
                    <Input accessibilityLabel="AC" keyboardType="number-pad" inputMode="numeric" maxLength={2} value={ac} onChangeText={(t) => setAc(digits(t))} />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="×">
                    <Input accessibilityLabel="Count" keyboardType="number-pad" inputMode="numeric" value={count} onChangeText={(t) => setCount(clampCount(t))} />
                  </Field>
                </View>
              </View>
              <Field label="Notes">
                <Input accessibilityLabel="Notes" placeholder="Optional" multiline value={notes} onChangeText={setNotes} />
              </Field>
              <View className="flex-row flex-wrap gap-2">
                <ToggleChip label="Hidden" tone="outline" selected={hidden} onPress={() => setHidden((h) => !h)} />
              </View>
              <Button disabled={busy || !valid} onPress={submit}>
                <Text>{copies > 1 ? `Add ${copies} enemies` : 'Add enemy'}</Text>
              </Button>
            </TabsContent>
          </Tabs>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
