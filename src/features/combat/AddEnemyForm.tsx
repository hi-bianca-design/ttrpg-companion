import { useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { showToast } from '@/components/ui/toast'
import { ERROR_COPY } from '@/features/errors'
import { useAddEnemies, useSetInitiative } from './combat.queries'

const NAME_MAX = 60
const COUNT_MAX = 20

type Props = { campaignId: string; combatId: string; open: boolean; onOpenChange: (open: boolean) => void }

const digits = (t: string) => t.replace(/[^0-9]/g, '')
/** Initiative may be negative: keep a leading minus, drop everything else that is not a digit. */
const signed = (t: string) => (t.startsWith('-') ? '-' : '') + digits(t)
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

/**
 * Typed-in enemies: a name, hit points, optional initiative, armor class and notes, hidden or not,
 * and ×N copies that share one initiative or, with Separate rolls, get one number each. The sheet
 * stays open after an add so the next enemy (a reinforcement, the ogre) is one more fill-in away.
 */
export function AddEnemyForm({ campaignId, combatId, open, onOpenChange }: Props) {
  const add = useAddEnemies(campaignId, combatId)
  const setInit = useSetInitiative(campaignId, combatId)
  const nameRef = useRef<TextInput>(null)
  const [name, setName] = useState('')
  const [maxHp, setMaxHp] = useState('')
  const [initiative, setInitiativeText] = useState('')
  const [ac, setAc] = useState('')
  const [notes, setNotes] = useState('')
  const [hidden, setHidden] = useState(false)
  const [count, setCount] = useState('1')
  const [separate, setSeparate] = useState(false)
  const [rolls, setRolls] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string; maxHp?: string }>({})
  const [busy, setBusy] = useState(false)

  const copies = toInt(count) ?? 1
  const label = name.trim() || 'Enemy'

  const reset = () => {
    setName(''); setMaxHp(''); setInitiativeText(''); setAc(''); setNotes('')
    setHidden(false); setCount('1'); setSeparate(false); setRolls([]); setErrors({})
  }

  const submit = async () => {
    if (busy) return
    const trimmed = name.trim()
    const hp = toInt(maxHp)
    const next = {
      name: trimmed ? undefined : 'Enter a name',
      maxHp: hp && hp >= 1 ? undefined : 'Max HP must be at least 1',
    }
    setErrors(next)
    if (next.name || next.maxHp) return
    setBusy(true)
    try {
      const useRolls = separate && copies > 1
      const ids = await add.mutateAsync({
        name: trimmed,
        count: copies,
        maxHp: hp!,
        initiative: useRolls ? null : toInt(initiative),
        ac: toInt(ac),
        notes: notes.trim() || null,
        hidden,
      })
      if (useRolls) {
        for (const [i, id] of ids.entries()) {
          const n = toInt(rolls[i] ?? '')
          if (n !== null) await setInit.mutateAsync({ entryId: id, initiative: n })
        }
      }
      reset()
      nameRef.current?.focus()
    } catch (e) {
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add enemy</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Field label="Name">
            <Input
              ref={nameRef}
              accessibilityLabel="Name"
              placeholder="Goblin"
              value={name}
              onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
              autoFocus
            />
            {errors.name ? <Text variant="caption" tone="destructive">{errors.name}</Text> : null}
          </Field>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Field label="Max HP">
                <Input accessibilityLabel="Max HP" keyboardType="number-pad" inputMode="numeric" value={maxHp} onChangeText={(t) => setMaxHp(digits(t))} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="AC">
                <Input accessibilityLabel="AC" keyboardType="number-pad" inputMode="numeric" value={ac} onChangeText={(t) => setAc(digits(t))} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="×">
                <Input accessibilityLabel="Count" keyboardType="number-pad" inputMode="numeric" value={count} onChangeText={(t) => setCount(clampCount(t))} />
              </Field>
            </View>
          </View>
          {errors.maxHp ? <Text variant="caption" tone="destructive">{errors.maxHp}</Text> : null}
          {separate && copies > 1 ? (
            <View className="gap-2">
              {Array.from({ length: copies }, (_, i) => (
                <Field key={i} label={`${label} ${i + 1}`}>
                  <Input
                    accessibilityLabel={`${label} ${i + 1}`}
                    placeholder="Initiative"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    value={rolls[i] ?? ''}
                    onChangeText={(t) => setRolls((prev) => { const o = [...prev]; o[i] = signed(t); return o })}
                  />
                </Field>
              ))}
            </View>
          ) : (
            <Field label="Initiative">
              <Input accessibilityLabel="Initiative" placeholder="Optional" keyboardType="number-pad" inputMode="numeric" value={initiative} onChangeText={(t) => setInitiativeText(signed(t))} />
            </Field>
          )}
          <Field label="Notes">
            <Input accessibilityLabel="Notes" placeholder="Optional" multiline value={notes} onChangeText={setNotes} />
          </Field>
          <View className="flex-row flex-wrap gap-2">
            <ToggleChip label="Hidden" tone="outline" selected={hidden} onPress={() => setHidden((h) => !h)} />
            {copies > 1 ? <ToggleChip label="Separate rolls" tone="outline" selected={separate} onPress={() => setSeparate((s) => !s)} /> : null}
          </View>
        </SheetBody>
        <Button disabled={busy} onPress={submit}>
          <Text>{copies > 1 ? `Add ${copies} enemies` : 'Add enemy'}</Text>
        </Button>
      </SheetContent>
    </Sheet>
  )
}
