import { render, screen } from '@testing-library/react-native'
import { Image, PixelRatio, Text } from 'react-native'
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

test('grain sits behind the content so text is never speckled, above the sky and vignette', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  const kids = (screen.toJSON() as { children: Array<{ props: { testID?: string } } | string> }).children
  const has = (node: unknown, pred: (n: any) => boolean): boolean =>
    typeof node === 'object' && node !== null && (pred(node) || ((node as any).children ?? []).some((c: unknown) => has(c, pred)))
  const grainAt = kids.findIndex((k) => has(k, (n) => n.props?.testID === 'screen-grain'))
  const textAt = kids.findIndex((k) => has(k, (n) => n.children?.includes?.('One')))
  const skyAt = kids.findIndex((k) => has(k, (n) => n.type === 'svg' || n.type === 'RNSVGSvgView' || n.type === 'Svg'))
  expect(skyAt).toBeGreaterThanOrEqual(0)
  expect(skyAt).toBeLessThan(grainAt)
  expect(grainAt).toBeLessThan(textAt)
})

test('the grain tile is drawn at one image pixel per physical pixel on any screen density', () => {
  jest.spyOn(PixelRatio, 'get').mockReturnValue(3)
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.UNSAFE_getByType(Image).props.source.scale).toBe(3)
  jest.restoreAllMocks()
})
