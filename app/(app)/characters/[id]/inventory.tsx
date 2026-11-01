import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'
import { supabase } from '@/lib/supabase'

type InventoryRow = CharacterWithRelations['character_inventory'][number]

type SubTab = 'equipped' | 'backpack'

export default function InventoryTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [items, setItems] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('backpack')

  const load = useCallback(() => {
    getCharacter(id)
      .then((data) => setItems((data as CharacterWithRelations).character_inventory ?? []))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleEquipped(item: InventoryRow) {
    const { error } = await supabase
      .from('character_inventory')
      .update({ is_equipped: !item.is_equipped })
      .eq('id', item.id)
    if (error) { Alert.alert('Error', error.message); return }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i))
  }

  if (loading) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const equipped   = items.filter((i) => i.is_equipped)
  const backpack   = items.filter((i) => !i.is_equipped)
  const displayed  = subTab === 'equipped' ? equipped : backpack

  function getItemName(item: InventoryRow) {
    return item.equipment?.name
      ?? item.magic_item?.name
      ?? item.campaign_item?.name
      ?? item.custom_item?.name
      ?? 'Unknown Item'
  }

  function getItemCategory(item: InventoryRow) {
    if (item.equipment) return item.equipment.category ?? 'Gear'
    if (item.magic_item) return 'Magic Item'
    if (item.campaign_item) return 'Campaign Item'
    return 'Custom'
  }

  function renderItem(item: InventoryRow) {
    const name = getItemName(item)
    const category = getItemCategory(item)
    const isCustom = !!item.custom_content_id
    const isMagic = !!item.magic_item_id
    const isAttuned = item.is_attuned

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => toggleEquipped(item)}
        className={`rounded-xl p-3 mb-2 flex-row justify-between items-center ${
          item.is_equipped ? 'bg-legacy-surface border border-legacy-primary' : 'bg-legacy-surface border border-transparent'
        }`}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className={`font-medium ${item.is_equipped ? 'text-legacy-primary' : 'text-legacy-text'}`}>
              {name}
            </Text>
            {isCustom && (
              <View className="bg-legacy-overlay px-2 py-0.5 rounded-full">
                <Text className="text-legacy-muted text-xs">Custom</Text>
              </View>
            )}
            {isMagic && (
              <View className="bg-legacy-primary/20 px-2 py-0.5 rounded-full">
                <Text className="text-legacy-primary text-xs">Magic</Text>
              </View>
            )}
            {isAttuned && (
              <View className="bg-legacy-teal/20 px-2 py-0.5 rounded-full">
                <Text className="text-legacy-teal text-xs">Attuned</Text>
              </View>
            )}
          </View>
          <Text className="text-legacy-muted text-xs mt-0.5">
            {category} · qty: {item.quantity}
          </Text>
          {!!item.notes && (
            <Text className="text-legacy-muted text-xs mt-0.5 italic">{item.notes}</Text>
          )}
        </View>
        <View className={`w-5 h-5 rounded-full border-2 ml-3 ${item.is_equipped ? 'bg-legacy-primary border-legacy-primary' : 'border-legacy-overlay'}`} />
      </TouchableOpacity>
    )
  }

  return (
    <View className="flex-1 bg-legacy-base">
      {/* Sub-tab bar */}
      <View className="flex-row mx-4 mt-4 mb-3 bg-legacy-surface rounded-xl overflow-hidden">
        {(['equipped', 'backpack'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSubTab(t)}
            className={`flex-1 py-2 items-center ${subTab === t ? 'bg-legacy-primary' : ''}`}
          >
            <Text className={`font-medium text-sm ${subTab === t ? 'text-legacy-base' : 'text-legacy-muted'}`}>
              {t === 'equipped' ? `Equipped (${equipped.length})` : `Backpack (${backpack.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {displayed.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-legacy-muted text-sm">
              {subTab === 'equipped' ? 'Nothing equipped.' : 'Backpack is empty.'}
            </Text>
          </View>
        ) : (
          displayed.map(renderItem)
        )}
      </ScrollView>
    </View>
  )
}
