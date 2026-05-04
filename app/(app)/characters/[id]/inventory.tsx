import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { supabase } from '@/lib/supabase'
import { CharacterWithRelations } from '@/modules/character/character.types'

type EquipmentRow = CharacterWithRelations['character_equipment'][number]

export default function InventoryTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setItems((data as CharacterWithRelations).character_equipment ?? []))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  async function toggleEquipped(item: EquipmentRow) {
    const { error } = await supabase
      .from('character_equipment')
      .update({ is_equipped: !item.is_equipped })
      .eq('id', item.id)
    if (error) { Alert.alert('Error', error.message); return }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i))
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const equipped   = items.filter((i) => i.is_equipped)
  const unequipped = items.filter((i) => !i.is_equipped)

  function renderItem(item: EquipmentRow) {
    const itemName = item.equipment?.name ?? item.custom_equipment?.name ?? 'Unknown Item'
    const isCustom = !!item.custom_content_id
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => toggleEquipped(item)}
        className={`rounded-xl p-3 mb-2 flex-row justify-between items-center ${item.is_equipped ? 'bg-surface border border-primary' : 'bg-surface border border-transparent'}`}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`font-medium ${item.is_equipped ? 'text-primary' : 'text-text'}`}>
              {itemName}
            </Text>
            {isCustom && (
              <View className="bg-overlay px-2 py-0.5 rounded-full">
                <Text className="text-muted text-xs">Custom</Text>
              </View>
            )}
          </View>
          <Text className="text-muted text-xs mt-0.5">
            {item.equipment?.category ?? 'Custom'} · qty: {item.quantity}
          </Text>
        </View>
        <View className={`w-5 h-5 rounded-full border-2 ${item.is_equipped ? 'bg-primary border-primary' : 'border-overlay'}`} />
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {items.length === 0 ? (
        <Text className="text-muted text-center mt-8">No equipment yet.</Text>
      ) : (
        <>
          {equipped.length > 0 && (
            <>
              <Text className="text-muted text-xs font-bold mb-2">EQUIPPED</Text>
              {equipped.map(renderItem)}
            </>
          )}
          {unequipped.length > 0 && (
            <>
              <Text className="text-muted text-xs font-bold mt-4 mb-2">IN PACK</Text>
              {unequipped.map(renderItem)}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}
