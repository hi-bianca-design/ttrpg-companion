import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'

const STANDARD_ACTIONS = [
  { name: 'Attack',    description: 'Make one melee or ranged attack.' },
  { name: 'Dash',      description: 'Double your movement speed this turn.' },
  { name: 'Disengage', description: 'Move without provoking opportunity attacks.' },
  { name: 'Dodge',     description: 'Attacks against you have disadvantage until your next turn.' },
  { name: 'Help',      description: 'Give an ally advantage on their next ability check or attack.' },
  { name: 'Hide',      description: 'Make a Dexterity (Stealth) check to hide.' },
  { name: 'Ready',     description: 'Prepare a reaction to a trigger you describe.' },
  { name: 'Search',    description: 'Make a Wisdom (Perception) or Intelligence (Investigation) check.' },
]

export default function ActionsTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !character) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const strMod = getAbilityModifier(character.strength)
  const dexMod = getAbilityModifier(character.dexterity)

  const weapons = character.character_equipment.filter(
    (e) => e.is_equipped && e.equipment?.category?.toLowerCase() === 'weapon'
  )

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {weapons.length > 0 && (
        <View className="mb-6">
          <Text className="text-muted text-xs font-bold mb-2">WEAPONS</Text>
          {weapons.map((w) => {
            const attackBonus = profBonus + Math.max(strMod, dexMod)
            return (
              <View key={w.id} className="bg-surface rounded-xl p-4 mb-2">
                <Text className="text-text font-bold">{w.equipment?.name ?? 'Weapon'}</Text>
                <Text className="text-muted text-sm mt-1">Attack: {formatModifier(attackBonus)}</Text>
              </View>
            )
          })}
        </View>
      )}

      <Text className="text-muted text-xs font-bold mb-2">ACTIONS</Text>
      {STANDARD_ACTIONS.map((action) => (
        <View key={action.name} className="bg-surface rounded-xl p-3 mb-2">
          <Text className="text-text font-bold">{action.name}</Text>
          <Text className="text-muted text-sm mt-1">{action.description}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
