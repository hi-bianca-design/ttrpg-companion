import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import { Text } from '@/components/ui/text'

const COPY = 'Combat is starting'

/** What a player sees while the GM rolls call: one line, announced once. The order stays empty until it starts. */
export function CombatStarting() {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(COPY)
  }, [])
  return <Text variant="body-sm" tone="muted" accessibilityLiveRegion="polite">{COPY}</Text>
}
