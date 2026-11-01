import { ScreenBackground } from '@/components/game'
import { Text } from '@/components/ui/text'

// Placeholder; the campaigns list lands in Task 19.
export default function CampaignsIndex() {
  return (
    <ScreenBackground>
      <Text variant="display">Campaigns</Text>
      <Text variant="body-sm" tone="muted">Your campaigns will show up here.</Text>
    </ScreenBackground>
  )
}
