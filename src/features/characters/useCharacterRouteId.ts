import { createContext, useContext } from 'react'
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router'

/**
 * Set by characters/[id]/_layout from its own `id` param. That value stays correct while
 * another route (e.g. campaigns/[id]) is focused on top, and it is available to tab screens
 * opened from the tab bar, whose own params are empty.
 */
export const CharacterRouteIdContext = createContext<string | undefined>(undefined)

/**
 * The character id for screens under characters/[id]/*. Order: layout context, the screen's
 * own param, then the global param. useGlobalSearchParams alone reports the *focused*
 * route's id, so while campaigns/[id] is on top the hidden sheet screens would see the
 * campaign id and fire failing character queries.
 */
export function useCharacterRouteId(): string {
  const fromLayout = useContext(CharacterRouteIdContext)
  const local = useLocalSearchParams<{ id?: string }>()
  const global = useGlobalSearchParams<{ id?: string }>()
  return (fromLayout ?? local.id ?? global.id) as string
}
