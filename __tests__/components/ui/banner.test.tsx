import { render, screen } from '@testing-library/react-native'
import { Banner } from '@/components/ui/banner'
import { ShapedSurface } from '@/components/ui/shaped-surface'

test('a banner is a frosted plate with an info mark and its message', () => {
  render(<Banner>Dimmed skills come from your background.</Banner>)
  expect(screen.getByText('Dimmed skills come from your background.')).toBeTruthy()
  const plate = screen.UNSAFE_getByType(ShapedSurface).props
  expect(plate.glass).toBeTruthy()
  expect(plate.shadowOffset).toBe(0)
})
