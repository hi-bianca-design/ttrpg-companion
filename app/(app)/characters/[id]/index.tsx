import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations, DBCharacter, ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { HPBar } from '@/components/character/HPBar'
import { ConditionBadge } from '@/components/character/ConditionBadge'

export default function OverviewTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  async function applyDamage(amount: number) {
    if (!character) return
    const newHP = Math.max(0, character.hp_current - amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function applyHeal(amount: number) {
    if (!character) return
    const newHP = Math.min(character.hp_max, character.hp_current + amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function setTempHP(amount: number) {
    if (!character) return
    const updated = await updateCharacter(id, { temp_hp: amount }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, temp_hp: updated.temp_hp } : prev)
  }

  async function removeCondition(condition: string) {
    if (!character) return
    const newConditions = character.conditions.filter((c) => c !== condition)
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
  }

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-2xl font-bold text-text">{character.name}</Text>
          <Text className="text-muted text-sm">
            Level {character.level} {character.class?.name ?? '—'}
            {character.subclass ? ` (${character.subclass.name})` : ''}
          </Text>
          <Text className="text-muted text-xs">{character.species?.name} · {character.background?.name}</Text>
        </View>
        <TouchableOpacity
          className="bg-surface px-3 py-1 rounded-lg"
          onPress={() => router.push(`/(app)/characters/${id}/level-up`)}
        >
          <Text className="text-primary text-sm">Level Up</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-surface rounded-xl p-4 mb-3">
        <Text className="text-muted text-xs font-bold mb-3">HIT POINTS</Text>
        <HPBar
          hpCurrent={character.hp_current}
          hpMax={character.hp_max}
          tempHP={character.temp_hp}
          onDamage={applyDamage}
          onHeal={applyHeal}
          onSetTempHP={setTempHP}
        />
      </View>

      <View className="flex-row gap-3 mb-3">
        {[
          { label: 'AC', value: character.armor_class },
          { label: 'Initiative', value: formatModifier(getAbilityModifier(character.dexterity)) },
          { label: 'Speed', value: `${character.speed} ft` },
          { label: 'Prof', value: `+${profBonus}` },
        ].map(({ label, value }) => (
          <View key={label} className="flex-1 bg-surface rounded-xl p-3 items-center">
            <Text className="text-muted text-xs">{label}</Text>
            <Text className="text-text font-bold text-lg">{value}</Text>
          </View>
        ))}
      </View>

      <View className="bg-surface rounded-xl p-4 mb-3">
        <Text className="text-muted text-xs font-bold mb-3">ABILITY SCORES</Text>
        <View className="flex-row flex-wrap gap-2">
          {ABILITY_KEYS.map((key) => {
            const score = character[key]
            const mod = getAbilityModifier(score)
            return (
              <View key={key} className="items-center bg-overlay rounded-xl px-3 py-2 flex-1 min-w-[80px]">
                <Text className="text-muted text-xs">{ABILITY_LABELS[key].slice(0, 3).toUpperCase()}</Text>
                <Text className="text-text font-bold text-xl">{score}</Text>
                <Text className="text-primary text-sm">{formatModifier(mod)}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {character.conditions.length > 0 && (
        <View className="bg-surface rounded-xl p-4">
          <Text className="text-muted text-xs font-bold mb-2">CONDITIONS</Text>
          <View className="flex-row flex-wrap">
            {character.conditions.map((c) => (
              <ConditionBadge key={c} condition={c} onRemove={() => removeCondition(c)} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}
