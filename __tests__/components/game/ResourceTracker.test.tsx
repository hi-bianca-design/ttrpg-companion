import { fireEvent, render, screen } from '@testing-library/react-native'
import { ResourceTracker } from '@/components/game/ResourceTracker'

test('pips: renders max pips, used ones marked spent', () => {
  render(<ResourceTracker display="pips" label="Level 1" max={4} used={1} onSpend={jest.fn()} onRestore={jest.fn()} />)
  expect(screen.getAllByTestId('pip-available')).toHaveLength(3)
  expect(screen.getAllByTestId('pip-spent')).toHaveLength(1)
})

test('pips: spend fires when available', () => {
  const onSpend = jest.fn()
  render(<ResourceTracker display="pips" label="L1" max={2} used={0} onSpend={onSpend} onRestore={jest.fn()} />)
  fireEvent.press(screen.getByLabelText('Spend L1'))
  expect(onSpend).toHaveBeenCalledTimes(1)
})

test('pips: spend disabled when none available', () => {
  const onSpend = jest.fn()
  render(<ResourceTracker display="pips" label="L1" max={2} used={2} onSpend={onSpend} onRestore={jest.fn()} />)
  fireEvent.press(screen.getByLabelText('Spend L1'))
  expect(onSpend).not.toHaveBeenCalled()
})

test('pips: restore disabled when all available', () => {
  const onRestore = jest.fn()
  render(<ResourceTracker display="pips" label="L1" max={2} used={0} onSpend={jest.fn()} onRestore={onRestore} />)
  fireEvent.press(screen.getByLabelText('Restore L1'))
  expect(onRestore).not.toHaveBeenCalled()
})

test('bar: shows current/max with temp and calls onAdjust', () => {
  const onAdjust = jest.fn()
  render(<ResourceTracker display="bar" label="HP" current={10} max={20} temp={3} onAdjust={onAdjust} />)
  expect(screen.getByText('10/20 +3')).toBeTruthy()
  const bar = screen.getByRole('button', { name: 'HP 10/20 +3' })
  expect(bar.props.accessibilityHint).toBe('Adjust HP')
  fireEvent.press(bar)
  expect(onAdjust).toHaveBeenCalledTimes(1)
})

test('counter: shows current only without max', () => {
  render(<ResourceTracker display="counter" label="Inspiration" current={2} onAdjust={jest.fn()} />)
  expect(screen.getByText('2')).toBeTruthy()
})

test('pips: -/+ buttons render icons, not glyph text', () => {
  render(<ResourceTracker display="pips" label="L1" max={2} used={1} onSpend={jest.fn()} onRestore={jest.fn()} />)
  expect(screen.getByTestId('icon-minus')).toBeTruthy()
  expect(screen.getByTestId('icon-plus')).toBeTruthy()
  expect(screen.queryByText('−')).toBeNull()
  expect(screen.queryByText('+')).toBeNull()
})

test('pips: shows the "2/3" count next to the label and an accessible summary on the pip row', () => {
  render(<ResourceTracker display="pips" label="Level 1" unit="slots" max={3} used={1} onSpend={jest.fn()} onRestore={jest.fn()} />)
  expect(screen.getByText('2/3')).toBeTruthy()
  expect(screen.getByLabelText('Level 1 slots, 2 of 3 available')).toBeTruthy()
})

test('pips counting marks: filled = marked, + marks and − clears', () => {
  const onSpend = jest.fn()
  const onRestore = jest.fn()
  render(<ResourceTracker display="pips" count="marked" tint="terracotta" label="Failures" max={3} used={1} onSpend={onSpend} onRestore={onRestore} />)
  expect(screen.getAllByTestId('pip-available')).toHaveLength(1)
  expect(screen.getAllByTestId('pip-spent')).toHaveLength(2)
  expect(screen.getByText('1/3')).toBeTruthy()
  expect(screen.getByLabelText('Failures, 1 of 3 marked')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Mark Failures' }))
  expect(onSpend).toHaveBeenCalledTimes(1)
  fireEvent.press(screen.getByRole('button', { name: 'Clear Failures' }))
  expect(onRestore).toHaveBeenCalledTimes(1)
})

test('counter without onAdjust is a static, labelled card', () => {
  render(<ResourceTracker display="counter" label="Hit Dice" current={2} max={3} />)
  expect(screen.getByLabelText('Hit Dice 2/3')).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
})
