import { fireEvent, render, screen } from '@testing-library/react-native'
import { Sword } from 'phosphor-react-native'
import { EmptyState } from '@/components/game/EmptyState'

test('icon, display title, body and one action', () => {
  const onPress = jest.fn()
  render(<EmptyState icon={Sword} title="No characters yet" body="Build your first hero." actionLabel="Create character" onAction={onPress} />)
  expect(screen.getByText('No characters yet').props.className).toContain('text-display')
  expect(screen.getByText('Build your first hero.').props.className).toContain('text-muted-foreground')
  fireEvent.press(screen.getByText('Create character'))
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('action is optional', () => {
  render(<EmptyState icon={Sword} title="Nothing" body="Body" />)
  expect(screen.queryByRole('button')).toBeNull()
})
