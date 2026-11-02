import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { X } from 'phosphor-react-native'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { signOut } from '@/features/auth/auth.api'
import { useAuth } from '@/features/auth/useAuth'
import { toAppError } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'

type AccountDrawerProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * Bottom drawer opened from the Account tab: who is signed in, then a confirmed sign-out.
 * On success AuthProvider sees SIGNED_OUT, clears the query cache, and the root redirect sends the
 * app to login, so nothing here navigates.
 */
export function AccountDrawer({ open, onOpenChange }: AccountDrawerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const username = typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : null
  const initial = (username ?? user?.email ?? '?').trim().charAt(0).toUpperCase()

  const confirmSignOut = async () => {
    setError(null)
    setPending(true)
    try {
      await signOut()
    } catch (e) {
      setError(toAppError(e).message)
      setPending(false)
    }
  }

  // One View: on web the Sheet and Dialog roots render as elements, and as bare siblings they would
  // each take a gap from whatever row hosts the drawer.
  return (
    <View>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <View className="flex-row items-center justify-between">
            <SheetTitle>Account</SheetTitle>
            <Button variant="ghost" size="icon" accessibilityLabel="Close" onPress={() => onOpenChange(false)}>
              <X size={20} color={THEME_COLORS.foreground} />
            </Button>
          </View>
          <View className="flex-row items-center gap-4">
            <Avatar initial={initial} />
            <View className="flex-1 gap-1">
              {username ? <Text variant="subhead" numberOfLines={1}>{username}</Text> : null}
              {user?.email ? <Text variant="body-sm" tone="muted" numberOfLines={1}>{user.email}</Text> : null}
            </View>
          </View>
          <Button
            variant="outline"
            accessibilityLabel="Packs"
            onPress={() => {
              onOpenChange(false)
              router.push('/(app)/shop')
            }}
          >
            <Text>Packs</Text>
          </Button>
          <Button
            variant="outline"
            accessibilityLabel="Sign out"
            onPress={() => {
              // One overlay at a time: the drawer closes before the confirmation opens.
              onOpenChange(false)
              setError(null)
              setConfirming(true)
            }}
          >
            <Text>Sign out</Text>
          </Button>
        </SheetContent>
      </Sheet>

      <Dialog open={confirming} onOpenChange={(o) => { if (!o && !pending) setConfirming(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out of D&D Companion?</DialogTitle>
            <DialogDescription>Your characters and campaigns stay saved. Sign back in with your email and password.</DialogDescription>
          </DialogHeader>
          {error ? <Text variant="caption" tone="destructive">{error}</Text> : null}
          <DialogFooter>
            <Button variant="outline" accessibilityLabel="Stay signed in" disabled={pending} onPress={() => setConfirming(false)}>
              <Text>Stay signed in</Text>
            </Button>
            {/* Primary, not destructive: signing out loses nothing, everything stays on the server. */}
            <Button accessibilityLabel="Sign out" disabled={pending} onPress={confirmSignOut}>
              <Text>{pending ? 'Signing out…' : 'Sign out'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
