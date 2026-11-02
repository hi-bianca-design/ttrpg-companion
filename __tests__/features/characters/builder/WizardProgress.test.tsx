import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { WizardProgress } from '@/features/characters/builder/WizardProgress'

const widthOf = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) as { width: number }).width

test('the current step is one long pill and every other step is a dot', () => {
  render(<WizardProgress title="Class" index={2} total={6} />)
  expect(screen.getAllByTestId('progress-pill')).toHaveLength(1)
  expect(screen.getAllByTestId('progress-dot')).toHaveLength(5)
  expect(widthOf(screen.getByTestId('progress-pill'))).toBeGreaterThan(widthOf(screen.getAllByTestId('progress-dot')[0]))
})

test('moving to the next step starts the pill on the previous step, so it can slide', () => {
  const first = render(<WizardProgress title="Class" index={1} total={4} />)
  first.unmount()
  render(<WizardProgress title="Origin" index={2} total={4} />)
  const widths = [...screen.getAllByTestId('progress-dot'), screen.getByTestId('progress-pill')].map(widthOf)
  // On mount the pill is still on step 1 (the previous one): it is the widest, and it is not the current step's.
  expect(widths[1]).toBeGreaterThan(widths[0])
  expect(widths[2]).toBe(8)
})

test('keeps the title, Step X of N and the progressbar semantics', () => {
  render(<WizardProgress title="Spells" index={3} total={7} />)
  expect(screen.getByText('Step 4 of 7 · Spells')).toBeTruthy()
  expect(screen.getByLabelText('Spells, step 4 of 7').props.accessibilityValue).toEqual({ min: 1, max: 7, now: 4 })
})
