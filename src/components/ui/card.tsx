import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

type ViewProps = React.ComponentProps<typeof View> & { className?: string }

function Card({ className, compact, ...props }: ViewProps & { compact?: boolean }) {
  return (
    <View
      className={cn('rounded-card border border-border bg-card', compact ? 'p-3' : 'p-4', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('gap-1 pb-3', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="heading" className={cn('text-card-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('gap-2', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
