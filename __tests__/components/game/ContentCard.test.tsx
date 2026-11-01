import { render, screen } from '@testing-library/react-native'
import { ContentCard } from '@/components/game/ContentCard'

test('long title truncates', () => {
  const title = 'A'.repeat(40)
  render(<ContentCard title={title} meta="Evocation" tags={['Fire', 'Ritual']} />)
  expect(screen.getByText(title).props.numberOfLines).toBe(1)
  expect(screen.getByText('Fire')).toBeTruthy()
  expect(screen.getByText('Ritual')).toBeTruthy()
})
