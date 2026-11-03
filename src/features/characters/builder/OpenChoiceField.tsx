// A system-agnostic open choice: `count` free-text inputs plus suggestion chips that fill them.
// Typed values are always kept; a suggestion is just a shortcut for typing its name.
import { View } from 'react-native'
import { SectionHeader } from '@/components/game'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'

type OpenChoiceFieldProps = {
  label: string
  help: string
  count: number
  values: string[]
  suggestions: string[]
  onChange(values: string[]): void
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Slot values padded to `count`, then trailing empty slots dropped, so stored lists stay short. */
function compact(slots: string[]): string[] {
  const out = [...slots]
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
  return out
}

export function OpenChoiceField({ label, help, count, values, suggestions, onChange }: OpenChoiceFieldProps) {
  const slots = Array.from({ length: count }, (_, i) => values[i] ?? '')
  const unique = suggestions.filter((s, i) => s.trim() !== '' && suggestions.findIndex((t) => same(t, s)) === i)

  const setSlot = (i: number, value: string) => {
    const next = [...slots]
    next[i] = value
    onChange(compact(next))
  }

  const tap = (suggestion: string) => {
    const selected = slots.findIndex((v) => v.trim() !== '' && same(v, suggestion))
    if (selected >= 0) return setSlot(selected, '')
    const empty = slots.findIndex((v) => v.trim() === '')
    setSlot(empty >= 0 ? empty : count - 1, suggestion)
  }

  const id = `builder-choice-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <SectionHeader id={id} title={label}>
      <View className="gap-3">
        <Text variant="caption" tone="muted">{help}</Text>
        <View className="gap-2">
          {slots.map((value, i) => (
            <Input
              key={i}
              accessibilityLabel={count > 1 ? `${label} ${i + 1}` : label}
              placeholder="Type or pick below"
              value={value}
              onChangeText={(v) => setSlot(i, v)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          ))}
        </View>
        {unique.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {unique.map((s) => (
              <ToggleChip
                key={s}
                label={s}
                size="sm"
                selected={slots.some((v) => v.trim() !== '' && same(v, s))}
                onPress={() => tap(s)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </SectionHeader>
  )
}
