import { View, Text } from 'react-native'
import { Sword } from 'phosphor-react-native'

export default function CampaignTab() {
  return (
    <View className="flex-1 bg-legacy-base items-center justify-center px-8">
      <Sword size={48} color="#6c7086" weight="duotone" />
      <Text className="text-legacy-text font-bold text-xl mt-4 mb-2">No Campaign Yet</Text>
      <Text className="text-legacy-muted text-sm text-center">
        Campaign tracking is coming soon. You'll be able to log sessions, track story notes, and manage party members here.
      </Text>
    </View>
  )
}
