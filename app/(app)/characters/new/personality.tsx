import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { SPELLCASTING_CLASSES } from '@/modules/character/character.utils'
import { ALIGNMENTS } from '@/modules/character/character.types'

export default function PersonalityStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [alignment, setAlignment] = useState(draft.alignment)
  const [personalityTrait, setPersonalityTrait] = useState(draft.personality_trait)
  const [ideal, setIdeal] = useState(draft.ideal)
  const [bond, setBond] = useState(draft.bond)
  const [flaw, setFlaw] = useState(draft.flaw)

  function handleNext() {
    setDraft({ alignment, personality_trait: personalityTrait, ideal, bond, flaw })
    const isSpellcaster = SPELLCASTING_CLASSES.includes(draft.class_name ?? '')
    router.push(isSpellcaster ? '/(app)/characters/new/spells' : '/(app)/characters/new/details')
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-legacy-text">Alignment & Personality</Text>
        <Text className="text-legacy-muted mt-1 mb-6 text-sm">
          Alignment and personality traits are optional but help roleplay your character.
        </Text>

        <Text className="text-legacy-text font-medium mb-2">Alignment</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {ALIGNMENTS.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAlignment(a === alignment ? '' : a)}
              className={`px-3 py-2 rounded-lg border ${alignment === a ? 'bg-legacy-primary border-legacy-primary' : 'bg-legacy-surface border-legacy-overlay'}`}
            >
              <Text className={`text-sm font-medium ${alignment === a ? 'text-legacy-base' : 'text-legacy-text'}`}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { label: 'Personality Trait', value: personalityTrait, setter: setPersonalityTrait, placeholder: 'e.g. I always have a plan for unexpected events.' },
          { label: 'Ideal', value: ideal, setter: setIdeal, placeholder: "e.g. Fairness — I never target people who can't fight back." },
          { label: 'Bond', value: bond, setter: setBond, placeholder: 'e.g. I will do anything to protect those I care about.' },
          { label: 'Flaw', value: flaw, setter: setFlaw, placeholder: 'e.g. My hatred of my enemies is blinding and unreasoning.' },
        ].map(({ label, value, setter, placeholder }) => (
          <View key={label} className="mb-4">
            <Text className="text-legacy-text font-medium mb-1">{label}</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 min-h-[56px]"
              placeholder={placeholder}
              placeholderTextColor="#6c7086"
              value={value}
              onChangeText={setter}
              multiline
            />
          </View>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className="bg-legacy-primary rounded-xl py-3 items-center"
          onPress={handleNext}
        >
          <Text className="text-legacy-base font-semibold">
            {SPELLCASTING_CLASSES.includes(draft.class_name ?? '')
              ? 'Choose Spells →'
              : 'Remaining Details →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
