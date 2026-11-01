import * as DialogPrimitive from '@rn-primitives/dialog'
import { ScrollView, useWindowDimensions, View } from 'react-native'
import { cn } from '@/lib/utils'

// Bottom sheet built on the Dialog primitive (portal + overlay + focus handling).
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetContent({
  className,
  portalHost,
  children,
  ...props
}: DialogPrimitive.ContentProps &
  React.RefAttributes<DialogPrimitive.ContentRef> & { portalHost?: string }) {
  return (
    <DialogPrimitive.Portal hostName={portalHost}>
      <DialogPrimitive.Overlay className="absolute inset-0 justify-end bg-overlay">
        <DialogPrimitive.Content
          className={cn('w-full gap-4 rounded-t-sheet border border-border bg-background p-4', className)}
          {...props}
        >
          <View className="mb-1 h-1 w-8 self-center rounded-full bg-rule" />
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('gap-1', className)} {...props} />
}

function SheetTitle({
  className,
  ...props
}: DialogPrimitive.TitleProps & React.RefAttributes<DialogPrimitive.TitleRef>) {
  return <DialogPrimitive.Title className={cn('font-display text-heading text-foreground', className)} {...props} />
}

// Scrollable body capped to a share of the window: the dialog wrapper has no definite height
// (on web it is an unsized div), so a percentage or flex-1 height cannot bound it.
const BODY_MAX_SHARE = 0.4

function SheetBody({ className, children }: { className?: string; children: React.ReactNode }) {
  const { height } = useWindowDimensions()
  return (
    <ScrollView style={{ maxHeight: height * BODY_MAX_SHARE }} contentContainerClassName={cn('gap-2', className)}>
      {children}
    </ScrollView>
  )
}

export { Sheet, SheetBody, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle }
