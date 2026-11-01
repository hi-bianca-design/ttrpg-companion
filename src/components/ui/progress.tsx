import * as ProgressPrimitive from '@rn-primitives/progress'
import { View } from 'react-native'
import { cn } from '@/lib/utils'

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: ProgressPrimitive.RootProps & React.RefAttributes<ProgressPrimitive.RootRef> & { indicatorClassName?: string }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      value={value}
      // rule, not muted: muted equals the card colour, so the empty track vanished on cards.
      className={cn('h-2 w-full overflow-hidden rounded-full bg-rule', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator asChild>
        <View className={cn('h-full rounded-full bg-primary', indicatorClassName)} style={{ width: `${pct}%` }} />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
