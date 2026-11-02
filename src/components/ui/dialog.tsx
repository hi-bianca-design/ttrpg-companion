import * as DialogPrimitive from '@rn-primitives/dialog'
import { View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { splitClassName } from '@/lib/class-split'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

function DialogOverlay({
  className,
  children,
  ...props
}: Omit<DialogPrimitive.OverlayProps, 'asChild' | 'children'> & React.RefAttributes<DialogPrimitive.OverlayRef> & { children?: React.ReactNode }) {
  return (
    <DialogPrimitive.Overlay
      className={cn('absolute inset-0 items-center justify-center bg-overlay p-4', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Overlay>
  )
}

function DialogContent({
  className,
  portalHost,
  children,
  ...props
}: DialogPrimitive.ContentProps &
  React.RefAttributes<DialogPrimitive.ContentRef> & { portalHost?: string }) {
  const { plate, content } = splitClassName(className)
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay>
        <DialogPrimitive.Content className={cn('w-full max-w-md', plate)} {...props}>
          <ShapedSurface glass="overlay" shape="chamfer" fill="rock" stroke="rule" strokeWidth={1}>
            <View className={cn('gap-4 p-4', content)}>{children}</View>
          </ShapedSurface>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('gap-1', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('flex-row justify-end gap-2', className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: DialogPrimitive.TitleProps & React.RefAttributes<DialogPrimitive.TitleRef>) {
  return <DialogPrimitive.Title className={cn('font-display text-heading text-foreground', className)} {...props} />
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.DescriptionProps & React.RefAttributes<DialogPrimitive.DescriptionRef>) {
  return (
    <DialogPrimitive.Description
      className={cn('font-inter text-body-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
}
