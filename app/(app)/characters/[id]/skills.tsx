import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { getAbilityModifier, formatModifier, getProficiencyBonus } from '@/modules/character/character.utils'
import { CharacterWithRelations, AbilityKey } from '@/modules/character/character.types'

type Skill = { name: string; ability: AbilityKey; profKey: string }

// profKey is the lowercase identifier stored in background.skill_proficiencies
const SKILLS: Skill[] = [
  { name: 'Acrobatics',      ability: 'dexterity',     profKey: 'acrobatics' },
  { name: 'Animal Handling', ability: 'wisdom',        profKey: 'animal handling' },
  { name: 'Arcana',          ability: 'intelligence',  profKey: 'arcana' },
  { name: 'Athletics',       ability: 'strength',      profKey: 'athletics' },
  { name: 'Deception',       ability: 'charisma',      profKey: 'deception' },
  { name: 'History',         ability: 'intelligence',  profKey: 'history' },
  { name: 'Insight',         ability: 'wisdom',        profKey: 'insight' },
  { name: 'Intimidation',    ability: 'charisma',      profKey: 'intimidation' },
  { name: 'Investigation',   ability: 'intelligence',  profKey: 'investigation' },
  { name: 'Medicine',        ability: 'wisdom',        profKey: 'medicine' },
  { name: 'Nature',          ability: 'intelligence',  profKey: 'nature' },
  { name: 'Perception',      ability: 'wisdom',        profKey: 'perception' },
  { name: 'Performance',     ability: 'charisma',      profKey: 'performance' },
  { name: 'Persuasion',      ability: 'charisma',      profKey: 'persuasion' },
  { name: 'Religion',        ability: 'intelligence',  profKey: 'religion' },
  { name: 'Sleight of Hand', ability: 'dexterity',     profKey: 'sleight of hand' },
  { name: 'Stealth',         ability: 'dexterity',     profKey: 'stealth' },
  { name: 'Survival',        ability: 'wisdom',        profKey: 'survival' },
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

  // SRD backgrounds store skill_proficiencies as string[]; custom backgrounds store them in properties JSONB
  const bgSkills: string[] = character.background?.skill_proficiencies
    ?? (character.custom_background?.properties as { skill_proficiencies?: string[] } | null)?.skill_proficiencies
    ?? []
  const bgSkillsLower = bgSkills.map((s) => s.toLowerCase())

  const wisdomMod = getAbilityModifier(character.wisdom)
  const perceptionProficient = bgSkillsLower.includes('perception')
  const passivePerception = 10 + wisdomMod + (perceptionProficient ? profBonus : 0)

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center">
        <Text className="text-text font-medium">Passive Perception</Text>
        <Text className="text-primary font-bold text-lg">{passivePerception}</Text>
      </View>

      {SKILLS.map((skill) => {
        const abilityMod = getAbilityModifier(character[skill.ability])
        const isProficient = bgSkillsLower.includes(skill.profKey)
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
