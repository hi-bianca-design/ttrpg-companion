import type { screen } from '@testing-library/react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost'

const BY_FILL: Record<string, ButtonVariant> = { primary: 'primary', secondary: 'secondary', rockDeep: 'outline', bloodFill: 'destructive' }

/** Which Button variant a rendered button is: read from the plate it draws (ghost draws none). */
type RenderedNode = ReturnType<typeof screen.getByRole>

export function variantOf(button: RenderedNode): ButtonVariant {
  const plate = button.findAllByType(ShapedSurface)[0]
  return plate ? (BY_FILL[plate.props.fill as string] ?? 'primary') : 'ghost'
}
