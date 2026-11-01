import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import type { SystemId } from '@/systems/types'
import { createCampaign, getCampaign, getCharacterCampaign, joinCampaign, listMyCampaigns } from './campaigns.api'

export function useCampaigns() {
  return useQuery({ queryKey: qk.campaigns, queryFn: listMyCampaigns })
}

export function useCampaign(id: string | undefined) {
  return useQuery({ queryKey: qk.campaign(id ?? ''), queryFn: () => getCampaign(id!), enabled: !!id })
}

export function useCharacterCampaign(characterId: string | undefined) {
  return useQuery({
    queryKey: ['character-campaign', characterId ?? ''] as const,
    queryFn: () => getCharacterCampaign(characterId!),
    enabled: !!characterId,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; systemId: SystemId; description?: string }) => createCampaign(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.campaigns }),
  })
}

export function useJoinCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, characterId }: { code: string; characterId: string }) => joinCampaign(code, characterId),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: qk.campaigns }),
      qc.invalidateQueries({ queryKey: qk.characters }),
    ]),
  })
}
