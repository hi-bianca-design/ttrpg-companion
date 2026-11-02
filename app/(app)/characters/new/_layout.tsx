import { Stack } from 'expo-router'
import { DiscardDraftGuard } from '@/features/characters/builder/DiscardDraftGuard'

export default function WizardLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      <DiscardDraftGuard />
    </>
  )
}
