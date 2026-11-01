import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import type { NewCharacter, ResourceValue } from '@/systems/types'
import {
  addItem, createCharacter, getCharacter, listCharacters, removeItem, updateCharacter, updateItem, updateResources,
  type CharacterFull, type CharacterPatch, type ItemPatch,
} from './characters.api'

export function useCharacters() {
  return useQuery({ queryKey: qk.characters, queryFn: listCharacters })
}

export function useCharacter(id: string | undefined) {
  return useQuery({ queryKey: qk.character(id ?? ''), queryFn: () => getCharacter(id!), enabled: !!id })
}

export function useCreateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewCharacter) => createCharacter(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.characters }),
  })
}

export function useUpdateCharacter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: CharacterPatch) => updateCharacter(id, patch),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: qk.character(id) }),
      qc.invalidateQueries({ queryKey: qk.characters }),
    ]),
  })
}

export function useAddItem(characterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contentId, quantity }: { contentId: string; quantity: number }) => addItem(characterId, contentId, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

export function useUpdateItem(characterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: ItemPatch }) => updateItem(itemId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

export function useRemoveItem(characterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => removeItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

export type ResourceChange = { key: string; apply: (current: ResourceValue) => ResourceValue }

/**
 * Optimistic resource edit. `apply` is an updater function (not a value) so rapid taps compose:
 * each onMutate folds its change into the latest cached state, and each request persists the
 * cumulative resources. On error the cache is restored to the state before this change.
 */
export function useResourceMutation(characterId: string) {
  const qc = useQueryClient()
  const key = qk.character(characterId)
  const mutationKey = ['character-resources', characterId] as const
  return useMutation({
    mutationKey,
    mutationFn: async (_change: ResourceChange) => {
      const latest = qc.getQueryData<CharacterFull>(key)
      if (!latest) return
      await updateResources(characterId, latest.resources)
    },
    onMutate: async ({ key: resourceKey, apply }: ResourceChange) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<CharacterFull>(key)
      qc.setQueryData<CharacterFull>(key, (old) => {
        const current = old?.resources[resourceKey]
        return old && current ? { ...old, resources: { ...old.resources, [resourceKey]: apply(current) } } : old
      })
      return { previous }
    },
    onError: (_err, _change, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => {
      // Only refetch once the last in-flight tap settles, so a refetch can't clobber later optimistic taps.
      if (qc.isMutating({ mutationKey }) <= 1) return qc.invalidateQueries({ queryKey: key })
    },
  })
}
