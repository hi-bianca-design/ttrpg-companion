import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { BackButton, NavRow } from '@/components/game/HeaderNav'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

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
 * The one header on every character-sheet tab: caret Back (leaves the sheet, whichever tab is
 * open), optional Level up, then eyebrow + name. The nav row is separate from the name, so a long
 * name can't push the actions off screen.
 */
export function SheetHeader({ name, eyebrow, subtitle, onLevelUp, children }: SheetHeaderProps) {
  const router = useRouter()
  // router.back() on a sheet tab would only switch tabs; dismiss pops the whole sheet off the
  // characters stack. Opened directly (deep link / reload) there is nothing to pop.
  const leave = () => (router.canDismiss() ? router.dismiss() : router.replace('/(app)/characters'))

  return (
    <View className="gap-3">
      <NavRow>
        <BackButton onPress={leave} />
        {onLevelUp && name ? (
          <Button variant="ghost" size="sm" accessibilityLabel="Level up" onPress={onLevelUp}>
            <Text>Level up</Text>
          </Button>
        ) : null}
      </NavRow>
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
