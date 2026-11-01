import * as Slot from '@rn-primitives/slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Text as RNText } from 'react-native'
import { cn } from '@/lib/utils'

const textVariants = cva('', {
  variants: {
    variant: {
      display: 'font-display text-display',
      title: 'font-display text-title',
      heading: 'font-display text-heading',
      subhead: 'font-sans-semibold text-subhead',
      body: 'font-inter text-body',
      'body-sm': 'font-inter text-body-sm',
      stat: 'font-display text-stat',
      label: 'font-plex text-label uppercase',
      caption: 'font-inter text-caption',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      accent: 'text-accent-foreground',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: { variant: 'body' },
})

type TextTone = NonNullable<VariantProps<typeof textVariants>['tone']>

const TextClassContext = React.createContext<string | undefined>(undefined)

type TextProps = React.ComponentProps<typeof RNText> &
  VariantProps<typeof textVariants> & { className?: string; asChild?: boolean }

function Text({ className, variant, tone, asChild = false, ...props }: TextProps) {
  const inherited = React.useContext(TextClassContext)
  const Component = asChild ? Slot.Text : RNText
  // Label defaults to its own colour token (text-label is the size role, so the colour is label-foreground).
  const resolvedTone: TextTone | undefined = tone ?? (variant === 'label' ? undefined : 'default')
  return (
    <Component
      className={cn(
        textVariants({ variant, tone: resolvedTone }),
        variant === 'label' && !tone && 'text-label-foreground',
        inherited,
        className,
      )}
      {...props}
    />
  )
}

export { Text, TextClassContext, textVariants }
export type { TextProps }
