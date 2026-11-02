import { cva, type VariantProps } from 'class-variance-authority'
import { View } from 'react-native'
import { ShapedSurface, type ThemeColorKey } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const badgeVariants = cva('self-start', {
  variants: {
    variant: {
      default: '',
      accent: '',
      // Status that applies to the character right now (conditions); plum, distinct from metadata badges.
      tinted: '',
    },
  },
  defaultVariants: { variant: 'default' },
})

const PLATES: Record<'default' | 'accent' | 'tinted', { fill: ThemeColorKey; stroke: ThemeColorKey }> = {
  default: { fill: 'card', stroke: 'border' },
  accent: { fill: 'primary', stroke: 'ink' },
  tinted: { fill: 'tinted', stroke: 'tintedBorder' },
}

type BadgeProps = Omit<React.ComponentProps<typeof View>, 'children'> &
  VariantProps<typeof badgeVariants> & { className?: string; children?: React.ReactNode }

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const plate = PLATES[variant ?? 'default']
  return (
    <ShapedSurface
      shape="hex"
      point={6}
      strokeWidth={1}
      shadowOffset={0}
      fill={plate.fill}
      stroke={plate.stroke}
      className={cn(badgeVariants({ variant }), className)}
    >
      <View className="px-3 py-1" {...props}>
        {typeof children === 'string' ? (
          <Text
            variant="label"
            className={variant === 'accent' ? 'text-primary-foreground' : variant === 'tinted' ? 'text-tinted-foreground' : undefined}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </ShapedSurface>
  )
}

export { Badge, badgeVariants }
