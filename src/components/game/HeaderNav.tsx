import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { BackGlyph } from '@/components/ui/ornament'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

/**
 * Leave affordances on a 44pt nav row, one per kind of screen:
 * - pushed screens (sheet, campaign detail, level up, wizard steps): BackButton, a gold-edged glass
 *   plate with a heraldic arrow, at the leading edge;
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
  return (
    <Pressable role="button" accessibilityLabel="Back" onPress={onPress} className="h-11 w-11">
      <ShapedSurface glass="surface" shape="chamfer" fill="rockDeep" stroke="primary" strokeWidth={1.5} shadowOffset={0} className="h-11 w-11 items-center justify-center">
        <BackGlyph color={THEME_COLORS.highlightText} />
      </ShapedSurface>
    </Pressable>
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
