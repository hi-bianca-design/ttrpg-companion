import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showToast } from '@/components/ui/toast'
import type { CharacterFull } from '@/features/characters/characters.api'
import { useResourceMutation } from '@/features/characters/characters.queries'
import { ERROR_COPY } from '@/features/errors'
import { qk } from '@/lib/query-client'
import { adjustPool, applyPoolChange, setTemp } from '@/systems/resources'
import { getSystem } from '@/systems/registry'
import type { PoolValue } from '@/systems/types'

export type PlayerCombatHp = {
  damage: (n: number) => void
  heal: (n: number) => void
  temp: (n: number) => void
  undo: () => void
  canUndo: boolean
}

const samePool = (a: PoolValue, b: PoolValue) => a.current === b.current && (a.temp ?? 0) === (b.temp ?? 0)
type Party = CharacterFull[] | undefined

/**
 * A player's own hit points in combat. Same arithmetic and same write as the Character tab's HpSheet
 * (`adjustPool`/`setTemp` through `useResourceMutation`), so the two always agree, and it writes only
 * `character.id`: nothing here can reach another character. The live party cache is the source of truth
 * for the starting pool (the sheet's own cache may be stale and a write persists every resource), and is
 * updated at once because Realtime would otherwise be the first to show the change.
 */
export function usePlayerCombatHp(character: CharacterFull, campaignId: string): PlayerCombatHp {
  const qc = useQueryClient()
  const partyKey = qk.party(campaignId)
  const snapshot = useRef<[readonly unknown[], Party][]>([])
  const last = useRef<{ before: PoolValue; after: PoolValue } | null>(null)
  const [canUndo, setCanUndo] = useState(false)

  const forget = () => {
    last.current = null
    setCanUndo(false)
  }
  const mutation = useResourceMutation(character.id, {
    onError: (e) => {
      for (const [key, data] of snapshot.current) qc.setQueryData(key, data)
      forget()
      showToast(e instanceof Error ? e.message : ERROR_COPY.save_failed)
    },
  })

  const defs = getSystem(character.system_id).resources
  const live = (): CharacterFull =>
    qc.getQueriesData<Party>({ queryKey: partyKey }).flatMap(([, d]) => d ?? []).find((c) => c.id === character.id) ?? character

  const run = (change: (pool: PoolValue) => PoolValue, remember: boolean) => {
    const base = live()
    const before = base.resources.hp as PoolValue | undefined
    if (!before) return
    const next = applyPoolChange(base.resources, defs, 'hp', change)
    // Start from the live party data unless an earlier write is still in flight (its optimistic state is newer).
    if (qc.isMutating({ mutationKey: ['character-resources', character.id] }) === 0) {
      qc.setQueryData<CharacterFull>(qk.character(character.id), { ...base })
    }
    snapshot.current = qc.getQueriesData<Party>({ queryKey: partyKey })
    qc.setQueriesData<Party>({ queryKey: partyKey }, (old) => old?.map((c) => (c.id === character.id ? { ...c, resources: next } : c)))
    mutation.mutate({ applyAll: (resources) => applyPoolChange(resources, defs, 'hp', change) })
    if (remember) {
      last.current = { before, after: next.hp as PoolValue }
      setCanUndo(true)
    } else {
      forget()
    }
  }

  return {
    damage: (n) => run((p) => adjustPool(p, -n), true),
    heal: (n) => run((p) => adjustPool(p, n), true),
    temp: (n) => run((p) => setTemp(p, n), true),
    canUndo,
    undo: () => {
      const l = last.current
      if (!l) return
      const cur = live().resources.hp as PoolValue | undefined
      if (!cur || !samePool(cur, l.after)) {
        forget()
        showToast('HP changed since')
        return
      }
      run(() => l.before, false)
    },
  }
}
