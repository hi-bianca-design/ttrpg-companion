import { Stack } from 'expo-router'

// The campaigns list is the stack's root, so a deep link or a cross-tab jump into a campaign
// (e.g. from a character sheet) still has the list underneath to go back to.
export const unstable_settings = { initialRouteName: 'index' }

export default function CampaignsLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
}
