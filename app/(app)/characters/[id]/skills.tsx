import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { CharacterWithRelations, AbilityKey } from '@/modules/character/character.types'

type Skill = { name: string; ability: AbilityKey }

const SKILLS: Skill[] = [
  { name: 'Acrobatics',      ability: 'dexterity' },
  { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana',          ability: 'intelligence' },
  { name: 'Athletics',       ability: 'strength' },
  { name: 'Deception',       ability: 'charisma' },
  { name: 'History',         ability: 'intelligence' },
  { name: 'Insight',         ability: 'wisdom' },
  { name: 'Intimidation',    ability: 'charisma' },
  { name: 'Investigation',   ability: 'intelligence' },
  { name: 'Medicine',        ability: 'wisdom' },
  { name: 'Nature',          ability: 'intelligence' },
  { name: 'Perception',      ability: 'wisdom' },
  { name: 'Performance',     ability: 'charisma' },
  { name: 'Persuasion',      ability: 'charisma' },
  { name: 'Religion',        ability: 'intelligence' },
  { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth',         ability: 'dexterity' },
  { name: 'Survival',        ability: 'wisdom' },
]

export default function SkillsTab() {
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
  const bgSkills: string[] = character.background?.skill_proficiencies ?? []

  const wisdomMod = getAbilityModifier(character.wisdom)
  const perceptionProficient = bgSkills.includes('perception')
  const passivePerception = 10 + wisdomMod + (perceptionProficient ? profBonus : 0)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center">
        <Text className="text-text font-medium">Passive Perception</Text>
        <Text className="text-primary font-bold text-lg">{passivePerception}</Text>
      </View>

      {SKILLS.map((skill) => {
        const abilityMod = getAbilityModifier(character[skill.ability])
        const isProficient = bgSkills.includes(skill.name.toLowerCase().replace(/ /g, '-'))
        const total = abilityMod + (isProficient ? profBonus : 0)
        return (
          <View key={skill.name} className="flex-row items-center py-3 border-b border-overlay">
            <View className={`w-3 h-3 rounded-full mr-3 ${isProficient ? 'bg-primary' : 'bg-overlay'}`} />
            <Text className="text-text flex-1">{skill.name}</Text>
            <Text className="text-muted text-xs mr-3">{skill.ability.slice(0, 3).toUpperCase()}</Text>
            <Text className={`font-bold w-8 text-right ${total >= 0 ? 'text-text' : 'text-red'}`}>
              {formatModifier(total)}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
