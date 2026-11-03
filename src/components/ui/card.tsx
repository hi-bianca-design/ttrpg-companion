import { View } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Text } from '@/components/ui/text'
import { splitClassName } from '@/lib/class-split'
import { cn } from '@/lib/utils'

type ViewProps = React.ComponentProps<typeof View> & { className?: string }

/** Height of the hero card's pointed top; content starts below it. */
const ARCH_RISE = 54

type CardProps = ViewProps & {
  compact?: boolean
  /** flat: chamfered rock plate (lists, tiles). hero: lancet arch lit from below (scenes, content detail). */
  variant?: 'flat' | 'hero'
  /** destructive redraws the edge (e.g. HP at 0). selected: mint edge with a soft glow (chosen option). accent: thin translucent gold edge, no glow (a summary card). */
  tone?: 'default' | 'destructive' | 'selected' | 'accent'
}

function Card({ className, compact, variant = 'flat', tone = 'default', style, ...props }: CardProps) {
  const hero = variant === 'hero'
  const { plate, content } = splitClassName(className)
  return (
    <ShapedSurface
      shape={hero ? 'arch' : 'chamfer'}
      glass
      fill="card"
      stroke={tone === 'destructive' ? 'destructive' : tone === 'selected' ? 'secondary' : tone === 'accent' ? 'rule' : 'border'}
      strokeWidth={tone === 'selected' || tone === 'destructive' ? 1.5 : 1}
      glow={tone === 'selected' ? 'secondary' : undefined}
      light={hero ? 'torch' : undefined}
      className={plate}
    >
      <View
        className={cn(compact ? 'p-3' : 'p-4', content)}
        style={[hero && { paddingTop: ARCH_RISE + (compact ? 12 : 16) }, style]}
        {...props}
      />
    </ShapedSurface>
  )
}

function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('gap-1 pb-3', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="heading" className={cn('text-card-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('gap-2', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
