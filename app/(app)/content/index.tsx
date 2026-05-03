import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { getUserContent, deleteUserContent } from '@/modules/user_content/user_content.service'
import { DBUserContent, ContentType, CONTENT_TYPE_LABELS } from '@/modules/user_content/user_content.types'

const CONTENT_TYPE_ORDER: ContentType[] = ['subclass', 'species', 'background', 'spell', 'feat', 'equipment']

export default function ContentScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<DBUserContent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserContent(user.id)
      setItems(data)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => {
    load()
    return () => {}
  }, [load]))

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserContent(id)
            setItems((prev) => prev.filter((i) => i.id !== id))
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
          }
        },
      },
    ])
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const grouped = CONTENT_TYPE_ORDER.reduce<Partial<Record<ContentType, DBUserContent[]>>>(
    (acc, type) => {
      const group = items.filter((i) => i.content_type === type)
      if (group.length > 0) acc[type] = group
      return acc
    },
    {}
  )

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">My Content</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg"
          onPress={() => router.push('/(app)/content/new')}
        >
          <Text className="text-base font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-muted text-center mb-4">No custom content yet.</Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl"
            onPress={() => router.push('/(app)/content/new')}
          >
            <Text className="text-base font-semibold">Add Your First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {(Object.entries(grouped) as [ContentType, DBUserContent[]][]).map(([type, group]) => (
            <View key={type} className="mb-6">
              <Text className="text-muted text-xs font-bold mb-2">{CONTENT_TYPE_LABELS[type].toUpperCase()}</Text>
              {group.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="bg-surface rounded-xl p-4 mb-2"
                  onPress={() => router.push(`/(app)/content/${item.id}`)}
                  onLongPress={() => confirmDelete(item.id, item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityHint="Tap to edit. Long press to delete."
                >
                  <Text className="text-text font-bold">{item.name}</Text>
                  {item.description && (
                    <Text className="text-muted text-sm mt-1" numberOfLines={2}>{item.description}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
