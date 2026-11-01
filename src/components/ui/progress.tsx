import * as ProgressPrimitive from '@rn-primitives/progress'
import { View } from 'react-native'
import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.RootProps & React.RefAttributes<ProgressPrimitive.RootRef>) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator asChild>
        <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
