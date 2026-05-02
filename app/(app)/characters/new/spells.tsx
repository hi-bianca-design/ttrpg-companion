import { useEffect, useState } from 'react'
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useCharacterStore } from '@/modules/character/character.store'
import { getSpellsForClass } from '@/modules/srd/srd.service'
import { DBSpell } from '@/modules/character/character.types'

type SpellSection = { title: string; data: DBSpell[] }

export default function SpellsStep() {
  const router = useRouter()
  const { draft, setDraft } = useCharacterStore()
  const [sections, setSections] = useState<SpellSection[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(draft.selected_spell_ids))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!draft.class_name) { router.replace('/(app)/characters/new/details'); return }
    getSpellsForClass(draft.class_name).then((spells) => {
      const byLevel: Record<number, DBSpell[]> = {}
      spells.forEach((s) => { byLevel[s.level] ??= []; byLevel[s.level].push(s) })
      setSections(
        Object.entries(byLevel).map(([level, data]) => ({
          title: level === '0' ? 'Cantrips' : `Level ${level}`,
          data,
        }))
      )
    }).finally(() => setLoading(false))
  }, [draft.class_name])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleNext() {
    setDraft({ selected_spell_ids: Array.from(selected) })
    router.push('/(app)/characters/new/details')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  return (
    <View className="flex-1 bg-base">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-text">Choose Spells</Text>
        <Text className="text-muted mt-1 mb-1 text-sm">
          Select the spells your {draft.class_name} knows. You can change these later.
        </Text>
        <Text className="text-primary text-sm">{selected.size} selected</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderSectionHeader={({ section }) => (
          <Text className="text-muted text-xs font-bold py-2 bg-base">{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id)
          return (
            <TouchableOpacity
              onPress={() => toggle(item.id)}
              className={`rounded-xl p-3 mb-2 border ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row justify-between items-start">
                <Text className={`font-bold flex-1 mr-2 ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {item.name}
                </Text>
                <View className="flex-row gap-2">
                  {item.is_ritual && <Text className="text-yellow text-xs">R</Text>}
                  {item.requires_concentration && <Text className="text-red text-xs">C</Text>}
                </View>
              </View>
              <Text className="text-muted text-xs mt-1">
                {item.casting_time} · {item.range} · {item.school}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center"
          onPress={handleNext}
        >
          <Text className="text-base font-semibold">
            {selected.size > 0 ? `Continue with ${selected.size} spell${selected.size !== 1 ? 's' : ''} →` : 'Skip Spells →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
