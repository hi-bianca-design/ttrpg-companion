import { render, screen } from '@testing-library/react-native'
import { ContentCard } from '@/components/game/ContentCard'

test('long title truncates', () => {
  const title = 'A'.repeat(40)
  render(<ContentCard title={title} meta="Evocation" tags={['Fire', 'Ritual']} />)
  expect(screen.getByText(title).props.numberOfLines).toBe(1)
  expect(screen.getByText('Fire')).toBeTruthy()
  expect(screen.getByText('Ritual')).toBeTruthy()
})

test('footer renders inside the card', () => {
  const { Text } = jest.requireActual('react-native')
  render(<ContentCard title="Rope" footer={<Text>Controls</Text>} />)
  let box = screen.getByText('Controls').parent
  while (box && !String(box.props.className ?? '').includes('rounded-card')) box = box.parent
  expect(box).toBeTruthy()
  expect(screen.getByText('Rope')).toBeTruthy()
})
