import { useEffect, useState } from 'react'
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import { CharacterWithRelations } from '@/modules/character/character.types'

export default function NotesTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCharacter(id)
      .then((data) => setNotes((data as CharacterWithRelations).notes ?? ''))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleBlur() {
    setSaving(true)
    try {
      await updateCharacter(id, { notes })
    } catch (e) {
      Alert.alert('Error saving notes', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-text font-bold text-lg">Notes</Text>
        {saving && <Text className="text-muted text-xs">Saving...</Text>}
      </View>
      <TextInput
        className="flex-1 bg-surface text-text rounded-xl p-4 text-base"
        multiline
        value={notes}
        onChangeText={setNotes}
        onBlur={handleBlur}
        placeholder="Write anything — tactics, lore, reminders..."
        placeholderTextColor="#6c7086"
        textAlignVertical="top"
      />
    </View>
  )
}
