import '@testing-library/jest-native/extend-expect'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { useBuilderStore } from '@/features/characters/builder/builder.store'
import { ClassStep } from '@/systems/daggerheart/steps/ClassStep'
import { DetailsStep } from '@/systems/daggerheart/steps/DetailsStep'
import { DomainCardsStep } from '@/systems/daggerheart/steps/DomainCardsStep'
import { HeritageStep } from '@/systems/daggerheart/steps/HeritageStep'
import { ReviewStep } from '@/systems/daggerheart/steps/ReviewStep'
import { TraitsStep } from '@/systems/daggerheart/steps/TraitsStep'
import { VitalsStep } from '@/systems/daggerheart/steps/VitalsStep'
import type { Draft } from '@/systems/types'

type StepComponent = (props: { draft: Draft; update(patch: Partial<Draft>): void }) => ReactElement

function renderStep(Step: StepComponent, draft: Draft = {}) {
  const update = jest.fn()
  render(<Step draft={draft} update={update} />)
  return update
}

/** Bound to the real builder store, the way [step].tsx renders steps. */
function Bound({ Step }: { Step: StepComponent }) {
  const draft = useBuilderStore((s) => s.draft)
  const update = useBuilderStore((s) => s.update)
  return <Step draft={draft} update={update} />
}

beforeEach(() => useBuilderStore.getState().start('daggerheart'))

describe('Traits step', () => {
  test('"Use suggested array" sends +2, +1, +1, 0, 0, -1 in trait order', () => {
    const update = renderStep(TraitsStep, useBuilderStore.getState().draft)
    fireEvent.press(screen.getByRole('button', { name: 'Use suggested array' }))
    expect(update).toHaveBeenCalledWith({ agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 })
  })

  test('typing a trait sends a number clamped to -5..8', () => {
    const update = renderStep(TraitsStep, useBuilderStore.getState().draft)
    fireEvent.changeText(screen.getByLabelText('Agility modifier'), '3')
    expect(update).toHaveBeenLastCalledWith({ agility: 3 })
    fireEvent.changeText(screen.getByLabelText('Strength modifier'), '12')
    expect(update).toHaveBeenLastCalledWith({ strength: 8 })
    fireEvent.changeText(screen.getByLabelText('Knowledge modifier'), '-9')
    expect(update).toHaveBeenLastCalledWith({ knowledge: -5 })
  })

  test('a lone minus sign waits for the digit, then the store holds the negative value', () => {
    render(<Bound Step={TraitsStep} />)
    const input = screen.getByLabelText('Finesse modifier')
    fireEvent.changeText(input, '-')
    expect(useBuilderStore.getState().draft.finesse).toBe(0)
    expect(screen.getByLabelText('Finesse modifier').props.value).toBe('-')
    fireEvent.changeText(screen.getByLabelText('Finesse modifier'), '-1')
    expect(useBuilderStore.getState().draft.finesse).toBe(-1)
  })

  test('the step buttons raise and lower a trait within bounds', () => {
    const update = renderStep(TraitsStep, { ...useBuilderStore.getState().draft, presence: 8 })
    fireEvent.press(screen.getByRole('button', { name: 'Raise Agility' }))
    expect(update).toHaveBeenLastCalledWith({ agility: 1 })
    fireEvent.press(screen.getByRole('button', { name: 'Lower Agility' }))
    expect(update).toHaveBeenLastCalledWith({ agility: -1 })
    expect(screen.getByRole('button', { name: 'Raise Presence' })).toBeDisabled()
  })
})

describe('Vitals step', () => {
  test('shows editable HP, Armor and Evasion defaults and read-only Stress and Hope', () => {
    const update = renderStep(VitalsStep, useBuilderStore.getState().draft)
    expect(screen.getByLabelText('Hit Points').props.value).toBe('6')
    expect(screen.getByLabelText('Armor').props.value).toBe('3')
    expect(screen.getByLabelText('Evasion').props.value).toBe('10')
    expect(screen.getByText('Stress')).toBeTruthy()
    expect(screen.getByText('Hope')).toBeTruthy()
    fireEvent.changeText(screen.getByLabelText('Hit Points'), '7')
    expect(update).toHaveBeenLastCalledWith({ hp_max: 7 })
    fireEvent.changeText(screen.getByLabelText('Evasion'), '1a2')
    expect(update).toHaveBeenLastCalledWith({ evasion: 12 })
    fireEvent.changeText(screen.getByLabelText('Armor'), '')
    expect(update).toHaveBeenLastCalledWith({ armor_max: null })
  })
})

describe('text steps', () => {
  test('Heritage sends the typed ancestry and community', () => {
    const update = renderStep(HeritageStep, useBuilderStore.getState().draft)
    fireEvent.changeText(screen.getByLabelText('Ancestry'), 'Faun')
    expect(update).toHaveBeenLastCalledWith({ ancestry: 'Faun' })
    fireEvent.press(screen.getByRole('button', { name: 'Wildborne' }))
    expect(update).toHaveBeenLastCalledWith({ community: 'Wildborne' })
  })

  test('Class sends the class (typed or suggested) and subclass', () => {
    const update = renderStep(ClassStep, useBuilderStore.getState().draft)
    fireEvent.press(screen.getByRole('button', { name: 'Ranger' }))
    expect(update).toHaveBeenLastCalledWith({ class_name: 'Ranger' })
    fireEvent.changeText(screen.getByLabelText('Subclass'), 'Wayfinder')
    expect(update).toHaveBeenLastCalledWith({ subclass_name: 'Wayfinder' })
  })

  test('Domain cards takes up to two typed names', () => {
    const update = renderStep(DomainCardsStep, useBuilderStore.getState().draft)
    fireEvent.changeText(screen.getByLabelText('Domain cards 2'), 'Book of Ava')
    expect(update).toHaveBeenLastCalledWith({ domain_cards: ['', 'Book of Ava'] })
    expect(screen.queryByLabelText('Domain cards 3')).toBeNull()
  })

  test('Details sends the name and two experiences', () => {
    const update = renderStep(DetailsStep, { ...useBuilderStore.getState().draft, experiences: ['Wilderness guide'] })
    fireEvent.changeText(screen.getByLabelText('Character name'), 'Wren')
    expect(update).toHaveBeenLastCalledWith({ name: 'Wren' })
    fireEvent.changeText(screen.getByLabelText('Experience 2'), 'Former smuggler')
    expect(update).toHaveBeenLastCalledWith({ experiences: ['Wilderness guide', 'Former smuggler'] })
  })
})

test('Review summarises the draft', () => {
  act(() => useBuilderStore.getState().update({
    name: 'Wren', class_name: 'Ranger', subclass_name: 'Wayfinder', ancestry: 'Faun', community: 'Wildborne',
    agility: 2, domain_cards: ['Gifted Tracker'], experiences: ['Wilderness guide'],
  }))
  render(<Bound Step={ReviewStep} />)
  expect(screen.getByText('Wren')).toBeTruthy()
  expect(screen.getByText('Level 1 Ranger · Wayfinder')).toBeTruthy()
  expect(screen.getByText('Faun')).toBeTruthy()
  expect(screen.getByText('Wildborne')).toBeTruthy()
  expect(screen.getByText('+2')).toBeTruthy()
  expect(screen.getByText('Gifted Tracker')).toBeTruthy()
  expect(screen.getByText('Wilderness guide')).toBeTruthy()
})
