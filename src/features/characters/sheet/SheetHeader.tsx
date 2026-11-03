import type { ReactNode } from 'react'
import { View } from 'react-native'
import { NavRow } from '@/components/game/HeaderNav'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { SessionStatusRow } from '@/features/sessions/SessionStatusRow'
import { TurnBanner } from '@/features/sessions/TurnBanner'

type SheetHeaderProps = {
  /** The character's name; omitted while it loads. */
  name?: string
  /** Small accent label above the name. */
  eyebrow?: string
  /** One muted line tightly under the name (4px), e.g. the class line. */
  subtitle?: string
  /** Shows the Level up action (Character tab). */
  onLevelUp?: () => void
  /** Extra lines under the name (class line, chips, XP on the Character tab). */
  children?: ReactNode
}

/**
 * The one header on every character-sheet tab: optional Level up (Home on the bottom bar leaves the sheet, so
 * there is no Back arrow), then the session status row (Session: Active + combat badge) while the campaign has a session, then eyebrow + name. The nav row is separate from the name, so a long
 * name can't push the actions off screen.
 */
export function SheetHeader({ name, eyebrow, subtitle, onLevelUp, children }: SheetHeaderProps) {
  return (
    <View className="gap-3">
      {onLevelUp && name ? (
        <NavRow>
          <View />
          <Button variant="ghost" size="sm" accessibilityLabel="Level up" onPress={onLevelUp}>
            <Text>Level up</Text>
          </Button>
        </NavRow>
      ) : null}
      <SessionStatusRow />
      <TurnBanner />
      {name ? (
        <View className="gap-1">
          {eyebrow ? <Text variant="label" tone="accent">{eyebrow}</Text> : null}
          <Text variant="title" numberOfLines={2}>{name}</Text>
          {subtitle ? <Text variant="body-sm" tone="muted">{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}
