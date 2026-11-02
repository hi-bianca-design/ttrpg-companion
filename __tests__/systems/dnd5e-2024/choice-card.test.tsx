import { render, screen } from '@testing-library/react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { ChoiceCard } from '@/systems/dnd5e-2024/steps/shared'

test('a selected choice gets a mint edge; an unselected one does not', () => {
  const { rerender } = render(<ChoiceCard title="Fighter" selected={false} onPress={() => {}} />)
  expect(screen.UNSAFE_getByType(ShapedSurface).props.stroke).toBe('border')
  rerender(<ChoiceCard title="Fighter" selected onPress={() => {}} />)
  expect(screen.UNSAFE_getByType(ShapedSurface).props.stroke).toBe('secondary')
})
