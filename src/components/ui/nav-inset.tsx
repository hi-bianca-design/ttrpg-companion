import { createContext, useContext } from 'react'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'

/** Content height of the floating bottom bar, and the gap that lifts it off the bottom edge. */
export const NAV_BAR_HEIGHT = 62
export const NAV_BAR_GAP = 12

/** True below a layout that shows the floating bar; screens read it to leave room for the bar. */
export const NavInsetContext = createContext(false)

/** Bottom space (px) a screen needs so its content is not hidden behind the floating bar. */
export function useNavInset(): number {
  const visible = useContext(NavInsetContext)
  // The raw context: unlike useSafeAreaInsets it does not throw outside a provider (screens render in tests without one).
  const insets = useContext(SafeAreaInsetsContext)
  return visible ? NAV_BAR_HEIGHT + NAV_BAR_GAP + (insets?.bottom ?? 0) : 0
}
