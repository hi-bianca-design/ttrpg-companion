import { View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { PackRow } from './packs.api'

type PackCardProps = { pack: PackRow; owned: boolean }

/**
 * One catalog row. There is no purchase flow yet, so a pack you don't own shows a disabled
 * "Coming soon" button rather than a live one.
 */
export function PackCard({ pack, owned }: PackCardProps) {
  return (
    <Card className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="subhead">{pack.name}</Text>
          {pack.artist_credit ? <Text variant="label">{`Art by ${pack.artist_credit}`}</Text> : null}
        </View>
        {owned ? <Badge variant="accent">Owned</Badge> : null}
      </View>
      {pack.description ? <Text variant="body-sm" tone="muted">{pack.description}</Text> : null}
      {owned ? null : (
        <Button variant="outline" disabled accessibilityLabel="Coming soon">
          <Text>Coming soon</Text>
        </Button>
      )}
    </Card>
  )
}
