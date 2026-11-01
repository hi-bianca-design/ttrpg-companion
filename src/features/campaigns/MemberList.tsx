import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { CampaignMember } from './campaigns.api'

export function MemberList({ members }: { members: CampaignMember[] }) {
  if (members.length === 0) return <Text variant="body-sm" tone="muted">No members yet.</Text>
  return (
    <View className="gap-2">
      {members.map((m) => (
        <Card key={m.user_id} compact className="gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="subhead" numberOfLines={1} className="flex-1">{m.username ?? 'Unknown player'}</Text>
            <View className="flex-row gap-1">
              <Badge variant={m.role === 'gm' ? 'accent' : 'default'}>{m.role === 'gm' ? 'GM' : 'Player'}</Badge>
              <Badge>{m.status === 'active' ? 'Active' : 'Invited'}</Badge>
            </View>
          </View>
          {m.character_name ? <Text variant="body-sm" tone="muted">{m.character_name}</Text> : null}
        </Card>
      ))}
    </View>
  )
}
