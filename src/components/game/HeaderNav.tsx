import type { ReactNode } from 'react'
import { View } from 'react-native'
import { CaretLeft } from 'phosphor-react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

/**
 * Leave affordances on a 44pt nav row, one per kind of screen:
 * - pushed screens (sheet, campaign detail, level up, wizard steps): BackButton, a ghost caret at the
 *   leading edge;
 * - modal-like flows (join, new campaign, homebrew forms): CancelButton, ghost "Cancel" text at the
 *   leading edge;
 * - the character wizard from step 2 has both: Back leading (previous step) and a trailing Cancel
 *   (`edge="trailing"`) that leaves the whole wizard.
 */
export function NavRow({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="min-h-11 flex-row items-center justify-between">
      {children}
    </View>
  )
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const colors = THEME_COLORS
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
