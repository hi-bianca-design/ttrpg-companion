// Free-text language list: fixed languages as plain badges, the rest as removable chips,
// and a field to type another. Shared by the builder's Origin step and the sheet's editor.
import { useState } from 'react'
import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { ToggleChip } from '@/components/ui/toggle-chip'
import { normalizeLanguages } from './languages'

type LanguageEditorProps = {
  /** The editable languages (never includes the fixed ones). */
  value: string[]
  onChange: (next: string[]) => void
  /** Always known, shown first, not removable (e.g. Common). */
  fixed?: string[]
}

export function LanguageEditor({ value, onChange, fixed = [] }: LanguageEditorProps) {
  const [text, setText] = useState('')
  const isFixed = (l: string) => fixed.some((f) => f.toLowerCase() === l.toLowerCase())

  const add = () => {
    const next = normalizeLanguages([...value, text]).filter((l) => !isFixed(l))
    setText('')
    if (next.length !== value.length) onChange(next)
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {fixed.map((l) => <Badge key={l}>{l}</Badge>)}
        {value.map((l) => (
          <ToggleChip
            key={l}
            size="sm"
            label={l}
            selected
            accessibilityLabel={`Remove ${l}`}
            onPress={() => onChange(value.filter((v) => v !== l))}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            aria-label="Add a language"
            accessibilityLabel="Add a language"
            placeholder="e.g. Elvish"
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
        <Button variant="outline" accessibilityLabel="Add language" onPress={add}>
          <Text>Add</Text>
        </Button>
      </View>
    </View>
  )
}
