import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations, DBCharacter, ABILITY_KEYS, ABILITY_LABELS, AbilityKey } from '@/modules/character/character.types'
import { getAbilityModifier, getProficiencyBonus } from '@/modules/character/character.utils'

const ASI_LEVELS = [4, 8, 12, 16, 19]

export default function LevelUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hpChoice, setHpChoice] = useState<'average' | 'max'>('average')
  const [asiBonus, setAsiBonus] = useState<Partial<Record<AbilityKey, number>>>({})

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !character) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const newLevel = character.level + 1
  const hitDie = character.class?.hit_die ?? 8
  const conMod = getAbilityModifier(character.constitution)
  const averageIncrease = Math.floor(hitDie / 2) + 1 + conMod
  const maxIncrease = hitDie + conMod
  const hpIncrease = hpChoice === 'average' ? averageIncrease : maxIncrease

  const isASILevel = ASI_LEVELS.includes(newLevel)
  const totalASI = Object.values(asiBonus).reduce((a, b) => a + (b ?? 0), 0)
  const asiValid = !isASILevel || totalASI === 2

  async function handleLevelUp() {
    if (!character || !asiValid) return
    setSaving(true)
    try {
      const updates: Partial<DBCharacter> = {
        level: newLevel,
        hp_max: character.hp_max + hpIncrease,
        hp_current: character.hp_current + hpIncrease,
        proficiency_bonus: getProficiencyBonus(newLevel),
      }
      if (isASILevel) {
        ABILITY_KEYS.forEach((key) => {
          const bonus = asiBonus[key]
          if (bonus) {
            updates[key] = character[key] + bonus
          }
        })
      }
      await updateCharacter(id, updates)
      router.replace(`/(app)/characters/${id}`)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  function toggleASI(key: AbilityKey) {
    setAsiBonus((prev) => {
      const current = prev[key] ?? 0
      if (current > 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (totalASI >= 2) return prev
      return { ...prev, [key]: 1 }
    })
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-legacy-primary">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-legacy-text">Level Up</Text>
        <Text className="text-legacy-muted mt-1 mb-6 text-sm">
          {character.name} reaches level {newLevel}.
        </Text>

        <View className="bg-legacy-surface rounded-xl p-4 mb-4">
          <Text className="text-legacy-text font-bold mb-3">Hit Points</Text>
          <Text className="text-legacy-muted text-sm mb-3">
            Your Constitution modifier ({conMod >= 0 ? `+${conMod}` : conMod}) is added each level.
          </Text>
          {[
            { mode: 'average' as const, label: `Take Average (+${averageIncrease} HP)` },
            { mode: 'max' as const, label: `Take Maximum (+${maxIncrease} HP)` },
          ].map(({ mode, label }) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setHpChoice(mode)}
              className={`flex-row items-center p-3 rounded-xl mb-2 border ${hpChoice === mode ? 'border-legacy-primary bg-legacy-overlay' : 'border-transparent bg-legacy-overlay/50'}`}
            >
              <View className={`w-4 h-4 rounded-full border-2 mr-3 ${hpChoice === mode ? 'bg-legacy-primary border-legacy-primary' : 'border-legacy-muted'}`} />
              <Text className={hpChoice === mode ? 'text-legacy-primary font-medium' : 'text-legacy-text'}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isASILevel && (
          <View className="bg-legacy-surface rounded-xl p-4 mb-4">
            <Text className="text-legacy-text font-bold mb-1">Ability Score Improvement</Text>
            <Text className="text-legacy-muted text-sm mb-3">
              Distribute +2 across your ability scores (up to +2 in one or +1 to two).
              Selected: {totalASI}/2
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ABILITY_KEYS.map((key) => {
                const bonus = asiBonus[key] ?? 0
                const currentScore = character[key]
                const capped = currentScore >= 20
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => !capped && toggleASI(key)}
                    disabled={capped}
                    className={`px-3 py-2 rounded-lg border ${bonus > 0 ? 'bg-legacy-primary border-legacy-primary' : capped ? 'bg-legacy-overlay border-transparent opacity-40' : 'bg-legacy-overlay border-legacy-overlay'}`}
                  >
                    <Text className={`text-sm font-medium ${bonus > 0 ? 'text-legacy-base' : 'text-legacy-text'}`}>
                      {ABILITY_LABELS[key].slice(0, 3)} {currentScore}{bonus > 0 ? ` → ${currentScore + bonus}` : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View className="bg-legacy-surface rounded-xl p-4">
          <Text className="text-legacy-muted text-xs font-bold mb-2">SUMMARY</Text>
          <Text className="text-legacy-text">Level: {character.level} → {newLevel}</Text>
          <Text className="text-legacy-text mt-1">HP: {character.hp_max} → {character.hp_max + hpIncrease}</Text>
          <Text className="text-legacy-text mt-1">Proficiency Bonus: +{getProficiencyBonus(newLevel)}</Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${saving || !asiValid ? 'bg-legacy-overlay' : 'bg-legacy-primary'}`}
          onPress={handleLevelUp}
          disabled={saving || !asiValid}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${asiValid ? 'text-legacy-base' : 'text-legacy-muted'}`}>
                {asiValid ? `Confirm Level ${newLevel} →` : `Assign ${2 - totalASI} more ability points`}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
