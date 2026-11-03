import * as LabelPrimitive from '@rn-primitives/label'
import { cn } from '@/lib/utils'

/** Depth of the pointed ends on a single-line Input (the default `point` of the hex shape). */
const INPUT_POINT = 14

function Label({
  className,
  pointed = false,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  ...props
}: LabelPrimitive.TextProps & React.RefAttributes<LabelPrimitive.TextRef> & { pointed?: boolean }) {
  return (
    <LabelPrimitive.Root
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        className={cn('font-plex text-label uppercase text-label-foreground', className)}
        // `pointed`: line the label up with the straight edge of the input below, past its pointed end.
        style={pointed ? { paddingLeft: INPUT_POINT } : undefined}
        {...props}
      />
    </LabelPrimitive.Root>
  )
}

export { Label }
