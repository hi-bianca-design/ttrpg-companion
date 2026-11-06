import { Check } from 'phosphor-react-native'
import { Pressable, View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ToggleChipProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> & {
  label: string
  selected?: boolean
  /** default: 44pt. sm: 32pt with a 6px hitSlop (44pt target), for dense groups. square: 44x44 with
   *  no side padding, for short labels such as numbers. */
  size?: 'default' | 'sm' | 'square'
  /** fill (default): selected is filled gold. outline: selected is a mint outline + check, for
   *  per-row state toggles that must not compete with the screen's primary button. */
  tone?: 'fill' | 'outline'
  className?: string
}

// 32pt chip + 6px each side reaches a 44pt touch target.
const SMALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 }

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
  const content = (
    <>
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
    </>
  )
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlop ?? (size === 'sm' ? SMALL_HIT_SLOP : undefined)}
      className={cn(size === 'sm' ? 'h-8' : size === 'square' ? 'h-11 w-11' : 'h-11', disabled && 'opacity-50', className)}
      {...props}
    >
      {size === 'sm' ? (
        // Compact chips repeat in dense groups (per-row toggles): a plain rectangle, not an SVG plate each.
        <View
          testID={props.testID ? `${props.testID}-plate` : undefined}
          className="flex-1 flex-row items-center justify-center gap-1 rounded-sm px-4"
          style={{ backgroundColor: THEME_COLORS[filled ? 'primary' : outlined ? 'rockDeep' : 'card'], borderColor: THEME_COLORS[filled ? 'ink' : outlined ? 'secondary' : 'border'], borderWidth: 1.5 }}
        >
          {content}
        </View>
      ) : (
        <ShapedSurface
          fill={filled ? 'primary' : outlined ? 'rockDeep' : 'card'}
          stroke={filled ? 'ink' : outlined ? 'secondary' : 'border'}
          glow={filled && !disabled ? 'torch' : undefined}
          strokeWidth={1.5}
          shadowOffset={2}
          className={cn('flex-1 flex-row items-center justify-center gap-1', size === 'square' ? 'px-0' : 'px-6')}
        >
          {content}
        </ShapedSurface>
      )}
    </Pressable>
  )
}

export { ToggleChip }
export type { ToggleChipProps }
