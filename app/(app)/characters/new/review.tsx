import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { createCharacter } from '@/modules/character/character.service'
import { useAuth } from '@/features/auth/useAuth'
import { getAbilityModifier, formatModifier, getMaxHP } from '@/modules/character/character.utils'
import { ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'

export default function ReviewStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, resetDraft } = useCharacterStore()
  const [saving, setSaving] = useState(false)

  const conMod = getAbilityModifier(draft.constitution)
  const hpMax  = getMaxHP(1, draft.hit_die ?? 8, conMod)

  async function handleCreate() {
    if (!user) return
    setSaving(true)
    try {
      const character = await createCharacter(user.id, draft)
      resetDraft()
      router.replace(`/(app)/characters/${character.id}`)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
      setSaving(false)
    }
  }

  function getBonusForAbility(key: AbilityKey): number {
    if (draft.bg_bonus_two === key) return 2
    if (draft.bg_bonus_one === key) return 1
    return 0
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-2xl font-bold text-legacy-text">{draft.name || 'Your Character'}</Text>
        <Text className="text-legacy-muted mt-1 mb-6">Review before finalizing.</Text>

        <View className="bg-legacy-surface rounded-xl p-4 mb-3">
          <Text className="text-legacy-muted text-xs mb-2 font-bold">CLASS & ORIGIN</Text>
          <Text className="text-legacy-text">
            <Text className="font-bold">Class:</Text> {draft.class_name ?? '—'} (d{draft.hit_die})
          </Text>
          <Text className="text-legacy-text mt-1">
            <Text className="font-bold">HP at Level 1:</Text> {hpMax}
          </Text>
        </View>

        <View className="bg-legacy-surface rounded-xl p-4 mb-3">
          <Text className="text-legacy-muted text-xs mb-3 font-bold">ABILITY SCORES</Text>
          <View className="flex-row flex-wrap gap-2">
            {ABILITY_KEYS.map((key) => {
              const base = draft[key]
              const bonus = getBonusForAbility(key)
              const total = base + bonus
              const mod = getAbilityModifier(total)
              return (
                <View key={key} className="items-center bg-legacy-overlay rounded-lg px-3 py-2 min-w-[64px]">
                  <Text className="text-legacy-muted text-xs">{ABILITY_LABELS[key].slice(0, 3).toUpperCase()}</Text>
                  <Text className="text-legacy-text font-bold text-lg">{total}</Text>
                  <Text className="text-legacy-primary text-xs">{formatModifier(mod)}</Text>
                  {bonus > 0 && <Text className="text-legacy-green text-xs">+{bonus} bg</Text>}
                </View>
              )
            })}
          </View>
        </View>

        {(draft.alignment || draft.personality_trait) && (
          <View className="bg-legacy-surface rounded-xl p-4 mb-3">
            <Text className="text-legacy-muted text-xs mb-2 font-bold">PERSONALITY</Text>
            {draft.alignment && <Text className="text-legacy-text"><Text className="font-bold">Alignment:</Text> {draft.alignment}</Text>}
            {draft.personality_trait && <Text className="text-legacy-text mt-1">{draft.personality_trait}</Text>}
          </View>
        )}

        {draft.selected_spell_ids.length > 0 && (
          <View className="bg-legacy-surface rounded-xl p-4 mb-3">
            <Text className="text-legacy-muted text-xs mb-1 font-bold">SPELLS</Text>
            <Text className="text-legacy-text">{draft.selected_spell_ids.length} spell{draft.selected_spell_ids.length !== 1 ? 's' : ''} selected</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${saving ? 'bg-legacy-overlay' : 'bg-legacy-primary'}`}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className="text-legacy-base font-semibold">Create {draft.name} →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
