import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Sword } from 'phosphor-react-native'
import { EmptyState, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { OptionChips } from '@/features/campaigns/OptionChips'
import { useJoinCampaign } from '@/features/campaigns/campaigns.queries'
import { useCharacters } from '@/features/characters/characters.queries'
import { ERROR_COPY, toAppError } from '@/features/errors'

const CODE_LENGTH = 6

export default function JoinCampaignScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ characterId?: string }>()
  const characters = useCharacters()
  const join = useJoinCampaign()
  const [code, setCode] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(params.characterId ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.characterId) setCharacterId(params.characterId)
  }, [params.characterId])

  const list = characters.data ?? []
  const chosen = list.find((c) => c.id === characterId)
  const canJoin = code.length === CODE_LENGTH && !!chosen && !join.isPending

  const submit = () => {
    if (!canJoin || !chosen) return
    setError(null)
    join.mutate(
      { code, characterId: chosen.id },
      {
        onSuccess: (campaignId) => router.replace({ pathname: '/(app)/campaigns/[id]', params: { id: campaignId } }),
        onError: (e) => setError(toAppError(e).message),
      },
    )
  }

  return (
    <ScreenBackground scroll>
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="title">Join a campaign</Text>
        <Button size="sm" variant="outline" accessibilityLabel="Cancel" onPress={() => router.back()}>
          <Text>Cancel</Text>
        </Button>
      </View>

      <View className="gap-2">
        <Text variant="label">Invite code</Text>
        <Input
          accessibilityLabel="Invite code"
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)); setError(null) }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          placeholder="AB12CD"
        />
        {error ? <Text variant="caption" tone="destructive">{error}</Text> : null}
      </View>

      <View className="gap-2">
        <Text variant="label">Character</Text>
        {characters.isLoading ? (
          <View className="h-11 rounded-full bg-muted" accessibilityLabel="Loading characters" />
        ) : characters.isError ? (
          <View className="items-start gap-2">
            <Text variant="caption" tone="destructive">{ERROR_COPY.load_failed}</Text>
            <Button variant="outline" size="sm" onPress={() => characters.refetch()}>
              <Text>Try again</Text>
            </Button>
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Sword}
            title="No characters yet"
            body="Create a character to bring to the campaign."
            actionLabel="New character"
            onAction={() => router.push('/(app)/characters/new')}
          />
        ) : (
          <OptionChips
            label="Character"
            options={list.map((c) => ({ value: c.id, label: c.name }))}
            value={characterId}
            onChange={(id) => { setCharacterId(id); setError(null) }}
          />
        )}
      </View>

      <Button accessibilityLabel="Join" disabled={!canJoin} onPress={submit}>
        <Text>{join.isPending ? 'Joining…' : 'Join'}</Text>
      </Button>
    </ScreenBackground>
  )
}
