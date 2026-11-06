import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

type KeyEventLike = { key: string; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void }

/**
 * Runs `handler` when Cmd+K or Ctrl+K is pressed (web only; a no-op on native). Both modifiers work on
 * every platform, so `mod` needs no Mac detection. Calls preventDefault so the browser's own Ctrl+K
 * (focus the address bar in some browsers) does not also fire. `enabled=false` removes the listener.
 */
export function useHotkey(_combo: 'mod+k', handler: () => void, enabled: boolean): void {
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof document === 'undefined') return
    const onKeyDown = (e: KeyEventLike) => {
      if (e.key.toLowerCase() !== 'k' || !(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      latest.current()
    }
    const doc = document as unknown as { addEventListener: (t: string, l: (e: KeyEventLike) => void) => void; removeEventListener: (t: string, l: (e: KeyEventLike) => void) => void }
    doc.addEventListener('keydown', onKeyDown)
    return () => doc.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
