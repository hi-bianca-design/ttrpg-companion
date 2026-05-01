import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { WizardProgress } from '@/components/character/WizardProgress'

export default function WizardLayout() {
  const segments = useSegments()
  const currentStep = segments[segments.length - 1] ?? 'class'

  return (
    <View className="flex-1 bg-base">
      <WizardProgress currentStep={currentStep} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </View>
  )
}
