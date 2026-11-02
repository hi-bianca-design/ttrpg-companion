import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ShapedSurface } from '@/components/ui/shaped-surface'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

function renderTabs() {
  return render(
    <Tabs value="a" onValueChange={() => {}}>
      <TabsList>
        <TabsTrigger value="a" accessibilityLabel="A"><Text>A</Text></TabsTrigger>
        <TabsTrigger value="b" accessibilityLabel="B"><Text>B</Text></TabsTrigger>
      </TabsList>
    </Tabs>,
  )
}

test('the list is a chamfered track and only the active tab is a gold plate', () => {
  renderTabs()
  const plates = screen.UNSAFE_getAllByType(ShapedSurface).map((n) => n.props)
  expect(plates[0].shape).toBe('chamfer')
  expect(plates[0].fill).toBe('rockDeep')
  expect(plates.filter((p) => p.fill === 'primary')).toHaveLength(1)
})

test('active label is dark on gold, inactive is muted', () => {
  renderTabs()
  expect(screen.getByText('A').props.className ?? '').not.toContain('text-muted-foreground')
})

test('triggers still switch tabs', () => {
  const onValueChange = jest.fn()
  render(
    <Tabs value="a" onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="a"><Text>A</Text></TabsTrigger>
        <TabsTrigger value="b"><Text>B</Text></TabsTrigger>
      </TabsList>
    </Tabs>,
  )
  fireEvent.press(screen.getByText('B'))
  expect(onValueChange).toHaveBeenCalledWith('b')
})
