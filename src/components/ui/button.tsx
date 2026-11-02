import { cva, type VariantProps } from 'class-variance-authority'
import { useState } from 'react'
import { Pressable } from 'react-native'
import { ShapedSurface, type ThemeColorKey } from '@/components/ui/shaped-surface'
import { TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'

// Size and touch target live on the Pressable; the pointed plate is drawn behind the label.
const buttonVariants = cva('', {
  variants: {
    variant: { primary: '', secondary: '', outline: '', ghost: 'rounded-sm active:bg-muted', destructive: '' },
    size: { default: 'min-h-11', sm: 'min-h-8', icon: 'h-8 w-8' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

const buttonTextVariants = cva('font-display-medium uppercase tracking-widest', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-accent-foreground',
      ghost: 'text-accent-foreground underline',
      destructive: 'text-destructive-foreground',
    },
    size: { default: 'text-body-sm', sm: 'text-caption', icon: 'text-body-sm' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

const PLATES: Record<'primary' | 'secondary' | 'outline' | 'destructive', { fill: ThemeColorKey; stroke: ThemeColorKey }> = {
  primary: { fill: 'primary', stroke: 'ink' },
  secondary: { fill: 'secondary', stroke: 'ink' },
  outline: { fill: 'rockDeep', stroke: 'secondary' },
  destructive: { fill: 'bloodFill', stroke: 'blood' },
}

const SHADOW = 3
const SINK = 2

// sm and icon buttons are 32px tall; hitSlop pads the touch target to 44px.
const SMALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 }

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    className?: string
    /** Torch glow for an active or lit state. Never combined with disabled. */
    lit?: boolean
    /** Recolours the plate edge (e.g. tinted +/- controls). */
    stroke?: ThemeColorKey
  }

function Button({ className, variant, size, disabled, hitSlop, lit, stroke, onPressIn, onPressOut, style, children, ...props }: ButtonProps) {
  const [pressed, setPressed] = useState(false)
  const v = variant ?? 'primary'
  const s = size ?? 'default'
  const sunk = pressed && !disabled
  const plate = v === 'ghost' ? null : PLATES[v]
  // The plate grows with a wrapped label (wide Cinzel at large font scales) instead of overflowing a fixed height.
  const plateSize = s === 'icon' ? 'h-8 w-8' : s === 'sm' ? 'min-h-8 px-4 py-1' : 'min-h-11 px-6 py-2'

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        role="button"
        disabled={disabled}
        hitSlop={hitSlop ?? (s === 'icon' || s === 'sm' ? SMALL_HIT_SLOP : undefined)}
        onPressIn={(e) => {
          setPressed(true)
          onPressIn?.(e)
        }}
        onPressOut={(e) => {
          setPressed(false)
          onPressOut?.(e)
        }}
        style={[typeof style === 'function' ? undefined : style, sunk && { transform: [{ translateX: SINK }, { translateY: SINK }] }]}
        {...props}
      >
        {plate ? (
          <ShapedSurface
            shape={s === 'icon' ? 'chamfer' : 'auto'}
            fill={plate.fill}
            stroke={stroke ?? plate.stroke}
            shadowOffset={sunk ? SHADOW - SINK : SHADOW}
            glow={lit && !disabled ? 'torch' : undefined}
            className={cn('flex-row items-center justify-center gap-2', plateSize)}
          >
            {children as React.ReactNode}
          </ShapedSurface>
        ) : (
          <>{children as React.ReactNode}</>
        )}
      </Pressable>
    </TextClassContext.Provider>
  )
}

export { Button, buttonVariants, buttonTextVariants }
export type { ButtonProps }
