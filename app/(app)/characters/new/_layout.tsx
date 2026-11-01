import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WizardProgress } from '@/components/character/WizardProgress'

export default function WizardLayout() {
  const segments = useSegments()
  const currentStep = segments[segments.length - 1] ?? 'class'

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <WizardProgress currentStep={currentStep} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </SafeAreaView>
  )
}
