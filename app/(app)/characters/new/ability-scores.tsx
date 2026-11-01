import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { useCharacterStore } from '@/modules/character/character.store'
import { ABILITY_KEYS, ABILITY_LABELS, STANDARD_ARRAY, AbilityKey } from '@/modules/character/character.types'
import { getBackgroundsAll } from '@/modules/user_content/user_content.service'

export default function AbilityScoresStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, setDraft } = useCharacterStore()

  const [assignments, setAssignments] = useState<Record<AbilityKey, number | null>>(
    () => Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])) as Record<AbilityKey, number | null>
  )
  const [bgEligible, setBgEligible] = useState<string[]>([])
  const [bgBonusTwo, setBgBonusTwo] = useState<string | null>(null)
  const [bgBonusOne, setBgBonusOne] = useState<string | null>(null)

  useEffect(() => {
    const bgId = draft.background_id ?? draft.custom_background_id
    if (!bgId || !user) return
    getBackgroundsAll(user.id)
      .then((bgs) => {
        const bg = bgs.find((b) => b.id === bgId)
        if (bg) {
          const opts = (bg.ability_score_options as { options?: string[][] } | null)?.options?.[0] ?? []
          setBgEligible(opts)
        }
      })
      .catch(() => {})
  }, [draft.background_id, draft.custom_background_id, user])

  const usedValues = Object.values(assignments).filter((v) => v !== null) as number[]

  function assignValue(key: AbilityKey, value: number | null) {
    setAssignments((prev) => {
      const cleared = Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v === value ? null : v])
      ) as Record<AbilityKey, number | null>
      cleared[key] = value
      return cleared
    })
  }

  const allAssigned = ABILITY_KEYS.every((k) => assignments[k] !== null)
  const bgReady = bgEligible.length === 0 || (bgBonusTwo !== null && bgBonusOne !== null)
  const canProceed = allAssigned && bgReady

  function handleNext() {
    const scores = Object.fromEntries(
      ABILITY_KEYS.map((k) => [k, assignments[k] ?? 10])
    ) as Record<AbilityKey, number>
    setDraft({ ...scores, bg_bonus_two: bgBonusTwo, bg_bonus_one: bgBonusOne })
    router.push('/(app)/characters/new/personality')
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-legacy-text">Ability Scores</Text>
        <Text className="text-legacy-muted mt-1 mb-4 text-sm">
          Assign the Standard Array to your 6 abilities. Tap an ability to assign or change its value.
        </Text>

        <View className="flex-row flex-wrap gap-2 mb-6">
          {STANDARD_ARRAY.map((v) => {
            const isUsed = usedValues.includes(v)
            return (
              <View
                key={v}
                className={`px-3 py-1 rounded-lg ${isUsed ? 'bg-legacy-overlay opacity-40' : 'bg-legacy-surface border border-legacy-primary'}`}
              >
                <Text className={`font-bold ${isUsed ? 'text-legacy-muted' : 'text-legacy-primary'}`}>{v}</Text>
              </View>
            )
          })}
        </View>

        {ABILITY_KEYS.map((key) => {
          const assigned = assignments[key]
          const bgBonus = bgBonusTwo === key ? 2 : bgBonusOne === key ? 1 : 0
          return (
            <View key={key} className="flex-row items-center mb-3 gap-3">
              <View className="w-28">
                <Text className="text-legacy-text font-medium">{ABILITY_LABELS[key]}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <View className="flex-row gap-2">
                  {STANDARD_ARRAY.map((v) => {
                    const isThisSlot = assigned === v
                    const isAvailable = !usedValues.includes(v) || isThisSlot
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => isAvailable && assignValue(key, isThisSlot ? null : v)}
                        className={`w-9 h-9 rounded-lg items-center justify-center ${
                          isThisSlot ? 'bg-legacy-primary' : isAvailable ? 'bg-legacy-surface' : 'bg-legacy-overlay opacity-30'
                        }`}
                        disabled={!isAvailable}
                      >
                        <Text className={`font-bold text-sm ${isThisSlot ? 'text-legacy-base' : 'text-legacy-text'}`}>{v}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>
              {assigned !== null && (
                <Text className="text-legacy-primary font-bold w-8 text-center">
                  {assigned + bgBonus}
                </Text>
              )}
            </View>
          )
        })}

        {bgEligible.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-bold text-legacy-text mb-2">Background Bonus</Text>
            <Text className="text-legacy-muted text-sm mb-3">
              Your background grants +2 to one ability and +1 to another.
            </Text>

            <Text className="text-legacy-text mb-2 font-medium">Which ability gets +2?</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {bgEligible.map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    if (bgBonusOne === key) setBgBonusOne(null)
                    setBgBonusTwo(key)
                  }}
                  className={`px-3 py-2 rounded-lg border ${bgBonusTwo === key ? 'bg-legacy-primary border-legacy-primary' : 'bg-legacy-surface border-legacy-overlay'}`}
                >
                  <Text className={`font-medium ${bgBonusTwo === key ? 'text-legacy-base' : 'text-legacy-text'}`}>
                    {(ABILITY_KEYS as readonly string[]).includes(key) ? ABILITY_LABELS[key as AbilityKey] : key} +2
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-legacy-text mb-2 font-medium">Which ability gets +1?</Text>
            <View className="flex-row flex-wrap gap-2">
              {bgEligible.filter((k) => k !== bgBonusTwo).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setBgBonusOne(key)}
                  className={`px-3 py-2 rounded-lg border ${bgBonusOne === key ? 'bg-legacy-primary border-legacy-primary' : 'bg-legacy-surface border-legacy-overlay'}`}
                >
                  <Text className={`font-medium ${bgBonusOne === key ? 'text-legacy-base' : 'text-legacy-text'}`}>
                    {(ABILITY_KEYS as readonly string[]).includes(key) ? ABILITY_LABELS[key as AbilityKey] : key} +1
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canProceed ? 'bg-legacy-primary' : 'bg-legacy-overlay'}`}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text className={`font-semibold ${canProceed ? 'text-legacy-base' : 'text-legacy-muted'}`}>
            {canProceed ? 'Confirm Ability Scores →' : 'Assign all 6 scores to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
