import { AppState } from 'react-native'
import { focusManager } from '@tanstack/react-query'

/** Tells react-query when the app is backgrounded so interval refetches (the party's 60 s refresh) pause. Returns an uninstaller. */
export function installAppFocus(): () => void {
  const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'))
  return () => sub.remove()
}
