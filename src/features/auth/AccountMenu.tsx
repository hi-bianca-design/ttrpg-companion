import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { UserCircle } from 'phosphor-react-native'
import { AdjustSheet } from '@/components/game/AdjustSheet'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { signOut } from '@/features/auth/auth.api'
import { useAuth } from '@/features/auth/useAuth'
import { toAppError } from '@/features/errors'
import { THEME_COLORS } from '@/lib/theme'

/**
 * Characters header account button → sheet with who is signed in → confirmed sign-out.
 * On success AuthProvider sees SIGNED_OUT, clears the query cache, and the root redirect sends the
 * app to login, so nothing here navigates.
 */
export function AccountMenu() {
  const { user } = useAuth()
  const router = useRouter()
  const colors = THEME_COLORS
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const username = typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : null

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

  // One View: on web the Sheet and Dialog roots render as elements, and as bare row children they would
  // each take the header row's gap, pushing the icon off the right gutter.
  return (
    <View>
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="Account"
        accessibilityHint="Shows who is signed in and lets you sign out"
        onPress={() => setSheetOpen(true)}
      >
        <UserCircle size={24} color={colors.foreground} />
      </Button>

      <AdjustSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Account"
        primaryLabel="Sign out"
        primaryVariant="outline"
        secondaryLabel="Close"
        secondaryVariant="ghost"
        onSecondary={() => setSheetOpen(false)}
        onPrimary={() => {
          // One overlay at a time: the sheet closes before the confirmation opens.
          setSheetOpen(false)
          setError(null)
          setConfirming(true)
        }}
      >
        <View className="gap-1">
          {username ? <Text variant="subhead">{username}</Text> : null}
          {user?.email ? <Text variant="body-sm" tone="muted">{user.email}</Text> : null}
        </View>
        <Button
          variant="outline"
          accessibilityLabel="Packs"
          onPress={() => {
            setSheetOpen(false)
            router.push('/(app)/shop')
          }}
        >
          <Text>Packs</Text>
        </Button>
      </AdjustSheet>

      <Dialog open={confirming} onOpenChange={(open) => { if (!open && !pending) setConfirming(false) }}>
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
