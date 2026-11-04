import { fireEvent, render, screen } from '@testing-library/react-native'
import CharacterSheetLayout from '../../app/(app)/characters/[id]/_layout'

const mockRouter = { replace: jest.fn(), dismissAll: jest.fn(), canDismiss: jest.fn(() => false) }
const captured: { tabBar?: (props: object) => React.ReactElement; inset?: boolean; screens: Array<{ name: string; options: Record<string, unknown> }> } = { screens: [] }

jest.mock('expo-router', () => {
  const { useContext: use } = jest.requireActual('react')
  const { NavInsetContext: Ctx } = jest.requireActual('@/components/ui/nav-inset')
  const Tabs = (props: { tabBar: (p: object) => React.ReactElement; children?: unknown }) => {
    captured.tabBar = props.tabBar
    captured.inset = use(Ctx)
    return props.children ?? null
  }
  Tabs.Screen = (props: { name: string; options: Record<string, unknown> }) => {
    captured.screens.push(props)
    return null
  }
  return { Tabs, useLocalSearchParams: () => ({ id: 'ch1' }), useRouter: () => mockRouter }
})

const barProps = {
  state: { index: 0, routes: [{ key: 'a', name: 'index' }] },
  descriptors: { a: { options: { tabBarLabel: 'Sheet', tabBarIcon: () => null } } },
  navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
}

beforeEach(() => {
  captured.screens = []
  jest.clearAllMocks()
  render(<CharacterSheetLayout />)
})

test('the sheet tabs are Sheet, Actions, Items, Party, in route order', () => {
  const labels = captured.screens.filter((s) => s.options.href !== null).map((s) => [s.name, s.options.tabBarLabel])
  expect(labels).toEqual([['index', 'Sheet'], ['actions', 'Actions'], ['inventory', 'Items'], ['campaign', 'Party']])
})

test('screens inside the sheet leave room for the bar', () => {
  expect(captured.inset).toBe(true)
})

test('Home leads the sheet bar and returns to the app Home even on a deep link with no history', () => {
  render(captured.tabBar!(barProps))
  expect(screen.getAllByRole('button', { name: 'Home' })).toHaveLength(1)
  fireEvent.press(screen.getByRole('button', { name: 'Home' }))
  expect(mockRouter.replace).toHaveBeenCalledWith('/(app)')
})

test('Home first pops the characters stack, so the Characters tab does not reopen on this sheet', () => {
  mockRouter.canDismiss.mockReturnValueOnce(true)
  render(captured.tabBar!(barProps))
  fireEvent.press(screen.getByRole('button', { name: 'Home' }))
  expect(mockRouter.dismissAll).toHaveBeenCalled()
  expect(mockRouter.dismissAll.mock.invocationCallOrder[0]).toBeLessThan(mockRouter.replace.mock.invocationCallOrder[0])
})
