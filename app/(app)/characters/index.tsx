import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { getCharacters, deleteCharacter } from '@/modules/character/character.service'
import { useAuth } from '@/modules/auth/useAuth'

type CharacterSummary = {
  id: string
  name: string
  level: number
  class: { name: string } | null
  species: { name: string } | null
}

export default function CharactersScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const data = await getCharacters(user.id)
      setCharacters(data as CharacterSummary[])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete Character', `Delete ${name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCharacter(id)
            setCharacters((prev) => prev.filter((c) => c.id !== id))
          } catch (e: any) {
            Alert.alert('Error', e.message)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 bg-base justify-center items-center">
        <ActivityIndicator color="#cba6f7" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Characters</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg"
          onPress={() => router.push('/(app)/characters/new/class')}
        >
          <Text className="text-base font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {characters.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-muted text-center mb-4">No characters yet.</Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl"
            onPress={() => router.push('/(app)/characters/new/class')}
          >
            <Text className="text-base font-semibold">Create Your First Character</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={characters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-surface rounded-xl p-4 mb-3"
              onPress={() => router.push(`/(app)/characters/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
            >
              <Text className="text-lg font-bold text-text">{item.name}</Text>
              <Text className="text-muted mt-1 text-sm">
                Level {item.level} {item.class?.name ?? '—'} · {item.species?.name ?? '—'}
              </Text>
              <Text className="text-overlay text-xs mt-1">Long-press to delete</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
