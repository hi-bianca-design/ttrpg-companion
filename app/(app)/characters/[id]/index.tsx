import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getCharacter, updateCharacter } from '@/modules/character/character.service'
import {
  CharacterWithRelations, DBCharacter, ABILITY_KEYS, ABILITY_LABELS, AbilityKey,
} from '@/modules/character/character.types'
import {
  getAbilityModifier, formatModifier, getProficiencyBonus,
  getLevelFromXP, getXPForNextLevel, XP_THRESHOLDS,
} from '@/modules/character/character.utils'
import { HPBar } from '@/components/character/HPBar'
import { ConditionBadge } from '@/components/character/ConditionBadge'
import { SectionHeader } from '@/components/game/SectionHeader'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

const SAVING_THROW_PROFICIENCIES: Record<string, AbilityKey[]> = {
  Barbarian: ['strength', 'constitution'],
  Bard: ['dexterity', 'charisma'],
  Cleric: ['wisdom', 'charisma'],
  Druid: ['intelligence', 'wisdom'],
  Fighter: ['strength', 'constitution'],
  Monk: ['strength', 'dexterity'],
  Paladin: ['wisdom', 'charisma'],
  Ranger: ['strength', 'dexterity'],
  Rogue: ['dexterity', 'intelligence'],
  Sorcerer: ['constitution', 'charisma'],
  Warlock: ['wisdom', 'charisma'],
  Wizard: ['intelligence', 'wisdom'],
}

type SubTab = 'combat' | 'profile'

export default function CharacterTab() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('combat')
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const load = useCallback(() => {
    getCharacter(id)
      .then((data) => setCharacter(data as CharacterWithRelations))
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'An error occurred'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function applyDamage(amount: number) {
    if (!character) return
    const newHP = Math.max(0, character.hp_current - amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function applyHeal(amount: number) {
    if (!character) return
    const newHP = Math.min(character.hp_max, character.hp_current + amount)
    const updated = await updateCharacter(id, { hp_current: newHP }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, hp_current: updated.hp_current } : prev)
  }

  async function setTempHP(amount: number) {
    if (!character) return
    const updated = await updateCharacter(id, { temp_hp: amount }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, temp_hp: updated.temp_hp } : prev)
  }

  async function removeCondition(condition: string) {
    if (!character) return
    const newConditions = (character.conditions ?? []).filter((c) => c !== condition)
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
  }

  async function addCondition(condition: string) {
    if (!character || (character.conditions ?? []).includes(condition)) return
    const newConditions = [...(character.conditions ?? []), condition]
    const updated = await updateCharacter(id, { conditions: newConditions }) as DBCharacter
    setCharacter((prev) => prev ? { ...prev, conditions: updated.conditions } : prev)
    setConditionPickerOpen(false)
  }

  if (loading || !character) {
    return <View className="flex-1 bg-legacy-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const profBonus = getProficiencyBonus(character.level)
  const xp = (character as any).xp ?? 0
  const xpForNext = getXPForNextLevel(character.level)
  const xpMin = XP_THRESHOLDS[character.level - 1] ?? 0
  const xpProgress = xpForNext
    ? Math.min(1, (xp - xpMin) / (xpForNext - xpMin))
    : 1

  const savingThrowProfs = SAVING_THROW_PROFICIENCIES[character.class?.name ?? ''] ?? []
  const speciesName = character.species?.name ?? character.custom_species?.name ?? '—'
  const backgroundName = character.background?.name ?? character.custom_background?.name ?? '—'

  return (
    <View className="flex-1 bg-legacy-base">
      {/* XP bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-legacy-text font-bold text-lg">{character.name}</Text>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/characters/${id}/level-up`)}
            className="bg-legacy-surface px-3 py-1 rounded-lg"
          >
            <Text className="text-legacy-primary text-sm">Level {character.level}</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-legacy-muted text-xs mb-2">
          {character.class?.name ?? '—'} · {speciesName}
        </Text>
        <View className="h-2 bg-legacy-overlay rounded-full overflow-hidden">
          <View className="h-full bg-legacy-primary/70 rounded-full" style={{ width: `${xpProgress * 100}%` }} />
        </View>
        <Text className="text-legacy-muted text-xs mt-1">
          {xp.toLocaleString()} XP{xpForNext ? ` / ${xpForNext.toLocaleString()} to Level ${character.level + 1}` : ' (Max Level)'}
        </Text>
      </View>

      {/* Sub-tab bar */}
      <View className="flex-row mx-4 mb-3 bg-legacy-surface rounded-xl overflow-hidden">
        {(['combat', 'profile'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSubTab(t)}
            className={`flex-1 py-2 items-center ${subTab === t ? 'bg-legacy-primary' : ''}`}
          >
            <Text className={`font-medium text-sm ${subTab === t ? 'text-legacy-base' : 'text-legacy-muted'}`}>
              {t === 'combat' ? 'Combat' : 'Profile'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Combat sub-tab */}
      {subTab === 'combat' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <SectionHeader collapsible id={`${id}:hp`} title="HIT POINTS">
            <HPBar
              hpCurrent={character.hp_current}
              hpMax={character.hp_max}
              tempHP={character.temp_hp}
              onDamage={applyDamage}
              onHeal={applyHeal}
              onSetTempHP={setTempHP}
            />
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:combat-stats`} title="COMBAT STATS">
            <View className="flex-row gap-3">
              {[
                { label: 'AC', value: character.armor_class },
                { label: 'Initiative', value: formatModifier(getAbilityModifier(character.dexterity)) },
                { label: 'Speed', value: `${character.speed} ft` },
                { label: 'Prof', value: `+${profBonus}` },
              ].map(({ label, value }) => (
                <View key={label} className="flex-1 bg-legacy-overlay rounded-xl p-3 items-center">
                  <Text className="text-legacy-muted text-xs">{label}</Text>
                  <Text className="text-legacy-text font-bold text-lg">{value}</Text>
                </View>
              ))}
            </View>
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:conditions`} title="CONDITIONS">
            <View className="flex-row justify-end mb-2">
              <TouchableOpacity onPress={() => setConditionPickerOpen(true)}>
                <Text className="text-legacy-primary text-xs">+ Add</Text>
              </TouchableOpacity>
            </View>
            {(character.conditions ?? []).length === 0 ? (
              <Text className="text-legacy-muted text-xs">None</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {(character.conditions ?? []).map((c) => (
                  <ConditionBadge key={c} condition={c} onRemove={() => removeCondition(c)} />
                ))}
              </View>
            )}
          </SectionHeader>
        </ScrollView>
      )}

      {/* Profile sub-tab */}
      {subTab === 'profile' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {((character as any).illustration_profile_url || (character as any).illustration_full_url) && (
            <View className="flex-row gap-3 mb-3">
              {(character as any).illustration_profile_url && (
                <TouchableOpacity
                  className="flex-1 h-32 rounded-xl overflow-hidden"
                  onPress={() => setPreviewUrl((character as any).illustration_profile_url)}
                >
                  <Image
                    source={{ uri: (character as any).illustration_profile_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-1">
                    <Text className="text-white text-xs text-center">Portrait</Text>
                  </View>
                </TouchableOpacity>
              )}
              {(character as any).illustration_full_url && (
                <TouchableOpacity
                  className="flex-1 h-32 rounded-xl overflow-hidden"
                  onPress={() => setPreviewUrl((character as any).illustration_full_url)}
                >
                  <Image
                    source={{ uri: (character as any).illustration_full_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-1">
                    <Text className="text-white text-xs text-center">Full body</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <SectionHeader collapsible id={`${id}:character-info`} title="CHARACTER INFO">
            <Text className="text-legacy-text"><Text className="text-legacy-muted">Class: </Text>{character.class?.name ?? '—'}</Text>
            <Text className="text-legacy-text mt-1"><Text className="text-legacy-muted">Species: </Text>{speciesName}</Text>
            <Text className="text-legacy-text mt-1"><Text className="text-legacy-muted">Background: </Text>{backgroundName}</Text>
            <Text className="text-legacy-text mt-1"><Text className="text-legacy-muted">Alignment: </Text>{character.alignment ?? '—'}</Text>
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:ability-scores`} title="ABILITY SCORES">
            <View className="flex-row flex-wrap gap-2">
              {ABILITY_KEYS.map((key) => {
                const score = character[key]
                const mod = getAbilityModifier(score)
                return (
                  <View key={key} className="items-center bg-legacy-overlay rounded-xl px-3 py-2 flex-1 min-w-[80px]">
                    <Text className="text-legacy-muted text-xs">{ABILITY_LABELS[key].slice(0, 3).toUpperCase()}</Text>
                    <Text className="text-legacy-text font-bold text-xl">{score}</Text>
                    <Text className="text-legacy-primary text-sm">{formatModifier(mod)}</Text>
                  </View>
                )
              })}
            </View>
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:saving-throws`} title="SAVING THROWS">
            {ABILITY_KEYS.map((key) => {
              const mod = getAbilityModifier(character[key])
              const isProficient = savingThrowProfs.includes(key)
              const total = mod + (isProficient ? profBonus : 0)
              return (
                <View key={key} className="flex-row justify-between items-center py-1.5 border-b border-legacy-overlay/30">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-3 h-3 rounded-full border ${isProficient ? 'bg-legacy-primary border-legacy-primary' : 'border-legacy-overlay'}`} />
                    <Text className="text-legacy-text text-sm">{ABILITY_LABELS[key]}</Text>
                  </View>
                  <Text className={`text-sm font-medium ${isProficient ? 'text-legacy-primary' : 'text-legacy-muted'}`}>
                    {formatModifier(total)}
                  </Text>
                </View>
              )
            })}
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:personality`} title="PERSONALITY TRAITS">
            {(character as any).personality_trait
              ? <Text className="text-legacy-text text-sm">{(character as any).personality_trait}</Text>
              : <Text className="text-legacy-muted text-sm">None recorded</Text>}
          </SectionHeader>

          <SectionHeader collapsible id={`${id}:backstory`} title="BACKSTORY">
            {character.notes
              ? <Text className="text-legacy-text text-sm">{character.notes}</Text>
              : <Text className="text-legacy-muted text-sm">None recorded</Text>}
          </SectionHeader>
        </ScrollView>
      )}

      {/* Condition picker modal */}
      <Modal visible={conditionPickerOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-legacy-surface rounded-t-2xl p-4 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-legacy-text font-bold text-lg">Add Condition</Text>
              <TouchableOpacity onPress={() => setConditionPickerOpen(false)}>
                <Text className="text-legacy-muted">Cancel</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const active = (character.conditions ?? []).includes(c)
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => addCondition(c)}
                    disabled={active}
                    className={`px-3 py-2 rounded-full border ${active ? 'border-legacy-overlay bg-legacy-overlay opacity-40' : 'border-legacy-red bg-legacy-red/20'}`}
                  >
                    <Text className={`text-sm ${active ? 'text-legacy-muted' : 'text-legacy-red'}`}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen illustration preview */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <View className="flex-1 bg-black/90 items-center justify-center">
          <TouchableOpacity
            className="absolute top-12 right-6 z-10"
            onPress={() => setPreviewUrl(null)}
          >
            <Text className="text-white text-lg font-bold">✕ Close</Text>
          </TouchableOpacity>
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              className="w-[90%] h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  )
}
