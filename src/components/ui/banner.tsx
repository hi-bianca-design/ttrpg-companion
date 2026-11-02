import { Info } from 'phosphor-react-native'
import { View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

/** A quiet inline note: faint glass plate, mint info mark, one line of explanation. */
export function Banner({ children }: { children: string }) {
  return (
    <ShapedSurface glass shape="chamfer" fill="rockDeep" stroke="border" strokeWidth={1} shadowOffset={0} className="flex-row items-start gap-3 px-3 py-2">
      <View className="pt-1">
        <Info size={16} color={THEME_COLORS.accentForeground} weight="fill" />
      </View>
      <Text variant="body-sm" tone="muted" className="flex-1">{children}</Text>
    </ShapedSurface>
  )
}
