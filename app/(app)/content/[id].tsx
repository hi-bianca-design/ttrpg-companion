import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { updateUserContent, deleteUserContent } from '@/modules/user_content/user_content.service'
import { getClasses } from '@/modules/srd/srd.service'
import { DBClass } from '@/modules/character/character.types'
import {
  DBUserContent,
  CONTENT_TYPE_LABELS,
  SubclassProperties,
  SpeciesProperties,
  BackgroundProperties,
  SpellProperties,
  FeatProperties,
  EquipmentProperties,
} from '@/modules/user_content/user_content.types'

export default function EditContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<DBUserContent | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [props, setProps] = useState<Record<string, unknown>>({})
  const [classes, setClasses] = useState<DBClass[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('user_content').select('*').eq('id', id).single(),
      getClasses(),
    ]).then(([{ data, error }, clsData]) => {
      if (error) { Alert.alert('Error', error.message); return }
      const entry = data as DBUserContent
      setItem(entry)
      setName(entry.name)
      setDescription(entry.description ?? '')
      setClasses(clsData)
      setProps(initPropsFromEntry(entry))
    }).catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  function setProp(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }))
  }

  function buildProperties(): Record<string, unknown> {
    switch (item?.content_type) {
      case 'subclass':
        return { class_id: props.class_id ?? '', features: props.features ?? '' }
      case 'species':
        return {
          speed: Number(props.speed ?? 30),
          traits: ((props.traits_text as string) ?? '').split('\n').map((t) => t.trim()).filter(Boolean),
        }
      case 'background':
        return {
          skill_proficiencies: ((props.skills_text as string) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          feature: props.feature ?? '',
        }
      case 'spell':
        return {
          level: Number(props.level ?? 0),
          school: props.school ?? '',
          casting_time: props.casting_time ?? 'Action',
          range: props.range ?? '30 ft',
          components: props.components ?? 'V, S',
          duration: props.duration ?? 'Instantaneous',
          classes: ((props.classes_text as string) ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean),
          is_ritual: Boolean(props.is_ritual),
          requires_concentration: Boolean(props.requires_concentration),
        }
      case 'feat':
        return { prerequisites: props.prerequisites ?? '', benefits: props.benefits ?? '' }
      case 'equipment':
        return { category: props.category ?? '', cost: props.cost ?? '', weight: props.weight ?? '' }
      default:
        return {}
    }
  }

  async function handleSave() {
    if (!item || !name.trim()) return
    setSaving(true)
    try {
      await updateUserContent(id, {
        name: name.trim(),
        description: description.trim() || null,
        properties: buildProperties(),
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    Alert.alert('Delete', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserContent(id)
            router.back()
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred')
          }
        },
      },
    ])
  }

  if (loading || !item) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-legacy-primary">← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete}>
            <Text className="text-legacy-red font-medium">Delete</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-bold text-legacy-text mb-1">
          Edit {CONTENT_TYPE_LABELS[item.content_type]}
        </Text>
        <Text className="text-legacy-muted text-sm mb-6">{item.content_type}</Text>

        <Text className="text-legacy-muted text-xs font-bold mb-1">NAME *</Text>
        <TextInput
          className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#6c7086"
        />

        <Text className="text-legacy-muted text-xs font-bold mb-1">DESCRIPTION</Text>
        <TextInput
          className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-6"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#6c7086"
        />

        {item.content_type === 'subclass' && (
          <>
            <Text className="text-legacy-muted text-xs font-bold mb-2">CLASS</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setProp('class_id', cls.id)}
                  className={`px-3 py-2 rounded-lg border ${props.class_id === cls.id ? 'bg-legacy-primary border-legacy-primary' : 'bg-legacy-surface border-legacy-overlay'}`}
                >
                  <Text className={`text-sm ${props.class_id === cls.id ? 'text-legacy-base font-bold' : 'text-legacy-text'}`}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-legacy-muted text-xs font-bold mb-1">FEATURES</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.features as string) ?? ''}
              onChangeText={(v) => setProp('features', v)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'species' && (
          <>
            <Text className="text-legacy-muted text-xs font-bold mb-1">SPEED (FT)</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={String(props.speed ?? '30')}
              onChangeText={(v) => setProp('speed', v)}
              keyboardType="number-pad"
              placeholderTextColor="#6c7086"
            />
            <Text className="text-legacy-muted text-xs font-bold mb-1">TRAITS (one per line)</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.traits_text as string) ?? ''}
              onChangeText={(v) => setProp('traits_text', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'background' && (
          <>
            <Text className="text-legacy-muted text-xs font-bold mb-1">SKILL PROFICIENCIES (comma-separated)</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.skills_text as string) ?? ''}
              onChangeText={(v) => setProp('skills_text', v)}
              placeholderTextColor="#6c7086"
            />
            <Text className="text-legacy-muted text-xs font-bold mb-1">BACKGROUND FEATURE</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.feature as string) ?? ''}
              onChangeText={(v) => setProp('feature', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'spell' && (
          <>
            <Text className="text-legacy-muted text-xs font-bold mb-2">LEVEL</Text>
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {[0,1,2,3,4,5,6,7,8,9].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setProp('level', lvl)}
                  className={`w-9 h-9 rounded-lg items-center justify-center ${props.level === lvl ? 'bg-legacy-primary' : 'bg-legacy-surface'}`}
                >
                  <Text className={`font-bold ${props.level === lvl ? 'text-legacy-base' : 'text-legacy-text'}`}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {[
              { label: 'SCHOOL', key: 'school' },
              { label: 'CASTING TIME', key: 'casting_time' },
              { label: 'RANGE', key: 'range' },
              { label: 'COMPONENTS', key: 'components' },
              { label: 'DURATION', key: 'duration' },
              { label: 'CLASSES (comma-separated)', key: 'classes_text' },
            ].map(({ label, key }) => (
              <View key={key} className="mb-4">
                <Text className="text-legacy-muted text-xs font-bold mb-1">{label}</Text>
                <TextInput
                  className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3"
                  value={(props[key] as string) ?? ''}
                  onChangeText={(v) => setProp(key, v)}
                  placeholderTextColor="#6c7086"
                />
              </View>
            ))}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-legacy-text">Ritual</Text>
              <Switch
                value={Boolean(props.is_ritual)}
                onValueChange={(v) => setProp('is_ritual', v)}
                trackColor={{ false: '#45475a', true: '#cba6f7' }}
                thumbColor="#cdd6f4"
              />
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-legacy-text">Concentration</Text>
              <Switch
                value={Boolean(props.requires_concentration)}
                onValueChange={(v) => setProp('requires_concentration', v)}
                trackColor={{ false: '#45475a', true: '#cba6f7' }}
                thumbColor="#cdd6f4"
              />
            </View>
          </>
        )}

        {item.content_type === 'feat' && (
          <>
            <Text className="text-legacy-muted text-xs font-bold mb-1">PREREQUISITES</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.prerequisites as string) ?? ''}
              onChangeText={(v) => setProp('prerequisites', v)}
              placeholderTextColor="#6c7086"
            />
            <Text className="text-legacy-muted text-xs font-bold mb-1">BENEFITS</Text>
            <TextInput
              className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3 mb-4"
              value={(props.benefits as string) ?? ''}
              onChangeText={(v) => setProp('benefits', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#6c7086"
            />
          </>
        )}

        {item.content_type === 'equipment' && (
          <>
            {['category', 'cost', 'weight'].map((key) => (
              <View key={key} className="mb-4">
                <Text className="text-legacy-muted text-xs font-bold mb-1">{key.toUpperCase()}</Text>
                <TextInput
                  className="bg-legacy-surface text-legacy-text rounded-xl px-4 py-3"
                  value={(props[key] as string) ?? ''}
                  onChangeText={(v) => setProp(key, v)}
                  placeholderTextColor="#6c7086"
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${name.trim() && !saving ? 'bg-legacy-primary' : 'bg-legacy-overlay'}`}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${name.trim() ? 'text-legacy-base' : 'text-legacy-muted'}`}>Save Changes →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

function initPropsFromEntry(entry: DBUserContent): Record<string, unknown> {
  switch (entry.content_type) {
    case 'subclass': {
      const p = entry.properties as SubclassProperties
      return { class_id: p.class_id ?? '', features: p.features ?? '' }
    }
    case 'species': {
      const p = entry.properties as SpeciesProperties
      return { speed: String(p.speed ?? 30), traits_text: (p.traits ?? []).join('\n') }
    }
    case 'background': {
      const p = entry.properties as BackgroundProperties
      return { skills_text: (p.skill_proficiencies ?? []).join(', '), feature: p.feature ?? '' }
    }
    case 'spell': {
      const p = entry.properties as SpellProperties
      return {
        level: p.level ?? 0,
        school: p.school ?? '',
        casting_time: p.casting_time ?? '',
        range: p.range ?? '',
        components: p.components ?? '',
        duration: p.duration ?? '',
        classes_text: (p.classes ?? []).join(', '),
        is_ritual: p.is_ritual ?? false,
        requires_concentration: p.requires_concentration ?? false,
      }
    }
    case 'feat': {
      const p = entry.properties as FeatProperties
      return { prerequisites: p.prerequisites ?? '', benefits: p.benefits ?? '' }
    }
    case 'equipment': {
      const p = entry.properties as EquipmentProperties
      return { category: p.category ?? '', cost: p.cost ?? '', weight: p.weight ?? '' }
    }
    default:
      return {}
  }
}
