import * as LabelPrimitive from '@rn-primitives/label'
import { cn } from '@/lib/utils'

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  ...props
}: LabelPrimitive.TextProps & React.RefAttributes<LabelPrimitive.TextRef>) {
  return (
    <LabelPrimitive.Root
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        className={cn('font-mono text-label uppercase text-label-foreground', className)}
        {...props}
      />
    </LabelPrimitive.Root>
  )
}

export { Label }
