import { cva, type VariantProps } from 'class-variance-authority'
import { Pressable } from 'react-native'
import { TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-full', {
  variants: {
    variant: {
      primary: 'bg-primary active:opacity-90',
      outline: 'border border-border bg-transparent active:bg-muted',
      ghost: 'bg-transparent active:bg-muted',
      highlight: 'bg-highlight active:opacity-90',
      destructive: 'bg-destructive active:opacity-90',
    },
    size: {
      default: 'h-11 px-4',
      sm: 'h-8 px-3',
      icon: 'h-8 w-8',
    },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

const buttonTextVariants = cva('font-sans-semibold', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      highlight: 'text-highlight-foreground',
      destructive: 'text-destructive-foreground',
    },
    size: {
      default: 'text-body',
      sm: 'text-body-sm',
      icon: 'text-body-sm',
    },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

// icon buttons are 32px visually; hitSlop pads the touch target to 44px.
const ICON_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 }

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & { className?: string }

function Button({ className, variant, size, disabled, hitSlop, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        role="button"
        disabled={disabled}
        hitSlop={hitSlop ?? (size === 'icon' ? ICON_HIT_SLOP : undefined)}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export { Button, buttonVariants, buttonTextVariants }
export type { ButtonProps }
