import * as DialogPrimitive from '@rn-primitives/dialog'
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { splitClassName } from '@/lib/class-split'
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
  const { plate, content } = splitClassName(className)
  return (
    <DialogPrimitive.Portal hostName={portalHost}>
      <DialogPrimitive.Overlay className="absolute inset-0 justify-end bg-overlay">
        {/* The sheet sits on the bottom edge, where the iOS keyboard opens: padding lifts it (input and
            the buttons under it, e.g. HpSheet's Damage/Heal) clear of the keyboard. Android resizes the
            window itself; web has no on-screen keyboard to avoid. */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="w-full">
          <DialogPrimitive.Content className={cn('w-full', plate)} {...props}>
            <ShapedSurface glass="overlay" blur shape="sheet" fill="rock" stroke="transparent" strokeWidth={0} shadowOffset={0}>
              <View testID="sheet-grabber" className="mt-2 h-1 w-10 self-center rounded-full bg-border" />
              <View className={cn('gap-4 p-4', content)}>{children}</View>
            </ShapedSurface>
          </DialogPrimitive.Content>
        </KeyboardAvoidingView>
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
