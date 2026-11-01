import { useColorScheme } from 'nativewind'
import { useMemo } from 'react'
import { Minus, Plus } from 'phosphor-react-native'
import { Pressable, View, type ViewStyle } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Text } from '@/components/ui/text'
import { THEME_COLORS } from '@/lib/theme'

export type ResourceTint = 'sky' | 'plum' | 'sage' | 'ochre'

type ResourceTrackerProps =
  | {
      display: 'pips'
      label: string
      max: number
      used: number
      onSpend: () => void
      onRestore: () => void
      tint?: ResourceTint
    }
  | { display: 'bar'; label: string; current: number; max: number; temp?: number; onAdjust: () => void }
  | { display: 'counter'; label: string; current: number; max?: number; onAdjust: () => void }

const PIP_SIZE = 10
const DIAMOND = `${PIP_SIZE / 2},0 ${PIP_SIZE},${PIP_SIZE / 2} ${PIP_SIZE / 2},${PIP_SIZE} 0,${PIP_SIZE / 2}`

function useTintColors(tint: ResourceTint) {
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const key = `resource${tint[0].toUpperCase()}${tint.slice(1)}`
  return useMemo(() => {
    const fill = colors[key]
    const glow = colors[`${key}Glow`] ?? fill
    const glowStyle: ViewStyle = {
      shadowColor: glow,
      shadowOpacity: 0.7,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    }
    return { fill, glowStyle }
  }, [colors, key])
}

function Pip({ available, tint }: { available: boolean; tint: ResourceTint }) {
  const { fill, glowStyle } = useTintColors(tint)
  return (
    <View testID={available ? 'pip-available' : 'pip-spent'} style={available ? glowStyle : undefined}>
      <Svg width={PIP_SIZE} height={PIP_SIZE} viewBox={`0 0 ${PIP_SIZE} ${PIP_SIZE}`}>
        {available ? (
          <Polygon points={DIAMOND} fill={fill} />
        ) : (
          <Polygon points={DIAMOND} fill="none" stroke={fill} strokeWidth={1.5} strokeOpacity={0.45} />
        )}
      </Svg>
    </View>
  )
}

function CircleButton({
  icon,
  label,
  variant,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus'
  label: string
  variant: 'destructive' | 'primary'
  disabled: boolean
  onPress: () => void
}) {
  const { colorScheme } = useColorScheme()
  const colors = THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
  const color = variant === 'destructive' ? colors.destructive : colors.accentForeground
  const Icon = icon === 'minus' ? Minus : Plus
  return (
    <Button
      variant="outline"
      size="icon"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={variant === 'destructive' ? 'border-destructive' : 'border-primary'}
    >
      <Icon testID={`icon-${icon}`} size={16} color={color} weight="bold" />
    </Button>
  )
}

export function ResourceTracker(props: ResourceTrackerProps) {
  if (props.display === 'pips') {
    const { label, max, used, onSpend, onRestore, tint = 'sky' } = props
    const available = Math.max(0, max - used)
    return (
      <Card compact className="flex-row items-center justify-between">
        <View className="gap-2">
          <Text variant="subhead">{label}</Text>
          <View className="flex-row gap-3">
            {Array.from({ length: max }, (_, i) => (
              <Pip key={i} available={i < available} tint={tint} />
            ))}
          </View>
        </View>
        <View className="flex-row gap-2">
          <CircleButton
            icon="minus"
            variant="destructive"
            label={`Spend ${label}`}
            disabled={available === 0}
            onPress={onSpend}
          />
          <CircleButton
            icon="plus"
            variant="primary"
            label={`Restore ${label}`}
            disabled={used === 0}
            onPress={onRestore}
          />
        </View>
      </Card>
    )
  }

  if (props.display === 'bar') {
    const { label, current, max, temp, onAdjust } = props
    const pct = max > 0 ? (current / max) * 100 : 0
    return (
      <Pressable role="button" accessibilityLabel={`Adjust ${label}`} onPress={onAdjust}>
        <Card compact className="gap-2">
          <View className="flex-row items-baseline justify-between">
            <Text variant="label">{label}</Text>
            <Text variant="stat" numberOfLines={1}>
              {current}/{max}
              {temp ? ` +${temp}` : ''}
            </Text>
          </View>
          <Progress value={pct} />
        </Card>
      </Pressable>
    )
  }

  const { label, current, max, onAdjust } = props
  return (
    <Pressable role="button" accessibilityLabel={`Adjust ${label}`} onPress={onAdjust}>
      <Card compact className="flex-row items-center justify-between">
        <Text variant="label">{label}</Text>
        <Text variant="stat" numberOfLines={1}>
          {max != null ? `${current}/${max}` : current}
        </Text>
      </Card>
    </Pressable>
  )
}
