import { useEffect, useRef, useState } from 'react'
import { Platform, Share, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy, ShareNetwork } from 'phosphor-react-native'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'
import { buildInviteLink, inviteShareMessage } from '@/features/campaigns/inviteLink'
import { THEME_COLORS } from '@/lib/theme'

const QR_SIZE = 176

const canWebShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

type InviteSheetProps = { code: string; open: boolean; onOpenChange: (open: boolean) => void }

export function InviteSheet({ code, open, onOpenChange }: InviteSheetProps) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const colors = THEME_COLORS
  useEffect(() => () => clearTimeout(timer.current), [])

  const link = buildInviteLink(code)
  const message = inviteShareMessage(code, link)
  const showShare = Platform.OS !== 'web' || canWebShare()

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await Clipboard.setStringAsync(code)
      setFailed(false)
      setCopied(true)
    } catch {
      // Some browsers deny clipboard access; the code stays selectable.
      setCopied(false)
      setFailed(true)
    }
    timer.current = setTimeout(() => { setCopied(false); setFailed(false) }, 2000)
  }

  const share = async () => {
    try {
      if (Platform.OS === 'web') await navigator.share({ text: message })
      else await Share.share({ message })
    } catch {
      // Cancelling the share sheet rejects; nothing to report.
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invite players</SheetTitle>
        </SheetHeader>
        {link ? (
          <View accessibilityLabel="QR code to join the campaign" className="self-center rounded-sm bg-foreground p-4">
            <QRCode value={link} size={QR_SIZE} fgColor={colors.ink} bgColor={colors.foreground} />
          </View>
        ) : null}
        <View className="items-center gap-1">
          <Text variant="label">Invite code</Text>
          <Text variant="stat" selectable className="font-plex">{code}</Text>
        </View>
        <View className="gap-2">
          <Button variant="outline" accessibilityLabel={copied ? 'Copied' : 'Copy invite code'} onPress={copy}>
            {copied ? <Check size={16} color={colors.accentForeground} weight="bold" /> : <Copy size={16} color={colors.accentForeground} />}
            <Text>{copied ? 'Copied' : 'Copy'}</Text>
          </Button>
          {showShare ? (
            <Button accessibilityLabel="Share invite" onPress={share}>
              <ShareNetwork size={16} color={colors.primaryForeground} />
              <Text>Share</Text>
            </Button>
          ) : null}
          {failed ? <Text variant="caption" tone="destructive">Couldn’t copy. Select the code instead.</Text> : null}
        </View>
      </SheetContent>
    </Sheet>
  )
}
