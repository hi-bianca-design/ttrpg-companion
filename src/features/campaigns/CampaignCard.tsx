import { Pressable, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { systemName } from '@/systems/registry'
import type { CampaignSummary } from './campaigns.api'

type CampaignCardProps = {
  campaign: Pick<CampaignSummary, 'name' | 'description' | 'system_id'> & { member_count?: number }
  isGm: boolean
  onPress?: () => void
}

export function CampaignCard({ campaign, isGm, onPress }: CampaignCardProps) {
  const count = campaign.member_count
  const body = (
    <Card className="gap-3">
      <Text variant="subhead" numberOfLines={1}>{campaign.name}</Text>
      {campaign.description ? (
        <Text variant="body-sm" tone="muted" numberOfLines={2}>{campaign.description}</Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge variant={isGm ? 'accent' : 'default'}>{isGm ? 'GM' : 'Player'}</Badge>
        <Badge>{systemName(campaign.system_id)}</Badge>
        {count !== undefined ? <Badge>{count === 1 ? '1 member' : `${count} members`}</Badge> : null}
      </View>
    </Card>
  )
  if (!onPress) return body
  return (
    <Pressable role="button" accessibilityLabel={campaign.name} onPress={onPress}>
      {body}
    </Pressable>
  )
}
