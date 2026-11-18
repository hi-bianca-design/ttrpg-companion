import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'

/** The connection state as the query library sees it (web: the browser's online and offline events). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  )
}
