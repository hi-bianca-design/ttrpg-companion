import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getClasses } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBClass } from '@/modules/character/character.types'

export default function ClassStep() {
  const router = useRouter()
  const { draft, setDraft, resetDraft } = useCharacterStore()
  const [classes, setClasses] = useState<DBClass[]>([])
  const [selected, setSelected] = useState<DBClass | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resetDraft()
    getClasses().then(setClasses).finally(() => setLoading(false))
  }, [])

  function handleNext() {
    if (!selected) return
    setDraft({ class_id: selected.id, class_name: selected.name, hit_die: selected.hit_die })
    router.push('/(app)/characters/new/origin')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-text">Choose a Class</Text>
        <Text className="text-muted mt-1 text-sm">
          Your class defines your role in combat and how you solve problems.
        </Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isSelected = selected?.id === item.id
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row justify-between items-center">
                <Text className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {item.name}
                </Text>
                <Text className="text-muted text-sm">d{item.hit_die}</Text>
              </View>
              <Text className="text-muted text-sm mt-1">{item.description}</Text>
              <Text className="text-blue text-xs mt-2">
                Primary: {item.primary_abilities.join(', ')}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${selected ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text className={`font-semibold ${selected ? 'text-base' : 'text-muted'}`}>
            {selected ? `Choose ${selected.name} →` : 'Select a class to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
