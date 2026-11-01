import { useState } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'

type RestKind = 'short' | 'long'

const COPY: Record<RestKind, { label: string; description: string }> = {
  short: { label: 'Short rest', description: 'Take a short rest? Only resources that recharge on a short rest are restored.' },
  long: { label: 'Long rest', description: 'Take a long rest? Hit points, spell slots and hit dice are restored.' },
}

/** Short (outline) and Long (primary) rest buttons; each confirms in a dialog before `onRest`. */
export function RestButtons({ onRest }: { onRest: (kind: RestKind) => void }) {
  const [pending, setPending] = useState<RestKind | null>(null)
  const copy = pending ? COPY[pending] : null

  return (
    <View className="flex-row gap-2">
      <Button variant="outline" className="flex-1" accessibilityLabel="Short rest" onPress={() => setPending('short')}>
        <Text>Short rest</Text>
      </Button>
      <Button className="flex-1" accessibilityLabel="Long rest" onPress={() => setPending('long')}>
        <Text>Long rest</Text>
      </Button>

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy?.label ?? ''}</DialogTitle>
            <DialogDescription>{copy?.description ?? ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" accessibilityLabel="Cancel" onPress={() => setPending(null)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              size="sm"
              accessibilityLabel={`Confirm ${copy?.label.toLowerCase() ?? 'rest'}`}
              onPress={() => {
                if (pending) onRest(pending)
                setPending(null)
              }}
            >
              <Text>{copy?.label ?? 'Rest'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
