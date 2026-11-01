import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CancelButton, NavRow, ScreenBackground } from '@/components/game'
import { Text } from '@/components/ui/text'
import { ContentForm } from '@/features/content/ContentForm'
import { homebrewKinds, KindPicker } from '@/features/content/KindPicker'
import { getSystem, visibleSystems } from '@/systems/registry'
import type { SystemId } from '@/systems/types'

export default function NewContentScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ systemId?: string; kind?: string }>()
  const systemId = (visibleSystems().find((s) => s.id === params.systemId)?.id ?? visibleSystems()[0].id) as SystemId
  const validKind = homebrewKinds(systemId).some((k) => k.kind === params.kind) ? (params.kind as string) : null
  const [kind, setKind] = useState<string | null>(validKind)
  const def = kind ? getSystem(systemId).contentKinds[kind] : null

  return (
    <ScreenBackground scroll>
      <View className="gap-3">
        <NavRow>
          <CancelButton onPress={() => router.back()} />
        </NavRow>
        <Text variant="title">{def ? `New ${def.label.toLowerCase()}` : 'New homebrew'}</Text>
      </View>
      <KindPicker systemId={systemId} value={kind} onChange={setKind} />
      {kind ? (
        <ContentForm
          key={kind}
          systemId={systemId}
          kind={kind}
          onSaved={() => router.back()}
        />
      ) : (
        <Text variant="body-sm" tone="muted">Pick what you want to create.</Text>
      )}
    </ScreenBackground>
  )
}
