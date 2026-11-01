import { Pressable } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

type ToggleChipProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> & {
  label: string
  selected?: boolean
  className?: string
}

/**
 * The one selectable pill: single- or multi-choice options (kinds, conditions, sources, characters).
 * Fixed 44pt height; selected is filled moss. View filters that swap content use Tabs instead.
 */
function ToggleChip({ label, selected = false, disabled, className, accessibilityLabel, accessibilityState, ...props }: ToggleChipProps) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected, disabled: !!disabled }}
      disabled={disabled}
      className={cn(
        'h-11 flex-row items-center justify-center rounded-full border px-4',
        selected ? 'border-primary bg-primary active:opacity-90' : 'border-border bg-card active:bg-muted',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <Text
        variant="body-sm"
        className={cn('font-sans-semibold', selected ? 'text-primary-foreground' : 'text-foreground')}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export { ToggleChip }
export type { ToggleChipProps }
