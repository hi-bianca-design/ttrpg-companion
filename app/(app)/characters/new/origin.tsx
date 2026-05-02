import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getBackgrounds, getSpecies } from '@/modules/srd/srd.service'
import { useCharacterStore } from '@/modules/character/character.store'
import { DBBackground, DBSpecies } from '@/modules/character/character.types'

export default function OriginStep() {
  const router = useRouter()
  const { setDraft } = useCharacterStore()
  const [backgrounds, setBackgrounds] = useState<DBBackground[]>([])
  const [species, setSpecies] = useState<DBSpecies[]>([])
  const [selectedBg, setSelectedBg] = useState<DBBackground | null>(null)
  const [selectedSp, setSelectedSp] = useState<DBSpecies | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBackgrounds(), getSpecies()])
      .then(([bgs, sps]) => { setBackgrounds(bgs); setSpecies(sps) })
      .finally(() => setLoading(false))
  }, [])

  function handleNext() {
    if (!selectedBg || !selectedSp) return
    setDraft({ background_id: selectedBg.id, species_id: selectedSp.id })
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
              <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>{bg.name}</Text>
              <Text className="text-muted text-sm mt-1">{bg.description}</Text>
              <Text className="text-green text-xs mt-1">Skills: {bg.skill_proficiencies.join(', ')}</Text>
            </TouchableOpacity>
          )
        })}

        <Text className="text-lg font-bold text-text mt-4 mb-3">Species</Text>
        {species.map((sp) => {
          const isSelected = selectedSp?.id === sp.id
          const traits = ((sp.traits as any)?.traits as string[]) ?? []
          return (
            <TouchableOpacity
              key={sp.id}
              onPress={() => setSelectedSp(sp)}
              className={`rounded-xl p-4 mb-3 border-2 ${isSelected ? 'bg-surface border-primary' : 'bg-surface border-transparent'}`}
            >
              <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>{sp.name}</Text>
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
            {canProceed ? `${selectedBg!.name} · ${selectedSp!.name} →` : 'Select background and species'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
