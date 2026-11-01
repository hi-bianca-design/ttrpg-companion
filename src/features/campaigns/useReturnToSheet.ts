import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import { useNavigation, useRouter } from 'expo-router'

/**
 * For campaign screens opened from a character sheet's Campaign tab (a cross-tab push): returns to that
 * tab, then resets the campaigns stack to its list. The stack was only borrowed, and left alone the
 * Campaigns tab would reopen on the stale join / detail screen. A plain back() is no use here: it lands
 * on the characters list, not the sheet.
 */
export function useReturnToSheet() {
  const router = useRouter()
  // This screen's own navigator: the campaigns stack.
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  return (characterId: string) => {
    router.navigate({ pathname: '/(app)/characters/[id]/campaign', params: { id: characterId } })
    navigation.reset({ index: 0, routes: [{ name: 'index' }] })
  }
}
