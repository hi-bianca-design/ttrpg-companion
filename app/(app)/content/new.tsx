import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { createUserContent } from '@/modules/user_content/user_content.service'
import { ContentType, CONTENT_TYPE_LABELS } from '@/modules/user_content/user_content.types'
import { getClasses } from '@/modules/srd/srd.service'
import { DBClass } from '@/modules/character/character.types'

const CONTENT_TYPES: ContentType[] = ['subclass', 'species', 'background', 'spell', 'feat', 'equipment']

export default function NewContentScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [props, setProps] = useState<Record<string, unknown>>({})
  const [classes, setClasses] = useState<DBClass[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClasses().then(setClasses).catch(() => {})
  }, [])

  function setProp(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }))
  }

  function handleTypeSelect(type: ContentType) {
    setContentType(type)
    setProps({})
  }

  function buildProperties(): Record<string, unknown> {
    switch (contentType) {
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
    if (!user || !contentType || !name.trim()) return
    setSaving(true)
    try {
      await createUserContent(user.id, {
        content_type: contentType,
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

  const canSave = !!contentType && name.trim().length > 0

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-text mb-1">New Custom Entry</Text>
        <Text className="text-muted text-sm mb-6">Add content from books you own.</Text>

        <Text className="text-muted text-xs font-bold mb-2">TYPE</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => handleTypeSelect(type)}
              className={`px-3 py-2 rounded-lg border ${contentType === type ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
            >
              <Text className={`font-medium ${contentType === type ? 'text-base' : 'text-text'}`}>
                {CONTENT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {contentType && (
          <>
            <Text className="text-muted text-xs font-bold mb-1">NAME *</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
              value={name}
              onChangeText={setName}
              placeholder="Entry name"
              placeholderTextColor="#6c7086"
            />

            <Text className="text-muted text-xs font-bold mb-1">DESCRIPTION</Text>
            <TextInput
              className="bg-surface text-text rounded-xl px-4 py-3 mb-6"
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description"
              placeholderTextColor="#6c7086"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {contentType === 'subclass' && (
              <>
                <Text className="text-muted text-xs font-bold mb-2">CLASS</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {classes.map((cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => setProp('class_id', cls.id)}
                      className={`px-3 py-2 rounded-lg border ${props.class_id === cls.id ? 'bg-primary border-primary' : 'bg-surface border-overlay'}`}
                    >
                      <Text className={`text-sm ${props.class_id === cls.id ? 'text-base font-bold' : 'text-text'}`}>
                        {cls.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-muted text-xs font-bold mb-1">FEATURES</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.features as string) ?? ''}
                  onChangeText={(v) => setProp('features', v)}
                  placeholder="Describe the subclass features..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'species' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">SPEED (FT)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.speed as string) ?? '30'}
                  onChangeText={(v) => setProp('speed', v)}
                  keyboardType="number-pad"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">TRAITS (one per line)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.traits_text as string) ?? ''}
                  onChangeText={(v) => setProp('traits_text', v)}
                  placeholder={'Darkvision\nFey Ancestry'}
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'background' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">SKILL PROFICIENCIES (comma-separated)</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.skills_text as string) ?? ''}
                  onChangeText={(v) => setProp('skills_text', v)}
                  placeholder="Insight, History"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">BACKGROUND FEATURE</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.feature as string) ?? ''}
                  onChangeText={(v) => setProp('feature', v)}
                  placeholder="Describe the background feature..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'spell' && (
              <>
                <Text className="text-muted text-xs font-bold mb-2">LEVEL</Text>
                <View className="flex-row gap-2 mb-4 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setProp('level', lvl)}
                      className={`w-9 h-9 rounded-lg items-center justify-center ${props.level === lvl ? 'bg-primary' : 'bg-surface'}`}
                    >
                      <Text className={`font-bold ${props.level === lvl ? 'text-base' : 'text-text'}`}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[
                  { label: 'SCHOOL', key: 'school', placeholder: 'Evocation' },
                  { label: 'CASTING TIME', key: 'casting_time', placeholder: 'Action' },
                  { label: 'RANGE', key: 'range', placeholder: '30 ft' },
                  { label: 'COMPONENTS', key: 'components', placeholder: 'V, S' },
                  { label: 'DURATION', key: 'duration', placeholder: 'Instantaneous' },
                  { label: 'CLASSES (comma-separated)', key: 'classes_text', placeholder: 'wizard, sorcerer' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} className="mb-4">
                    <Text className="text-muted text-xs font-bold mb-1">{label}</Text>
                    <TextInput
                      className="bg-surface text-text rounded-xl px-4 py-3"
                      value={(props[key] as string) ?? ''}
                      onChangeText={(v) => setProp(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#6c7086"
                    />
                  </View>
                ))}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-text">Ritual</Text>
                  <Switch
                    value={Boolean(props.is_ritual)}
                    onValueChange={(v) => setProp('is_ritual', v)}
                    trackColor={{ false: '#45475a', true: '#cba6f7' }}
                    thumbColor="#cdd6f4"
                  />
                </View>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-text">Concentration</Text>
                  <Switch
                    value={Boolean(props.requires_concentration)}
                    onValueChange={(v) => setProp('requires_concentration', v)}
                    trackColor={{ false: '#45475a', true: '#cba6f7' }}
                    thumbColor="#cdd6f4"
                  />
                </View>
              </>
            )}

            {contentType === 'feat' && (
              <>
                <Text className="text-muted text-xs font-bold mb-1">PREREQUISITES</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.prerequisites as string) ?? ''}
                  onChangeText={(v) => setProp('prerequisites', v)}
                  placeholder="e.g. Strength 13 or higher"
                  placeholderTextColor="#6c7086"
                />
                <Text className="text-muted text-xs font-bold mb-1">BENEFITS</Text>
                <TextInput
                  className="bg-surface text-text rounded-xl px-4 py-3 mb-4"
                  value={(props.benefits as string) ?? ''}
                  onChangeText={(v) => setProp('benefits', v)}
                  placeholder="Describe the feat benefits..."
                  placeholderTextColor="#6c7086"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {contentType === 'equipment' && (
              <>
                {[
                  { label: 'CATEGORY', key: 'category', placeholder: 'Weapon' },
                  { label: 'COST',     key: 'cost',     placeholder: '25 gp' },
                  { label: 'WEIGHT',   key: 'weight',   placeholder: '4 lb' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} className="mb-4">
                    <Text className="text-muted text-xs font-bold mb-1">{label}</Text>
                    <TextInput
                      className="bg-surface text-text rounded-xl px-4 py-3"
                      value={(props[key] as string) ?? ''}
                      onChangeText={(v) => setProp(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#6c7086"
                    />
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canSave && !saving ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving
            ? <ActivityIndicator color="#cba6f7" />
            : <Text className={`font-semibold ${canSave ? 'text-base' : 'text-muted'}`}>Save Entry →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
