import { useEffect, useState, useMemo } from 'react'
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { MagnifyingGlass, Check } from 'phosphor-react-native'
import { useAuth } from '@/modules/auth/useAuth'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBSpell } from '@/modules/character/character.types'
import { WithCustom } from '@/modules/user_content/user_content.types'
import { getSpellsAll } from '@/modules/user_content/user_content.service'
import { getSpellLimits, getMaxSpellLevel, getAbilityModifier } from '@/modules/character/character.utils'

type SpellSection = { title: string; data: WithCustom<DBSpell>[]; isCantrips: boolean }

const SCHOOL_COLORS: Record<string, string> = {
  abjuration:    '#89b4fa',
  conjuration:   '#a6e3a1',
  divination:    '#f9e2af',
  enchantment:   '#f5c2e7',
  evocation:     '#f38ba8',
  illusion:      '#cba6f7',
  necromancy:    '#6c7086',
  transmutation: '#94e2d5',
}

export default function SpellsStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { draft, setDraft } = useCharacterStore()
  const [allSpells, setAllSpells] = useState<WithCustom<DBSpell>[]>([])
  const [selectedSrd, setSelectedSrd] = useState<Set<string>>(new Set(draft.selected_spell_ids))
  const [selectedCustom, setSelectedCustom] = useState<Set<string>>(new Set(draft.selected_custom_spell_ids))
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const level = draft.starting_level ?? 1
  const abilityMod = getAbilityModifier(
    draft.class_name === 'Wizard' ? draft.intelligence
    : draft.class_name === 'Sorcerer' ? draft.charisma
    : draft.class_name === 'Warlock' ? draft.charisma
    : draft.class_name === 'Bard' ? draft.charisma
    : draft.class_name === 'Paladin' ? draft.charisma
    : draft.class_name === 'Ranger' ? draft.wisdom
    : draft.wisdom // Cleric, Druid
  )
  const { maxCantrips, maxSpells } = getSpellLimits(draft.class_name ?? '', level, abilityMod)
  const maxSpellLevel = getMaxSpellLevel(draft.class_name ?? '', level)

  useEffect(() => {
    if (!draft.class_name) { router.replace('/(app)/characters/new/class'); return }
    if (!user) return
    getSpellsAll(user.id, draft.class_name).then(setAllSpells).finally(() => setLoading(false))
  }, [draft.class_name, user])

  const selectedCantrips = useMemo(() => {
    const cantripIds = new Set(allSpells.filter((s) => s.level === 0).map((s) => s.id))
    return [...selectedSrd, ...selectedCustom].filter((id) => cantripIds.has(id)).length
  }, [selectedSrd, selectedCustom, allSpells])

  const selectedLeveled = useMemo(() => {
    const leveledIds = new Set(allSpells.filter((s) => s.level > 0).map((s) => s.id))
    return [...selectedSrd, ...selectedCustom].filter((id) => leveledIds.has(id)).length
  }, [selectedSrd, selectedCustom, allSpells])

  function toggle(item: WithCustom<DBSpell>) {
    const isCantrip = item.level === 0
    const isSelected = item.is_custom ? selectedCustom.has(item.id) : selectedSrd.has(item.id)

    if (!isSelected) {
      if (isCantrip && selectedCantrips >= maxCantrips) return
      if (!isCantrip && selectedLeveled >= maxSpells) return
    }

    if (item.is_custom) {
      setSelectedCustom((prev) => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s })
    } else {
      setSelectedSrd((prev) => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s })
    }
  }

  function handleNext() {
    setDraft({ selected_spell_ids: Array.from(selectedSrd), selected_custom_spell_ids: Array.from(selectedCustom) })
    router.push('/(app)/characters/new/details')
  }

  const sections = useMemo<SpellSection[]>(() => {
    const accessible = allSpells.filter((s) => s.level === 0 || s.level <= maxSpellLevel)
    const filtered = query.trim()
      ? accessible.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      : accessible
    const byLevel: Record<number, WithCustom<DBSpell>[]> = {}
    filtered.forEach((s) => { byLevel[s.level] ??= []; byLevel[s.level].push(s) })
    return Object.entries(byLevel)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([lvl, data]) => ({
        title: lvl === '0' ? 'Cantrips' : `Level ${lvl} Spells`,
        data,
        isCantrips: lvl === '0',
      }))
  }, [allSpells, query, maxSpellLevel])

  if (loading) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" size="large" /></View>
  }

  return (
    <View className="flex-1 bg-legacy-base">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-legacy-text mb-1">Choose Spells</Text>
        <Text className="text-legacy-muted text-sm mb-3">
          Select starting spells for your Level {level} {draft.class_name}.
        </Text>

        {/* Limit indicators */}
        <View className="flex-row gap-2 mb-3">
          {maxCantrips > 0 && (
            <View className={`flex-1 rounded-xl px-3 py-2 ${selectedCantrips >= maxCantrips ? 'bg-legacy-primary/20 border border-legacy-primary' : 'bg-legacy-surface'}`}>
              <Text className="text-legacy-muted text-xs">Cantrips</Text>
              <Text className={`font-bold text-sm ${selectedCantrips >= maxCantrips ? 'text-legacy-primary' : 'text-legacy-text'}`}>
                {selectedCantrips} / {maxCantrips}
              </Text>
            </View>
          )}
          {maxSpells > 0 && (
            <View className={`flex-1 rounded-xl px-3 py-2 ${selectedLeveled >= maxSpells ? 'bg-legacy-primary/20 border border-legacy-primary' : 'bg-legacy-surface'}`}>
              <Text className="text-legacy-muted text-xs">Spells</Text>
              <Text className={`font-bold text-sm ${selectedLeveled >= maxSpells ? 'text-legacy-primary' : 'text-legacy-text'}`}>
                {selectedLeveled} / {maxSpells}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center bg-legacy-surface rounded-xl px-3 gap-2">
          <MagnifyingGlass size={18} color="#6c7086" />
          <TextInput
            className="flex-1 text-legacy-text py-3 text-sm"
            placeholder="Search spells..."
            placeholderTextColor="#6c7086"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const atLimit = section.isCantrips
            ? selectedCantrips >= maxCantrips
            : selectedLeveled >= maxSpells
          const limit = section.isCantrips ? maxCantrips : maxSpells
          return (
            <View className="flex-row items-center justify-between py-2 bg-legacy-base">
              <Text className="text-legacy-muted text-xs font-bold tracking-widest uppercase">{section.title}</Text>
              {limit > 0 && (
                <Text className={`text-xs font-bold ${atLimit ? 'text-legacy-primary' : 'text-legacy-muted'}`}>
                  {section.isCantrips ? `${selectedCantrips}/${maxCantrips}` : `${selectedLeveled}/${maxSpells}`}
                </Text>
              )}
            </View>
          )
        }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-legacy-muted text-sm">No spells match "{query}"</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = item.is_custom ? selectedCustom.has(item.id) : selectedSrd.has(item.id)
          const isCantrip = item.level === 0
          const atLimit = isCantrip ? selectedCantrips >= maxCantrips : selectedLeveled >= maxSpells
          const disabled = !isSelected && atLimit
          const schoolColor = SCHOOL_COLORS[item.school?.toLowerCase() ?? ''] ?? '#6c7086'
          return (
            <TouchableOpacity
              onPress={() => toggle(item)}
              activeOpacity={disabled ? 1 : 0.75}
              className="rounded-2xl mb-2 overflow-hidden"
              style={{
                borderWidth: 2,
                borderColor: isSelected ? '#cba6f7' : 'transparent',
                backgroundColor: disabled ? '#1e1e2e' : '#313244',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <View className="flex-row items-start p-3 gap-3">
                <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: schoolColor, borderRadius: 2 }} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className={`font-bold text-sm flex-shrink ${isSelected ? 'text-legacy-primary' : 'text-legacy-text'}`}>
                      {item.name}
                    </Text>
                    {item.is_custom && (
                      <View className="bg-legacy-overlay px-1.5 py-0.5 rounded-full">
                        <Text className="text-legacy-muted text-xs">Custom</Text>
                      </View>
                    )}
                    {item.is_ritual && (
                      <View className="bg-legacy-overlay px-1.5 py-0.5 rounded-full">
                        <Text className="text-legacy-yellow text-xs">Ritual</Text>
                      </View>
                    )}
                    {item.requires_concentration && (
                      <View className="bg-legacy-overlay px-1.5 py-0.5 rounded-full">
                        <Text className="text-legacy-blue text-xs">Conc.</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-legacy-muted text-xs mt-0.5">
                    {item.casting_time} · {item.range} · {item.school}
                  </Text>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-legacy-primary items-center justify-center mt-0.5 flex-shrink-0">
                    <Check size={13} color="#1e1e2e" weight="bold" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-legacy-base border-t border-legacy-overlay">
        <TouchableOpacity
          className="bg-legacy-primary rounded-2xl py-4 items-center"
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text className="text-legacy-base font-bold">
            {(selectedSrd.size + selectedCustom.size) > 0
              ? `Continue with ${selectedSrd.size + selectedCustom.size} spell${selectedSrd.size + selectedCustom.size !== 1 ? 's' : ''} →`
              : 'Skip Spells →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
