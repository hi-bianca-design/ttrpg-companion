import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Sword } from 'phosphor-react-native'
import { CancelButton, EmptyState, NavRow, ScreenBackground } from '@/components/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { showToast } from '@/components/ui/toast'
import { CODE_LENGTH, parseInviteCode } from '@/features/campaigns/inviteLink'
import { OptionChips } from '@/features/campaigns/OptionChips'
import { useInvitePreview, useJoinCampaign } from '@/features/campaigns/campaigns.queries'
import { useReturnToSheet } from '@/features/campaigns/useReturnToSheet'
import { useCharacters } from '@/features/characters/characters.queries'
import { ERROR_COPY, toAppError } from '@/features/errors'

export default function JoinCampaignScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ characterId?: string; code?: string | string[] }>()
  const characters = useCharacters()
  const join = useJoinCampaign()
  const [code, setCode] = useState(() => parseInviteCode(params.code))
  const [characterId, setCharacterId] = useState<string | null>(params.characterId ?? null)
  const [error, setError] = useState<string | null>(null)
  const preview = useInvitePreview(code)

  useEffect(() => {
    if (params.characterId) setCharacterId(params.characterId)
  }, [params.characterId])

  useEffect(() => {
    const fromLink = parseInviteCode(params.code)
    if (fromLink) setCode(fromLink)
  }, [params.code])

  // Opened from a character sheet's Campaign tab: Cancel and a successful join return there.
  const fromSheet = params.characterId
  const backToSheet = useReturnToSheet()
  const cancel = () => (fromSheet ? backToSheet(fromSheet) : router.back())

  const list = characters.data ?? []

  // One character fits the campaign's system: choose it, so a scanned invite is one tap from joined.
  const previewSystem = preview.data?.system_id
  useEffect(() => {
    if (!previewSystem || characterId) return
    const fits = list.filter((c) => c.system_id === previewSystem)
    if (fits.length === 1) setCharacterId(fits[0].id)
  }, [previewSystem, characterId, characters.data])
  const chosen = list.find((c) => c.id === characterId)
  const canJoin = code.length === CODE_LENGTH && !!chosen && !join.isPending

  const submit = () => {
    if (!canJoin || !chosen) return
    setError(null)
    join.mutate(
      { code, characterId: chosen.id },
      {
        onSuccess: (campaignId) => {
          showToast(`${chosen.name} joined the campaign.`)
          if (fromSheet) backToSheet(fromSheet)
          else router.replace({ pathname: '/(app)/campaigns/[id]', params: { id: campaignId } })
        },
        onError: (e) => setError(toAppError(e).message),
      },
    )
  }

  return (
    <ScreenBackground scroll>
      <View className="gap-3">
        <NavRow>
          <CancelButton onPress={cancel} />
        </NavRow>
        <Text variant="title">{preview.data ? `Join ${preview.data.name}` : 'Join a campaign'}</Text>
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
        {!error && preview.error ? (
          // A lookup that failed for any other reason (offline) is not shown: the form still works.
          toAppError(preview.error).code === 'invalid_code' ? (
            <Text variant="caption" tone="destructive">{ERROR_COPY.invalid_code}</Text>
          ) : null
        ) : null}
      </View>

      <View className="gap-2">
        <Text variant="label">Character</Text>
        {characters.isLoading ? (
          <View className="h-11 rounded-sm bg-muted" accessibilityLabel="Loading characters" />
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
