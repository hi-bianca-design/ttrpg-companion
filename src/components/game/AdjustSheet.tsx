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
          <Button onPress={onPrimary}>
            <Text variant="subhead" className="text-primary-foreground">
              {primaryLabel}
            </Text>
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
