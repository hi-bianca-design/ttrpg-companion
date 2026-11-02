import { useId, useMemo } from 'react'
import { Minus, Plus } from 'phosphor-react-native'
import { Platform, Pressable, View, type ViewStyle } from 'react-native'
import Svg, { Defs, FeGaussianBlur, Filter, Polygon } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { ThemeColorKey } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

export type ResourceTint = 'sky' | 'plum' | 'sage' | 'ochre' | 'terracotta'
/** remaining (default): filled pips are what is left to spend (spell slots). marked: filled pips are what has
 * been marked, counting up from empty (death saves). */
export type PipCount = 'remaining' | 'marked'

type ResourceTrackerProps =
  | {
      display: 'pips'
      label: string
      max: number
      used: number
      /** used + 1 */
      onSpend: () => void
      /** used - 1 */
      onRestore: () => void
      tint?: ResourceTint
      count?: PipCount
      /** Noun for the screen-reader summary: "Level 1 slots, 2 of 3 available". */
      unit?: string
    }
  | { display: 'bar'; label: string; current: number; max: number; temp?: number; onAdjust: () => void }
  | { display: 'counter'; label: string; current: number; max?: number; onAdjust?: () => void }

const PIP_SIZE = 12
const DIAMOND = `${PIP_SIZE / 2},0 ${PIP_SIZE},${PIP_SIZE / 2} ${PIP_SIZE / 2},${PIP_SIZE} 0,${PIP_SIZE / 2}`

const TINT_KEYS = {
  sky: 'resourceSky',
  plum: 'resourcePlum',
  sage: 'resourceSage',
  ochre: 'resourceOchre',
  terracotta: 'resourceTerracotta',
} as const satisfies Record<ResourceTint, ThemeColorKey>

const TINT_GLOW_KEYS = {
  sky: 'resourceSkyGlow',
  plum: 'resourcePlumGlow',
  sage: 'resourceSageGlow',
  ochre: 'resourceOchreGlow',
  terracotta: 'resourceTerracottaGlow',
} as const satisfies Record<ResourceTint, ThemeColorKey>

function useTintColors(tint: ResourceTint) {
  const colors = THEME_COLORS
  return useMemo(() => {
    const fill = colors[TINT_KEYS[tint]]
    const glow = colors[TINT_GLOW_KEYS[tint]]
    const glowStyle: ViewStyle = {
      shadowColor: glow,
      shadowOpacity: 0.7,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    }
    return { fill, glow, glowStyle }
  }, [colors, tint])
}

// Native draws the glow as an iOS shadow (spec §4.5). React Native Web turns that shadow into a
// box-shadow on the square box, which barely shows, so web blurs a copy of the diamond in SVG instead.
const SVG_GLOW = Platform.OS === 'web'
// Lets the blurred glow spill past the pip's 12px box.
const SVG_OVERFLOW = { overflow: 'visible' } as const

function Pip({ available, tint }: { available: boolean; tint: ResourceTint }) {
  const { fill, glow, glowStyle } = useTintColors(tint)
  const filterId = `pip-glow-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`
  return (
    <View testID={available ? 'pip-available' : 'pip-spent'} style={available && !SVG_GLOW ? glowStyle : undefined}>
      <Svg width={PIP_SIZE} height={PIP_SIZE} viewBox={`0 0 ${PIP_SIZE} ${PIP_SIZE}`} style={SVG_OVERFLOW}>
        {available && SVG_GLOW ? (
          <>
            <Defs>
              <Filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
                <FeGaussianBlur stdDeviation={3} />
              </Filter>
            </Defs>
            <Polygon points={DIAMOND} fill={glow} filter={`url(#${filterId})`} />
          </>
        ) : null}
        {available ? (
          <Polygon points={DIAMOND} fill={fill} />
        ) : (
          <Polygon points={DIAMOND} fill="none" stroke={fill} strokeWidth={1.5} strokeOpacity={0.45} />
        )}
      </Svg>
    </View>
  )
}

function tintOf(tint: ResourceTint) {
  const key = TINT_KEYS[tint]
  return { color: THEME_COLORS[key], stroke: key }
}

type CircleTone = { kind: 'destructive' } | { kind: 'primary' } | { kind: 'neutral' } | { kind: 'tint'; tint: ResourceTint }

function CircleButton({
  icon,
  label,
  tone,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus'
  label: string
  tone: CircleTone
  disabled: boolean
  onPress: () => void
}) {
  const colors = THEME_COLORS
  const { color, stroke } =
    tone.kind === 'destructive' ? { color: colors.destructive, stroke: 'destructive' as const }
    : tone.kind === 'neutral' ? { color: colors.mutedForeground, stroke: 'border' as const }
    : tone.kind === 'tint' ? tintOf(tone.tint)
    : { color: colors.accentForeground, stroke: 'primary' as const }
  const Icon = icon === 'minus' ? Minus : Plus
  return (
    <Button variant="outline" size="icon" accessibilityLabel={label} disabled={disabled} onPress={onPress} stroke={stroke}>
      <Icon testID={`icon-${icon}`} size={16} color={color} weight="bold" />
    </Button>
  )
}

export function ResourceTracker(props: ResourceTrackerProps) {
  if (props.display === 'pips') {
    const { label, max, used, onSpend, onRestore, tint = 'sky', count = 'remaining', unit } = props
    const marked = count === 'marked'
    const filled = marked ? Math.min(max, used) : Math.max(0, max - used)
    const name = unit ? `${label} ${unit}` : label
    const summary = `${name}, ${filled} of ${max} ${marked ? 'marked' : 'available'}`
    // remaining: − spends (used+1), + restores. marked: + marks (used+1), − clears.
    // marked: + is the tracker's own colour (sage successes, terracotta failures), − a neutral outline.
    const minus = marked
      ? { label: `Clear ${label}`, disabled: used <= 0, onPress: onRestore, tone: { kind: 'neutral' } as const }
      : { label: `Spend ${label}`, disabled: filled === 0, onPress: onSpend, tone: { kind: 'destructive' } as const }
    const plus = marked
      ? { label: `Mark ${label}`, disabled: used >= max, onPress: onSpend, tone: { kind: 'tint', tint } as const }
      : { label: `Restore ${label}`, disabled: used === 0, onPress: onRestore, tone: { kind: 'primary' } as const }
    return (
      <Card compact className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-2">
          <Text variant="label" numberOfLines={1}>{label}</Text>
          <View className="flex-row gap-3" accessible accessibilityLabel={summary}>
            {Array.from({ length: max }, (_, i) => (
              <Pip key={i} available={i < filled} tint={tint} />
            ))}
          </View>
        </View>
        {/* The count sits apart from the tier title (so "LEVEL 1" and "3/3" never read as one string),
            right-aligned before the buttons in the foreground ink. */}
        <Text testID="pip-count" variant="label" tone="default">
          {`${filled}/${max}`}
        </Text>
        <View className="flex-row gap-2">
          <CircleButton icon="minus" {...minus} />
          <CircleButton icon="plus" {...plus} />
        </View>
      </Card>
    )
  }

  if (props.display === 'bar') {
    const { label, current, max, temp, onAdjust } = props
    const pct = max > 0 ? (current / max) * 100 : 0
    const empty = current === 0
    return (
      <Pressable
        role="button"
        accessibilityLabel={`${label} ${current}/${max}${temp ? ` +${temp}` : ''}`}
        accessibilityHint={`Adjust ${label}`}
        onPress={onAdjust}
      >
        <Card compact tone={empty ? 'destructive' : 'default'} className="gap-2">
          <View className="flex-row items-baseline justify-between">
            <Text variant="label">{label}</Text>
            <Text variant="stat" tone={empty ? 'destructive' : 'default'} numberOfLines={1}>
              {current}/{max}
              {temp ? ` +${temp}` : ''}
            </Text>
          </View>
          <Progress value={pct} indicatorClassName={empty ? 'bg-destructive' : undefined} />
        </Card>
      </Pressable>
    )
  }

  const { label, current, max, onAdjust } = props
  const value = max != null ? `${current}/${max}` : String(current)
  const card = (
    <Card
      compact
      className="flex-row items-center justify-between"
      accessible={!onAdjust}
      accessibilityLabel={onAdjust ? undefined : `${label} ${value}`}
    >
      <Text variant="label">{label}</Text>
      <Text variant="stat" numberOfLines={1}>{value}</Text>
    </Card>
  )
  if (!onAdjust) return card
  return (
    <Pressable role="button" accessibilityLabel={`${label} ${value}`} accessibilityHint={`Adjust ${label}`} onPress={onAdjust}>
      {card}
    </Pressable>
  )
}
