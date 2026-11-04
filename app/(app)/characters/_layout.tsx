import { Stack } from 'expo-router'

// The list is the stack's root, so a sheet opened from Home or a deep link still has it underneath.
export const unstable_settings = { initialRouteName: 'index' }

export default function CharactersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
  )
}
