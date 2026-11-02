import { Check } from 'phosphor-react-native'
import { Pressable } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ToggleChipProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> & {
  label: string
  selected?: boolean
  /** default: 44pt. sm: 28pt with an 8px hitSlop (44pt target), for dense groups. square: 44x44 with
   *  no side padding, for short labels such as numbers. */
  size?: 'default' | 'sm' | 'square'
  /** fill (default): selected is filled gold. outline: selected is a mint outline + check, for
   *  per-row state toggles that must not compete with the screen's primary button. */
  tone?: 'fill' | 'outline'
  className?: string
}

// 28pt chip + 8px each side reaches a 44pt touch target.
const SMALL_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 }

/**
 * The one selectable pill: single- or multi-choice options (kinds, conditions, sources, characters)
 * and on/off state toggles. Pointed plate with the same 2px stroke as the buttons. View filters that swap
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
  const checkColor = THEME_COLORS.accentForeground
  const filled = selected && tone === 'fill'
  const outlined = selected && tone === 'outline'
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlop ?? (size === 'sm' ? SMALL_HIT_SLOP : undefined)}
      className={cn(size === 'sm' ? 'h-7' : size === 'square' ? 'h-11 w-11' : 'h-11', disabled && 'opacity-50', className)}
      {...props}
    >
      <ShapedSurface
        fill={filled ? 'primary' : outlined ? 'rockDeep' : 'card'}
        stroke={filled ? 'ink' : outlined ? 'secondary' : 'border'}
        glow={filled && !disabled ? 'torch' : undefined}
        strokeWidth={1.5}
        shadowOffset={size === 'sm' ? 1 : 2}
        className={cn('flex-1 flex-row items-center justify-center gap-1', size === 'sm' ? 'px-3' : size === 'square' ? 'px-0' : 'px-6')}
      >
        {outlined ? <Check testID="toggle-chip-check" size={size === 'sm' ? 12 : 14} weight="bold" color={checkColor} /> : null}
        <Text
          variant={size === 'sm' ? 'caption' : 'body-sm'}
          className={cn(
            'font-sans-semibold',
            filled ? 'text-primary-foreground' : outlined ? 'text-accent-foreground' : 'text-foreground',
          )}
          numberOfLines={1}
        >
          {label}
        </Text>
      </ShapedSurface>
    </Pressable>
  )
}

export { ToggleChip }
export type { ToggleChipProps }
