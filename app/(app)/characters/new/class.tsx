import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Minus, Plus } from 'phosphor-react-native'
import { getClasses } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBClass } from '@/modules/character/character.types'

export default function ClassStep() {
  const router = useRouter()
  const { draft, setDraft, resetDraft } = useCharacterStore()
  const [classes, setClasses] = useState<DBClass[]>([])
  const [selected, setSelected] = useState<DBClass | null>(null)
  const [level, setLevel] = useState(draft.starting_level ?? 1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resetDraft()
    getClasses().then(setClasses).finally(() => setLoading(false))
  }, [])

  function handleNext() {
    if (!selected) return
    setDraft({ class_id: selected.id, class_name: selected.name, hit_die: selected.hit_die, starting_level: level })
    router.push('/(app)/characters/new/origin')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-text">Choose a Class</Text>
        <Text className="text-muted mt-1 text-sm mb-4">
          Your class defines your role in combat and how you solve problems.
        </Text>

        {/* Level picker */}
        <View className="bg-surface rounded-2xl px-4 py-3 flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-text font-semibold text-sm">Starting Level</Text>
            <Text className="text-muted text-xs">Campaigns often start at level 1</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setLevel((l) => Math.max(1, l - 1))}
              className="w-8 h-8 rounded-full bg-overlay items-center justify-center"
              disabled={level <= 1}
            >
              <Minus size={16} color={level <= 1 ? '#45475a' : '#cdd6f4'} weight="bold" />
            </TouchableOpacity>
            <Text className="text-primary font-bold text-xl w-8 text-center">{level}</Text>
            <TouchableOpacity
              onPress={() => setLevel((l) => Math.min(20, l + 1))}
              className="w-8 h-8 rounded-full bg-overlay items-center justify-center"
              disabled={level >= 20}
            >
              <Plus size={16} color={level >= 20 ? '#45475a' : '#cdd6f4'} weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
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
            {selected ? `Choose ${selected.name} (Level ${level}) →` : 'Select a class to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
