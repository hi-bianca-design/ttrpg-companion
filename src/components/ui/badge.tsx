import { cva, type VariantProps } from 'class-variance-authority'
import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const badgeVariants = cva('self-start rounded-full px-2 py-1', {
  variants: {
    variant: {
      default: 'border border-border bg-muted',
      accent: 'bg-primary',
      // Status that applies to the character right now (conditions); plum, distinct from metadata badges.
      tinted: 'border border-tinted-border bg-tinted',
    },
  },
  defaultVariants: { variant: 'default' },
})

type BadgeProps = Omit<React.ComponentProps<typeof View>, 'children'> &
  VariantProps<typeof badgeVariants> & { className?: string; children?: React.ReactNode }

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
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
  )
}

export { Badge, badgeVariants }
