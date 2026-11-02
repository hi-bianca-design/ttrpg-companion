import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const colors = THEME_COLORS
  useEffect(() => () => clearTimeout(timer.current), [])

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

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1">
          <Text variant="label">Invite code</Text>
          <Text variant="stat" selectable className="font-plex">{code}</Text>
        </View>
        <Button size="sm" variant="outline" accessibilityLabel={copied ? 'Copied' : 'Copy invite code'} onPress={copy}>
          {copied ? <Check size={16} color={colors.accentForeground} weight="bold" /> : <Copy size={16} color={colors.accentForeground} />}
          <Text>{copied ? 'Copied' : 'Copy'}</Text>
        </Button>
      </View>
      {failed ? <Text variant="caption" tone="destructive">Couldn’t copy. Select the code instead.</Text> : null}
    </Card>
  )
}
