import { useEffect, useState } from 'react'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import type { NavigationAction } from '@react-navigation/native'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { isDraftDirty, useBuilderStore } from './builder.store'

/**
 * Mounted once in the wizard layout. Whenever the wizard as a whole is about to be removed (Back on
 * the first step, the iOS swipe, Android back) and the draft has choices, it holds the navigation
 * and asks "Discard <name>?". An untouched draft leaves without a prompt.
 */
export function DiscardDraftGuard() {
  const navigation = useNavigation()
  const systemId = useBuilderStore((s) => s.systemId)
  const draft = useBuilderStore((s) => s.draft)
  const exiting = useBuilderStore((s) => s.exiting)
  const exit = useBuilderStore((s) => s.exit)
  const reset = useBuilderStore((s) => s.reset)
  const [blocked, setBlocked] = useState<NavigationAction | null>(null)
  const [discarded, setDiscarded] = useState<NavigationAction | null>(null)

  usePreventRemove(isDraftDirty(systemId, draft) && !exiting, ({ data }) => setBlocked(data.action))

  // Replay the held action after the re-render that lifted the guard, then clear the draft. The step
  // screens are still mounted while they animate out; `exiting` keeps them blank instead of redirecting.
  useEffect(() => {
    if (!discarded) return
    navigation.dispatch(discarded)
    reset()
  }, [discarded])

  const name = typeof draft.name === 'string' && draft.name.trim() ? draft.name.trim() : 'this character'

  return (
    <Dialog open={blocked !== null} onOpenChange={(open) => { if (!open) setBlocked(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Discard ${name}?`}</DialogTitle>
          <DialogDescription>The choices you’ve made so far won’t be saved.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" accessibilityLabel="Keep editing" onPress={() => setBlocked(null)}>
            <Text>Keep editing</Text>
          </Button>
          <Button
            variant="destructive"
            accessibilityLabel="Discard"
            onPress={() => {
              exit()
              setDiscarded(blocked)
              setBlocked(null)
            }}
          >
            <Text>Discard</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
