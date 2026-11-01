import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

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

  const load = useCallback(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading || !character) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const strMod = getAbilityModifier(character.strength)
  const dexMod = getAbilityModifier(character.dexterity)

  const equippedWeapons = character.character_inventory.filter(
    (e) => e.is_equipped && e.equipment?.category?.toLowerCase() === 'weapon'
  )

  const spellsByLevel = character.character_spells.reduce<Record<number, typeof character.character_spells>>(
    (acc, s) => {
      const level = s.spell?.level ?? 0
      if (!acc[level]) acc[level] = []
      acc[level].push(s)
      return acc
    },
    {}
  )
  const spellLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)

  return (
    <ScrollView className="flex-1 bg-legacy-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {equippedWeapons.length > 0 && (
        <CollapsibleSection sectionKey={`${id}:weapons`} title="WEAPONS">
          {equippedWeapons.map((w) => {
            const attackBonus = profBonus + Math.max(strMod, dexMod)
            const name = w.equipment?.name ?? w.custom_item?.name ?? 'Weapon'
            return (
              <View key={w.id} className="bg-legacy-overlay rounded-xl p-3 mb-2">
                <Text className="text-legacy-text font-bold">{name}</Text>
                <Text className="text-legacy-muted text-sm mt-1">Attack: {formatModifier(attackBonus)}</Text>
              </View>
            )
          })}
        </CollapsibleSection>
      )}

      <CollapsibleSection sectionKey={`${id}:standard-actions`} title="ACTIONS">
        {STANDARD_ACTIONS.map((action) => (
          <View key={action.name} className="bg-legacy-overlay rounded-xl p-3 mb-2">
            <Text className="text-legacy-text font-bold">{action.name}</Text>
            <Text className="text-legacy-muted text-sm mt-1">{action.description}</Text>
          </View>
        ))}
      </CollapsibleSection>

      {spellLevels.length > 0 && (
        <CollapsibleSection sectionKey={`${id}:spells`} title="SPELLS">
          {spellLevels.map((level) => (
            <View key={level} className="mb-3">
              <Text className="text-legacy-muted text-xs font-bold mb-2">
                {level === 0 ? 'CANTRIPS' : `LEVEL ${level}`}
              </Text>
              {spellsByLevel[level].map((s) => {
                const name = s.spell?.name ?? 'Custom Spell'
                const school = s.spell?.school ?? ''
                return (
                  <View
                    key={s.id}
                    className={`bg-legacy-overlay rounded-xl p-3 mb-2 border ${s.is_prepared ? 'border-legacy-primary/40' : 'border-transparent'}`}
                  >
                    <View className="flex-row justify-between items-start">
                      <Text className="text-legacy-text font-medium flex-1">{name}</Text>
                      {s.is_prepared && (
                        <View className="bg-legacy-primary/20 px-2 py-0.5 rounded-full ml-2">
                          <Text className="text-legacy-primary text-xs">Prepared</Text>
                        </View>
                      )}
                    </View>
                    {!!school && <Text className="text-legacy-muted text-xs mt-1">{school}</Text>}
                  </View>
                )
              })}
            </View>
          ))}
        </CollapsibleSection>
      )}
    </ScrollView>
  )
}
