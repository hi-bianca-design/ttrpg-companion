import { cva, type VariantProps } from 'class-variance-authority'
import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

// A plain bordered rectangle, not a ShapedSurface: badges repeat dozens of times in lists, and an SVG plate
// per badge means a layout measure, state and redraw each.
const badgeVariants = cva('self-start rounded-sm border', {
  variants: {
    variant: {
      default: 'border-border bg-card',
      accent: 'border-ink bg-primary',
      // Status that applies to the character right now (conditions); plum, distinct from metadata badges.
      tinted: 'border-tinted-border bg-tinted',
    },
  },
  defaultVariants: { variant: 'default' },
})

type BadgeProps = Omit<React.ComponentProps<typeof View>, 'children'> &
  VariantProps<typeof badgeVariants> & { className?: string; children?: React.ReactNode }

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <View testID="badge-plate" className={cn(badgeVariants({ variant }), className)}>
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
    </View>
  )
}

export { Badge, badgeVariants }
