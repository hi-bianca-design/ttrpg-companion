import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/modules/auth/useAuth'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBBackground, DBSpecies } from '@/modules/character/character.types'
import { WithCustom } from '@/modules/user_content/user_content.types'
import { getSpeciesAll, getBackgroundsAll } from '@/modules/user_content/user_content.service'

export default function OriginStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { setDraft } = useCharacterStore()
  const [backgrounds, setBackgrounds] = useState<WithCustom<DBBackground>[]>([])
  const [species, setSpecies] = useState<WithCustom<DBSpecies>[]>([])
  const [selectedBg, setSelectedBg] = useState<WithCustom<DBBackground> | null>(null)
  const [selectedSp, setSelectedSp] = useState<WithCustom<DBSpecies> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([getBackgroundsAll(user.id), getSpeciesAll(user.id)])
      .then(([bgs, sps]) => { setBackgrounds(bgs); setSpecies(sps) })
      .finally(() => setLoading(false))
  }, [user])

  function handleNext() {
    if (!selectedBg || !selectedSp) return
    setDraft({
      species_id: selectedSp.is_custom ? null : selectedSp.id,
      custom_species_id: selectedSp.is_custom ? selectedSp.id : null,
      background_id: selectedBg.is_custom ? null : selectedBg.id,
      custom_background_id: selectedBg.is_custom ? selectedBg.id : null,
    })
    router.push('/(app)/characters/new/ability-scores')
  }

  if (loading) {
    return <View className="flex-1 bg-base justify-center items-center"><ActivityIndicator color="#cba6f7" /></View>
  }

  const canProceed = !!selectedBg && !!selectedSp

  return (
    <View className="flex-1 bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-text">Determine Origin</Text>
        <Text className="text-muted mt-1 mb-6 text-sm">
          Your background and species shape who you were before adventuring.
        </Text>

        <Text className="text-lg font-bold text-text mb-3">Background</Text>
        {backgrounds.map((bg) => {
          const isSelected = selectedBg?.id === bg.id
          return (
            <TouchableOpacity
              key={bg.id}
              onPress={() => setSelectedBg(bg)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold flex-1 ${isSelected ? 'text-primary' : 'text-text'}`}>{bg.name}</Text>
                {bg.is_custom && (
                  <View className="bg-overlay px-2 py-0.5 rounded-full">
                    <Text className="text-muted text-xs">Custom</Text>
                  </View>
                )}
              </View>
              <Text className="text-muted text-sm mt-1">{bg.description}</Text>
              <Text className="text-green text-xs mt-1">Skills: {bg.skill_proficiencies.join(', ')}</Text>
            </TouchableOpacity>
          )
        })}

        <Text className="text-lg font-bold text-text mt-4 mb-3">Species</Text>
        {species.map((sp) => {
          const isSelected = selectedSp?.id === sp.id
          // sp.traits is stored as { traits: string[] } in both the SRD DB and the custom species adapter
          const traits = ((sp.traits as { traits?: string[] } | null)?.traits) ?? []
          return (
            <TouchableOpacity
              key={sp.id}
              onPress={() => setSelectedSp(sp)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className={`font-bold flex-1 ${isSelected ? 'text-primary' : 'text-text'}`}>{sp.name}</Text>
                {sp.is_custom && (
                  <View className="bg-overlay px-2 py-0.5 rounded-full">
                    <Text className="text-muted text-xs">Custom</Text>
                  </View>
                )}
              </View>
              <Text className="text-muted text-xs mt-1">Speed: {sp.speed} ft</Text>
              {traits.length > 0 && (
                <Text className="text-yellow text-xs mt-1">Traits: {traits.join(', ')}</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-base border-t border-overlay">
        <TouchableOpacity
          className={`rounded-xl py-3 items-center ${canProceed ? 'bg-primary' : 'bg-overlay'}`}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text className={`font-semibold ${canProceed ? 'text-base' : 'text-muted'}`}>
            {canProceed && selectedBg && selectedSp
              ? `${selectedBg.name} · ${selectedSp.name} →`
              : 'Select background and species'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
