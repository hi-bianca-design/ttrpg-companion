import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cn } from '@/lib/utils'

type ScreenBackgroundProps = { children: ReactNode; scroll?: boolean }

/**
 * Screen root: background colour and the safe-area top inset applied to the content.
 * (The banded sky, vignette and grain are layered on in a later task.)
 */
export function ScreenBackground({ children, scroll = false }: ScreenBackgroundProps) {
  // Fixed screens fill the height so a child can flex (e.g. a scroll area between header and footer).
  const content = <View className={cn('gap-6 px-4 pb-8 pt-6', !scroll && 'flex-1')}>{children}</View>
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="flex-1">
        {scroll ? <ScrollView>{content}</ScrollView> : content}
      </SafeAreaView>
    </View>
  )
}
