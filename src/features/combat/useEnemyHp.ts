import { useRef, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { ERROR_COPY } from '@/features/errors'
import type { HpMode } from './combat.api'
import { useApplyEnemyHp, useUndoEnemyHp } from './combat.queries'

export type EnemyHp = {
  apply: (ids: string[], mode: HpMode, amount: number) => Promise<void>
  undoFor: (entryId: string) => Promise<void>
  canUndo: (entryId: string) => boolean
  pending: boolean
}

const errorCopy = (e: unknown) => (e instanceof Error ? e.message : ERROR_COPY.save_failed)

/**
 * GM hit point changes on enemies. The server does the arithmetic and hands back a batch id; this hook
 * only remembers which batch last touched each row so Undo can name it (a fireball on four goblins is one
 * batch, one Undo). A tap while a call is in flight is dropped, so a double tap is one change. Errors
 * become the plain toast here and not at the caller, which a refetch may have unmounted by then.
 */
export function useEnemyHp(campaignId: string, combatId: string): EnemyHp {
  const applyHp = useApplyEnemyHp(campaignId, combatId)
  const undoHp = useUndoEnemyHp(campaignId, combatId)
  const [batches, setBatches] = useState<ReadonlyMap<string, string>>(new Map())
  const busy = useRef(false)
  const [pending, setPending] = useState(false)

  // State is async, so the ref is what actually stops a second synchronous tap.
  const exclusive = async (fn: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      await fn()
    } catch (e) {
      showToast(errorCopy(e))
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  const apply: EnemyHp['apply'] = (ids, mode, amount) =>
    exclusive(async () => {
      const batch = await applyHp.mutateAsync({ entryIds: ids, mode, amount })
      setBatches((prev) => {
        const next = new Map(prev)
        for (const id of ids) next.set(id, batch)
        return next
      })
    })

  const undoFor: EnemyHp['undoFor'] = (entryId) =>
    exclusive(async () => {
      const batch = batches.get(entryId)
      if (!batch) return
      const restored = await undoHp.mutateAsync({ batch })
      setBatches((prev) => new Map([...prev].filter(([, b]) => b !== batch)))
      if (restored === 0) showToast('HP changed since')
    })

  return { apply, undoFor, canUndo: (id) => batches.has(id), pending }
}
