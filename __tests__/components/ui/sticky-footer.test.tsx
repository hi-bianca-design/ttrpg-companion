import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { StickyFooter } from '@/components/ui/sticky-footer'

test('a sticky footer has a top border and casts an upward shadow over the content', () => {
  render(<StickyFooter><Text>Continue</Text></StickyFooter>)
  expect(screen.getByTestId('sticky-footer').props.className).toContain('border-t')
  expect(screen.getByText('Continue')).toBeTruthy()
  expect(screen.getByTestId('sticky-footer-shadow', { includeHiddenElements: true })).toBeTruthy()
})
