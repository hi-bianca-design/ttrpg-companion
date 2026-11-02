import { render, screen } from '@testing-library/react-native'
import { Image, Text } from 'react-native'
import { Rect, RadialGradient } from 'react-native-svg'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { SKY_BANDS } from '@/lib/theme'

test('renders its children', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.getByText('One')).toBeTruthy()
})

test('the sky is six posterized bands in token order, top to bottom', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  const fills = screen.UNSAFE_getAllByType(Rect).map((r) => r.props.fill as string).filter((f) => SKY_BANDS.includes(f))
  expect(fills).toEqual(SKY_BANDS)
  const ys = screen.UNSAFE_getAllByType(Rect).filter((r) => SKY_BANDS.includes(r.props.fill)).map((r) => parseFloat(r.props.y))
  expect(ys).toEqual([...ys].sort((a, b) => a - b))
})

test('each instance gets its own vignette gradient and its rect points at it', () => {
  render(
    <>
      <ScreenBackground><Text>One</Text></ScreenBackground>
      <ScreenBackground><Text>Two</Text></ScreenBackground>
    </>,
  )
  const ids = screen.UNSAFE_getAllByType(RadialGradient).map((g) => g.props.id as string)
  expect(new Set(ids).size).toBe(2)
  const fills = screen.UNSAFE_getAllByType(Rect).map((r) => r.props.fill as string).filter((f) => f?.startsWith('url('))
  expect(fills.sort()).toEqual(ids.map((id) => `url(#${id})`).sort())
  for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('grain is a tiled image that never intercepts touches', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.getByTestId('screen-grain').props.pointerEvents).toBe('none')
  expect(screen.UNSAFE_getByType(Image).props.resizeMode).toBe('repeat')
})
