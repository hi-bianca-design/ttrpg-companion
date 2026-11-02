import { render, screen } from '@testing-library/react-native'
import Svg, { Stop } from 'react-native-svg'
import { Hairline } from '@/components/ui/hairline'
import { THEME_COLORS } from '@/lib/theme'

test('a hairline is 1px pale teal that fades to nothing at both edges', () => {
  render(<Hairline testID="h" />)
  const stops = screen.UNSAFE_getAllByType(Stop).map((s) => s.props)
  expect(stops[0].stopOpacity).toBe(0)
  expect(stops[stops.length - 1].stopOpacity).toBe(0)
  expect(stops[1].stopColor).toBe(THEME_COLORS.labelForeground)
  expect(stops[1].stopOpacity).toBeLessThan(0.5)
  expect(screen.UNSAFE_getByType(Svg).props.height).toBe(1)
})

test('end fade keeps the leading edge solid', () => {
  render(<Hairline fade="end" />)
  expect(screen.UNSAFE_getAllByType(Stop)[0].props.stopOpacity).toBeGreaterThan(0)
})
