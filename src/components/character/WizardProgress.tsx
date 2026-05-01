import { View } from 'react-native'

const STEPS = ['class', 'origin', 'ability-scores', 'personality', 'spells', 'details', 'review']

export function WizardProgress({ currentStep }: { currentStep: string }) {
  const idx = STEPS.indexOf(currentStep)
  return (
    <View className="flex-row px-4 pt-3 pb-2 gap-1 bg-base">
      {STEPS.map((step, i) => (
        <View
          key={step}
          className={`flex-1 h-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-overlay'}`}
        />
      ))}
    </View>
  )
}
