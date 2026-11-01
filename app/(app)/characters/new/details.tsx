import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'

export default function DetailsStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [name, setName] = useState(draft.name)
  const [appearance, setAppearance] = useState(draft.appearance)
  const [backstory, setBackstory] = useState(draft.backstory)

  function handleNext() {
    if (!name.trim()) return
    setDraft({ name: name.trim(), appearance, backstory })
    router.push('/(app)/characters/new/review')
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-legacy-text">Remaining Details</Text>
        <Text className="text-legacy-muted mt-1 mb-6 text-sm">
          Give your character a name and any finishing touches.
        </Text>

        <Text className="text-legacy-text font-medium mb-1">Character Name <Text className="text-legacy-red">*</Text></Text>
        <TextInput
          className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
          placeholder="e.g. Aria Stormwind"
          placeholderTextColor="#6c7086"
          value={name}
          onChangeText={setName}
        />

        <Text className="text-legacy-text font-medium mb-1">Appearance</Text>
        <TextInput
          className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4 min-h-[80px]"
          placeholder="Describe how your character looks..."
          placeholderTextColor="#6c7086"
          value={appearance}
          onChangeText={setAppearance}
          multiline
        />

        <Text className="text-legacy-text font-medium mb-1">Backstory</Text>
        <TextInput
          className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4 min-h-[120px]"
          placeholder="What shaped your character before they became an adventurer?"
          placeholderTextColor="#6c7086"
          value={backstory}
          onChangeText={setBackstory}
          multiline
        />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${name.trim() ? 'bg-legacy-primary' : 'bg-legacy-overlay'}`}
          onPress={handleNext}
          disabled={!name.trim()}
        >
          <Text className={`font-semibold ${name.trim() ? 'text-legacy-base' : 'text-legacy-muted'}`}>
            {name.trim() ? 'Review Character →' : 'Enter a name to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
