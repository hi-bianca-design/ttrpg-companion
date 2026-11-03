import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import type { HpMode } from './combat.api'
import { HpEntryBar } from './HpEntryBar'
import type { EnemyHp } from './useEnemyHp'

/**
 * One amount to every selected enemy ("a fireball on four goblins"), one request. The selection clears
 * once the server has applied it; a failure keeps it so the GM can tap again. Undo is on each affected row.
 */
export function BulkBar({ selectedIds, hp, onClear }: { selectedIds: string[]; hp: EnemyHp; onClear: () => void }) {
  const apply = (mode: HpMode) => async (n: number) => {
    if (await hp.apply(selectedIds, mode, n)) onClear()
  }
  return (
    <Card compact tone="accent" className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="subhead">{`${selectedIds.length} selected`}</Text>
        <Button variant="ghost" onPress={onClear}>
          <Text>Clear</Text>
        </Button>
      </View>
      <HpEntryBar
        label="Selected enemies"
        disabled={hp.pending}
        canUndo={false}
        onDamage={apply('damage')}
        onHeal={apply('heal')}
        onTemp={apply('temp')}
        onUndo={() => {}}
      />
    </Card>
  )
}
