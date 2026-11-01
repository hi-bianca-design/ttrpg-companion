import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useColorScheme } from 'nativewind'
import { CaretLeft } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

/**
 * Leave affordances, one per kind of screen, always at the leading edge of a 44pt nav row:
 * - pushed screens (sheet, campaign detail, level up, wizard steps): BackButton, a ghost caret;
 * - modal-like flows (join, new campaign, homebrew forms): CancelButton, ghost "Cancel" text.
 */
export function NavRow({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="min-h-11 flex-row items-center justify-between">
      {children}
    </View>
  )
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  return (
    <Button variant="ghost" size="icon" accessibilityLabel="Back" onPress={onPress}>
      <CaretLeft size={20} color={colors.foreground} />
    </Button>
  )
}

/**
 * Ghost "Cancel". The negative margin pulls the button's 12px padding into the gutter so the text lines
 * up with the 16px screen margin; the 44pt hit area (hitSlop) is unchanged.
 */
export function CancelButton({ onPress, edge = 'leading' }: { onPress: () => void; edge?: 'leading' | 'trailing' }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      accessibilityLabel="Cancel"
      className={edge === 'leading' ? '-ml-3' : '-mr-3'}
      onPress={onPress}
    >
      <Text>Cancel</Text>
    </Button>
  )
}
