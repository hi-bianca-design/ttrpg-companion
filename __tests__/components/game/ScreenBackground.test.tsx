import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'

type Node = { type: unknown; props: Record<string, unknown> }

// react-native-svg renders host components named after the SVG element; read their props directly.
const byType = (type: string): Node[] => screen.UNSAFE_root.findAll((n: Node) => n.type === type || (n.type as { displayName?: string })?.displayName === type)

test('each instance gets its own glow gradient id and its rect points at it', () => {
  render(
    <>
      <ScreenBackground><Text>One</Text></ScreenBackground>
      <ScreenBackground><Text>Two</Text></ScreenBackground>
    </>,
  )
  const gradients = byType('RadialGradient')
  const ids: string[] = gradients.map((g) => g.props.id as string)
  expect(new Set(ids).size).toBe(2)
  const fills = byType('Rect').map((r) => r.props.fill as string).filter((f) => f?.startsWith('url('))
  expect(fills.sort()).toEqual(ids.map((id) => `url(#${id})`).sort())
  for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('glow is a wide ellipse (no rx/ry, which browsers ignore) with intermediate stops', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  const [gradient] = byType('RadialGradient')
  expect(gradient.props.rx).toBeUndefined()
  expect(gradient.props.ry).toBeUndefined()
  expect(gradient.props.gradientTransform).toMatch(/scale\(1\.2/)
  expect(byType('Stop').length).toBeGreaterThanOrEqual(3)
})
