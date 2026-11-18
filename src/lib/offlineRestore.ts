import { useSyncExternalStore } from 'react'

/**
 * Whether the GM's persisted combat cache is still being read from device storage. A screen whose data
 * may come from that restore shows loading meanwhile, not its error state. Kept apart from `offline.ts`
 * so screens never load device storage just to read this flag.
 */
let restoring = false
const listeners = new Set<() => void>()

export function setOfflineRestoring(value: boolean): void {
  if (restoring === value) return
  restoring = value
  for (const l of listeners) l()
}

export function useOfflineRestoring(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => restoring,
    () => false,
  )
}
