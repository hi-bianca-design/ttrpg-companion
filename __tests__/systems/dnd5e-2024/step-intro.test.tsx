import { render, screen } from '@testing-library/react-native'
import { StepIntro } from '@/systems/dnd5e-2024/steps/shared'

test('a step introduction reads as narrative text under a display title', () => {
  render(<StepIntro title="Ability scores" description="Tap an ability, then pick a value." />)
  expect(screen.getByText('Tap an ability, then pick a value.').props.className).toContain('font-narrative')
  expect(screen.getByText('Ability scores').props.className).toContain('font-display')
})
