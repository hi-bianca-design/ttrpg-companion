import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Image, PixelRatio, Text } from 'react-native'
import Svg, { Rect, RadialGradient } from 'react-native-svg'
import { ScreenBackground } from '@/components/game/ScreenBackground'
import { SKY_BANDS } from '@/lib/theme'

const layoutAll = (width = 400, height = 800) =>
  act(() => {
    for (const node of screen.getAllByTestId('screen-background')) {
      fireEvent(node, 'layout', { nativeEvent: { layout: { width, height, x: 0, y: 0 } } })
    }
  })

test('renders its children', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.getByText('One')).toBeTruthy()
})

test('the sky is painted at the measured size, so it follows the screen when the tab bar resizes it', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.UNSAFE_queryByType(Svg)).toBeNull()
  layoutAll(400, 800)
  expect(screen.UNSAFE_getByType(Svg).props.height).toBe(800)
  layoutAll(400, 700)
  expect(screen.UNSAFE_getByType(Svg).props.height).toBe(700)
  const last = screen.UNSAFE_getAllByType(Rect).filter((r) => SKY_BANDS.includes(r.props.fill)).pop()
  expect(last?.props.y + last?.props.height).toBeCloseTo(0.3 * 700)
})

test('the sky is six posterized bands in token order, top to bottom', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  layoutAll()
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
  layoutAll()
  const ids = screen.UNSAFE_getAllByType(RadialGradient).map((g) => g.props.id as string)
  expect(new Set(ids).size).toBe(2)
  const fills = screen.UNSAFE_getAllByType(Rect).map((r) => r.props.fill as string).filter((f) => f?.startsWith('url(#screen-vignette') && !f.includes('-sky-fade'))
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
  layoutAll()
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

test('platforms without Image.resolveAssetSource (web) still render the grain at its natural size', () => {
  const original = Image.resolveAssetSource
  // @ts-expect-error simulate react-native-web, which does not define it
  Image.resolveAssetSource = undefined
  try {
    render(<ScreenBackground><Text>One</Text></ScreenBackground>)
    expect(screen.getByTestId('screen-grain')).toBeTruthy()
    expect(screen.UNSAFE_getByType(Image).props.source.scale).toBeUndefined()
  } finally {
    Image.resolveAssetSource = original
  }
})

test('the sky eases into the night below its last band instead of ending in a hard step', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  layoutAll(400, 1000)
  const fade = screen.UNSAFE_getAllByType(Rect).find((r) => String(r.props.fill).includes('-sky-fade'))
  expect(parseFloat(fade?.props.y)).toBeCloseTo(300)
  expect(parseFloat(fade?.props.y) + parseFloat(fade?.props.height)).toBeCloseTo(460)
})
