import { Check } from 'phosphor-react-native'
import { useColorScheme } from 'nativewind'
import { Pressable } from 'react-native'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ToggleChipProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> & {
  label: string
  selected?: boolean
  /** default: 44pt. sm: 32pt with a 6px hitSlop (44pt target), for dense groups. */
  size?: 'default' | 'sm'
  /** fill (default): selected is filled moss. outline: selected is a moss outline + check, for
   *  per-row state toggles that must not compete with the screen's primary button. */
  tone?: 'fill' | 'outline'
  className?: string
}

// Same padding the sm Button uses to reach a 44pt touch target.
const SMALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 }

/**
 * The one selectable pill: single- or multi-choice options (kinds, conditions, sources, characters)
 * and on/off state toggles. Same 1.5px stroke as the outline button. View filters that swap
 * content use Tabs instead.
 */
function ToggleChip({
  label,
  selected = false,
  size = 'default',
  tone = 'fill',
  disabled,
  className,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  ...props
}: ToggleChipProps) {
  const { colorScheme } = useColorScheme()
  const checkColor = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light'].accentForeground
  const filled = selected && tone === 'fill'
  const outlined = selected && tone === 'outline'
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlop ?? (size === 'sm' ? SMALL_HIT_SLOP : undefined)}
      className={cn(
        'flex-row items-center justify-center gap-1 rounded-full border-1.5',
        size === 'sm' ? 'h-8 px-3' : 'h-11 px-4',
        filled && 'border-primary bg-primary active:opacity-90',
        outlined && 'border-primary bg-transparent active:bg-muted',
        !selected && 'border-border bg-card active:bg-muted',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {outlined ? <Check testID="toggle-chip-check" size={14} weight="bold" color={checkColor} /> : null}
      <Text
        variant="body-sm"
        className={cn(
          'font-sans-semibold',
          filled ? 'text-primary-foreground' : outlined ? 'text-accent-foreground' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export { ToggleChip }
export type { ToggleChipProps }
