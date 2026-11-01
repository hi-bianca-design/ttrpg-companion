import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'

type AdjustSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  primaryLabel: string
  onPrimary: () => void
  /** outline when the sheet's action isn't the screen's main one (e.g. Sign out). */
  primaryVariant?: 'primary' | 'outline'
  secondaryLabel?: string
  onSecondary?: () => void
}

export function AdjustSheet({
  open,
  onOpenChange,
  title,
  children,
  primaryLabel,
  onPrimary,
  primaryVariant = 'primary',
  secondaryLabel,
  onSecondary,
}: AdjustSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
        <View className="gap-2">
          <Button variant={primaryVariant} accessibilityLabel={primaryLabel} onPress={onPrimary}>
            <Text variant="subhead">{primaryLabel}</Text>
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button variant="outline" onPress={onSecondary}>
              <Text variant="subhead">{secondaryLabel}</Text>
            </Button>
          ) : null}
        </View>
      </SheetContent>
    </Sheet>
  )
}
