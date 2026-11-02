import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ScreenBackground } from '@/components/game/ScreenBackground'

test('renders its children', () => {
  render(<ScreenBackground><Text>One</Text></ScreenBackground>)
  expect(screen.getByText('One')).toBeTruthy()
})
