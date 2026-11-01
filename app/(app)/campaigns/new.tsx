import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { OptionChips } from '@/features/campaigns/OptionChips'
import { useCreateCampaign } from '@/features/campaigns/campaigns.queries'
import { toAppError } from '@/features/errors'
import { visibleSystems } from '@/systems/registry'
import type { SystemId } from '@/systems/types'

export default function NewCampaignScreen() {
  const router = useRouter()
  const systems = visibleSystems()
  const create = useCreateCampaign()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemId, setSystemId] = useState<SystemId>(systems[0].id)
  const [error, setError] = useState<string | null>(null)
  const canCreate = name.trim().length > 0 && !create.isPending

  const submit = () => {
    if (!canCreate) return
    setError(null)
    create.mutate(
      { name: name.trim(), systemId, description: description.trim() || undefined },
      {
        onSuccess: (id) => router.replace({ pathname: '/(app)/campaigns/[id]', params: { id } }),
        onError: (e) => setError(toAppError(e).message),
      },
    )
  }

  return (
    <ScreenBackground scroll>
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="title">New campaign</Text>
        <Button size="sm" variant="outline" accessibilityLabel="Cancel" onPress={() => router.back()}>
          <Text>Cancel</Text>
        </Button>
      </View>

      <View className="gap-2">
        <Text variant="label">Name</Text>
        <Input accessibilityLabel="Name" value={name} onChangeText={setName} placeholder="The Lost Mine" />
      </View>

      <View className="gap-2">
        <Text variant="label">Game system</Text>
        <OptionChips
          label="System"
          options={systems.map((s) => ({ value: s.id, label: s.name }))}
          value={systemId}
          onChange={(id) => setSystemId(id as SystemId)}
        />
      </View>

      <View className="gap-2">
        <Text variant="label">Description</Text>
        <Input
          accessibilityLabel="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          multiline
          className="h-auto min-h-11 rounded-card py-3"
        />
      </View>

      {error ? <Text variant="caption" tone="destructive">{error}</Text> : null}
      <Button accessibilityLabel="Create campaign" disabled={!canCreate} onPress={submit}>
        <Text>{create.isPending ? 'Creating…' : 'Create campaign'}</Text>
      </Button>
    </ScreenBackground>
  )
}
