import { useRef } from 'react'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import type { LevelUpPatch, NewCharacter, ResourceValue } from '@/systems/types'
import {
  addItem, createCharacter, deleteCharacter, getCharacter, levelUpCharacter, listCharacters, removeItem, updateCharacter, updateItem, updateResources,
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
    onSuccess: (_id, input) => {
      const work = [qc.invalidateQueries({ queryKey: qk.characters })]
      // A custom entry saved to the library is a new content row: refresh the Homebrew list and the pickers.
      if (input.custom?.some((c) => c.library)) work.push(qc.invalidateQueries({ queryKey: ['content'] }))
      return Promise.all(work)
    },
  })
}

export function useDeleteCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.character(id) })
      return qc.invalidateQueries({ queryKey: qk.characters })
    },
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

export function useLevelUp(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patch, input }: { patch: LevelUpPatch; input: Record<string, unknown> }) =>
      levelUpCharacter(id, patch, input),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: qk.character(id) }),
      qc.invalidateQueries({ queryKey: qk.characters }),
    ]),
  })
}

export type ItemMutationOptions = {
  /** Called for every failed item write (hook-level, so overlapping mutations all report). */
  onError?: (error: unknown) => void
}

function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

export function useAddItem(characterId: string, options: ItemMutationOptions = {}) {
  const qc = useQueryClient()
  const onErrorRef = useLatest(options.onError)
  return useMutation({
    onError: (e) => onErrorRef.current?.(e),
    mutationFn: ({ contentId, quantity }: { contentId: string; quantity: number }) => addItem(characterId, contentId, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

export function useUpdateItem(characterId: string, options: ItemMutationOptions = {}) {
  const qc = useQueryClient()
  const onErrorRef = useLatest(options.onError)
  return useMutation({
    mutationKey: ['character-items', characterId],
    onError: (e) => onErrorRef.current?.(e),
    mutationFn: ({ itemId, patch }: { itemId: string; patch: ItemPatch }) => updateItem(itemId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

/** Ids of items with an in-flight update, so controls can block overlapping edits of one item. */
export function usePendingItemIds(characterId: string): string[] {
  return useMutationState({
    filters: { mutationKey: ['character-items', characterId], status: 'pending' },
    select: (m) => (m.state.variables as { itemId: string }).itemId,
  })
}

export function useRemoveItem(characterId: string, options: ItemMutationOptions = {}) {
  const qc = useQueryClient()
  const onErrorRef = useLatest(options.onError)
  return useMutation({
    onError: (e) => onErrorRef.current?.(e),
    mutationFn: (itemId: string) => removeItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character(characterId) }),
  })
}

type Resources = Record<string, ResourceValue>
/** Edit one resource (`key` + `apply`), or several at once (`applyAll`, e.g. a rest) as a single write. */
export type ResourceChange =
  | { key: string; apply: (current: ResourceValue) => ResourceValue }
  | { applyAll: (current: Resources) => Resources }

export type ResourceMutationOptions = {
  /** Called for every failed write (after the optimistic update is rolled back), not just the latest mutate call. */
  onError?: (error: unknown) => void
}

/**
 * Optimistic resource edit. `apply` is an updater function (not a value) so rapid taps compose:
 * each onMutate folds its change into the latest cached state, and requests run serially and each
 * reads the latest cache when it actually starts, so it persists the cumulative resources. On error the cache is restored to the state before this change.
 */
export function useResourceMutation(characterId: string, options: ResourceMutationOptions = {}) {
  const qc = useQueryClient()
  // Hook-level (not per-mutate) so earlier in-flight failures also reach the caller.
  const onErrorRef = useRef(options.onError)
  onErrorRef.current = options.onError
  const key = qk.character(characterId)
  const mutationKey = ['character-resources', characterId] as const
  return useMutation({
    mutationKey,
    // Same scope => TanStack runs these mutations one at a time, so writes land in tap order.
    // onMutate (optimistic update) still runs immediately for every tap.
    scope: { id: `character-resources:${characterId}` },
    mutationFn: async (_change: ResourceChange) => {
      const latest = qc.getQueryData<CharacterFull>(key)
      if (!latest) return
      await updateResources(characterId, latest.resources)
    },
    onMutate: async (change: ResourceChange) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<CharacterFull>(key)
      qc.setQueryData<CharacterFull>(key, (old) => {
        if (!old) return old
        if ('applyAll' in change) return { ...old, resources: change.applyAll(old.resources) }
        const current = old.resources[change.key]
        return current ? { ...old, resources: { ...old.resources, [change.key]: change.apply(current) } } : old
      })
      return { previous }
    },
    onError: (err, _change, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
      onErrorRef.current?.(err)
    },
    onSettled: () => {
      // Only refetch once the last in-flight tap settles, so a refetch can't clobber later optimistic taps.
      if (qc.isMutating({ mutationKey }) <= 1) return qc.invalidateQueries({ queryKey: key })
    },
  })
}
