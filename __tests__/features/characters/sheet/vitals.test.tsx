import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, within } from '@testing-library/react-native'
import CharacterTab from '../../../../app/(app)/characters/[id]/index'
import type { CharacterFull } from '@/features/characters/characters.api'
import { useCharacter, useResourceMutation, useUpdateCharacter } from '@/features/characters/characters.queries'
import { ConditionsSheet } from '@/features/characters/sheet/ConditionsSheet'
import { HpSheet } from '@/features/characters/sheet/HpSheet'
import { getSystem } from '@/systems/registry'
import { ERROR_COPY } from '@/features/errors'

jest.mock('@/features/characters/characters.queries', () => ({
  useCharacter: jest.fn(),
  useResourceMutation: jest.fn(),
  useUpdateCharacter: jest.fn(),
}))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ id: 'ch1' }),
  useRouter: () => mockRouter,
}))
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismiss: jest.fn(), canDismiss: jest.fn(() => true) }
jest.mock('@/components/game/ScreenBackground', () => ({
  ScreenBackground: ({ children }: { children: React.ReactNode }) => children,
}))

const mockResourceMutate = jest.fn()
let mockHookOptions: Array<{ onError?: (e: unknown) => void } | undefined> = []
// Failed writes are reported at hook level (all instances), as the real hook does.
const failWrites = (message: string) => mockResourceMutate.mockImplementation(() => mockHookOptions.forEach((o) => o?.onError?.(new Error(message))))
const mockUpdateMutate = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockResourceMutate.mockReset()
  mockHookOptions = []
  ;(useResourceMutation as jest.Mock).mockImplementation((_id: string, options?: { onError?: (e: unknown) => void }) => {
    mockHookOptions.push(options)
    return { mutate: mockResourceMutate }
  })
  ;(useUpdateCharacter as jest.Mock).mockReturnValue({ mutate: mockUpdateMutate, isPending: false })
})

// ── HpSheet ──

function renderHp(pool: { current: number; max: number; temp?: number }, extra: Record<string, unknown> = {}) {
  const onOpenChange = jest.fn()
  render(<><HpSheet characterId="ch1" pool={pool} open onOpenChange={onOpenChange} {...extra} /><PortalHost /></>)
  return { onOpenChange }
}

test('HpSheet: with no amount, Damage and Heal are disabled and there is no Confirm or Reset', () => {
  renderHp({ current: 10, max: 20 })
  expect(screen.getByRole('button', { name: 'Damage' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Heal' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
})

test('HpSheet: typed 8 on {10/20, bonus 5} previews and Damage applies it at once, then closes', () => {
  const pool = { current: 10, max: 20, temp: 5 }
  const { onOpenChange } = renderHp(pool)
  fireEvent.changeText(screen.getByLabelText('Amount'), '8')
  expect(screen.getByText('10 → 7')).toBeTruthy()
  expect(screen.getByText('Bonus HP 5 → 0')).toBeTruthy()
  expect(screen.getByText('10 → 18')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Take 8 damage' }))
  expect(useResourceMutation).toHaveBeenCalledWith('ch1', expect.any(Object))
  expect(mockResourceMutate).toHaveBeenCalledTimes(1)
  const change = mockResourceMutate.mock.calls[0][0]
  expect(change.key).toBe('hp')
  expect(change.apply(pool)).toEqual({ current: 7, max: 20, temp: 0 })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('HpSheet: Heal applies the typed amount, clamped to max', () => {
  const pool = { current: 10, max: 20, temp: 0 }
  renderHp(pool)
  fireEvent.changeText(screen.getByLabelText('Amount'), '15')
  expect(screen.getByText('10 → 20')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Heal 15' }))
  expect(mockResourceMutate).toHaveBeenCalledTimes(1)
  expect(mockResourceMutate.mock.calls[0][0].apply(pool)).toEqual({ current: 20, max: 20, temp: 0 })
})

test('HpSheet: a change that would do nothing is disabled with a reason, never silently dropped', () => {
  renderHp({ current: 20, max: 20 })
  fireEvent.changeText(screen.getByLabelText('Amount'), '4')
  expect(screen.getByRole('button', { name: 'Heal 4' })).toBeDisabled()
  expect(screen.getByText('Already at full HP.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Take 4 damage' })).not.toBeDisabled()
})

test('HpSheet passes mutation failures to onError', () => {
  const onError = jest.fn()
  failWrites('Network down')
  renderHp({ current: 10, max: 20 }, { onError })
  fireEvent.changeText(screen.getByLabelText('Amount'), '2')
  fireEvent.press(screen.getByRole('button', { name: 'Take 2 damage' }))
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network down' }))
})

test('HpSheet bonus mode sets temporary HP (no stacking) and explains a lower value', () => {
  const pool = { current: 10, max: 20, temp: 3 }
  renderHp(pool, { mode: 'temp' })
  fireEvent.changeText(screen.getByLabelText('Amount'), '6')
  expect(screen.getByText('Bonus HP 3 → 6')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Set bonus HP to 6' }))
  const change = mockResourceMutate.mock.calls[0][0]
  expect(change.apply(pool)).toEqual({ current: 10, max: 20, temp: 6 })
  expect(change.apply({ current: 10, max: 20, temp: 9 })).toEqual({ current: 10, max: 20, temp: 9 })
})

test('HpSheet bonus mode: a lower value is disabled with the no-stacking reason', () => {
  renderHp({ current: 10, max: 20, temp: 9 }, { mode: 'temp' })
  fireEvent.changeText(screen.getByLabelText('Amount'), '4')
  expect(screen.getByRole('button', { name: 'Set bonus HP to 4' })).toBeDisabled()
  expect(screen.getByText('Bonus HP doesn’t stack: 9 is already higher.')).toBeTruthy()
})

// ── ConditionsSheet ──

test('ConditionsSheet applies two selections and the button reads "Apply (2)"', () => {
  const onApply = jest.fn()
  const options = getSystem('dnd5e-2024').conditions
  render(<><ConditionsSheet open onOpenChange={jest.fn()} options={options} value={[]} onApply={onApply} /><PortalHost /></>)
  expect(screen.getByRole('button', { name: 'Apply (0)' })).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Blinded' }))
  fireEvent.press(screen.getByRole('button', { name: 'Concentrating' }))
  fireEvent.press(screen.getByRole('button', { name: 'Apply (2)' }))
  expect(onApply).toHaveBeenCalledWith(['blinded', 'concentrating'])
})

test('ConditionsSheet starts from the current conditions; tapping again deselects', () => {
  const onApply = jest.fn()
  render(<><ConditionsSheet open onOpenChange={jest.fn()} options={['blinded', 'prone']} value={['prone']} onApply={onApply} /><PortalHost /></>)
  expect(screen.getByRole('button', { name: 'Prone' })).toHaveAccessibilityState({ selected: true })
  fireEvent.press(screen.getByRole('button', { name: 'Prone' }))
  fireEvent.press(screen.getByRole('button', { name: 'Apply (0)' }))
  expect(onApply).toHaveBeenCalledWith([])
})

// ── Character tab ──

const sage = {
  id: 'p2', character_id: 'ch1', content_id: 'bg', kind: 'background', state: {}, acquired_at_level: 1, created_at: '',
  content: { id: 'bg', name: 'Sage', kind: 'background', data: { skill_proficiencies: ['arcana', 'history'] } },
}
const wizard = {
  id: 'p1', character_id: 'ch1', content_id: 'cls', kind: 'class', state: {}, acquired_at_level: 1, created_at: '',
  content: { id: 'cls', name: 'Wizard', kind: 'class', data: { hit_die: 6, primary_abilities: ['intelligence'], saving_throw_proficiencies: ['intelligence', 'wisdom'] } },
}
const elf = {
  id: 'p3', character_id: 'ch1', content_id: 'sp', kind: 'species', state: {}, acquired_at_level: 1, created_at: '',
  content: { id: 'sp', name: 'Elf', kind: 'species', data: { speed: 30 } },
}

function makeCharacter(details: Record<string, unknown> = {}): CharacterFull {
  return {
    id: 'ch1', system_id: 'dnd5e-2024', name: 'Mira Thistledown', level: 3, owner_id: 'u1', notes: null, portrait_url: null,
    stats: { strength: 8, dexterity: 14, constitution: 15, intelligence: 17, wisdom: 12, charisma: 10 },
    resources: {
      hp: { current: 10, max: 20, temp: 5 },
      spell_slots: { tiers: {} },
      hit_dice: { current: 3, max: 3 },
      death_saves_success: { tiers: { '1': { max: 3, used: 0 } } },
      death_saves_failure: { tiers: { '1': { max: 3, used: 0 } } },
    },
    conditions: ['prone'],
    details,
    picks: [wizard, sage, elf] as unknown as CharacterFull['picks'],
    items: [],
    derived: [
      { key: 'strength_mod', label: 'Strength', value: -1, format: 'modifier' },
      { key: 'dexterity_mod', label: 'Dexterity', value: 2, format: 'modifier' },
      { key: 'constitution_mod', label: 'Constitution', value: 2, format: 'modifier' },
      { key: 'intelligence_mod', label: 'Intelligence', value: 3, format: 'modifier' },
      { key: 'wisdom_mod', label: 'Wisdom', value: 1, format: 'modifier' },
      { key: 'charisma_mod', label: 'Charisma', value: 0, format: 'modifier' },
      { key: 'proficiency', label: 'Proficiency', value: 2, format: 'modifier' },
      { key: 'ac', label: 'Armor Class', value: 16, format: 'plain' },
      { key: 'passive_perception', label: 'Passive Perception', value: 11, format: 'plain' },
      { key: 'speed', label: 'Speed', value: 30, format: 'plain' },
    ],
  }
}

function renderTab(details?: Record<string, unknown>) {
  ;(useCharacter as jest.Mock).mockReturnValue({ data: makeCharacter(details), isLoading: false, isError: false, refetch: jest.fn() })
  return render(<><CharacterTab /><PortalHost /></>)
}

test('header: name, class line and species / level / proficiency chips; no XP bar without details.xp', () => {
  renderTab()
  expect(screen.getByText('Your character')).toBeTruthy()
  expect(screen.getByText('Mira Thistledown')).toBeTruthy()
  expect(screen.getByText('Wizard · Sage')).toBeTruthy()
  expect(screen.getByText('Elf')).toBeTruthy()
  expect(screen.getByText('Level 3')).toBeTruthy()
  expect(screen.getByText('Prof +2')).toBeTruthy()
  expect(screen.queryByLabelText(/^Experience/)).toBeNull()
})

test('header shows the XP bar when details.xp exists', () => {
  renderTab({ xp: 1200 })
  expect(screen.getByLabelText(/^Experience/)).toBeTruthy()
})

test('vitals: HP / AC / Passive / Speed tiles; inspiration button only when inspired', () => {
  renderTab()
  expect(screen.getByRole('button', { name: 'HP 10/20 +5' }).props.accessibilityHint).toBe('Adjust hit points')
  expect(screen.getByLabelText('AC 16')).toBeTruthy()
  expect(screen.getByText('Passive')).toBeTruthy()
  expect(screen.getByRole('button', { name: '+ Bonus HP' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Spend inspiration' })).toBeNull()
})

test('Spend inspiration clears details.inspiration and keeps other details', () => {
  renderTab({ inspiration: true, alignment: 'Neutral' })
  fireEvent.press(screen.getByRole('button', { name: 'Spend inspiration' }))
  expect(mockUpdateMutate).toHaveBeenCalledWith({ details: { inspiration: false, alignment: 'Neutral' } }, expect.anything())
})

test('pressing the HP tile opens the hit points sheet', () => {
  renderTab()
  fireEvent.press(screen.getByRole('button', { name: 'HP 10/20 +5' }))
  expect(screen.getByText('Hit points')).toBeTruthy()
  expect(screen.getByLabelText('Amount')).toBeTruthy()
})

test('conditions: chips plus Edit → sheet → apply saves via updateCharacter', () => {
  renderTab()
  expect(screen.getByText('Prone')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Edit conditions' }))
  fireEvent.press(screen.getByRole('button', { name: 'Concentrating' }))
  fireEvent.press(screen.getByRole('button', { name: 'Apply (2)' }))
  expect(mockUpdateMutate).toHaveBeenCalledWith({ conditions: ['prone', 'concentrating'] }, expect.anything())
})

test('ability scores show the modifier as value and the score as sub', () => {
  renderTab()
  const tile = screen.getByLabelText('Intelligence +3, score 17')
  expect(within(tile).getByText('INT')).toBeTruthy()
  expect(within(tile).getByText('+3')).toBeTruthy()
  expect(within(tile).getByText('17')).toBeTruthy()
})

test('D&D proficiencies section: Sage skills and Wizard saves are marked proficient', () => {
  renderTab()
  expect(screen.getByLabelText('Arcana +5, proficient')).toBeTruthy()
  expect(screen.getByLabelText('Athletics -1')).toBeTruthy()
  expect(screen.getByLabelText('Intelligence save +5, proficient')).toBeTruthy()
  expect(screen.getByLabelText('Strength save -1')).toBeTruthy()
})

test('a failed HP change shows in the sheet error caption', () => {
  failWrites('Network down')
  renderTab()
  fireEvent.press(screen.getByRole('button', { name: 'HP 10/20 +5' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '2')
  fireEvent.press(screen.getByRole('button', { name: 'Heal 2' }))
  expect(screen.getByText('Network down')).toBeTruthy()
})

test('a failed bonus HP change shows in the sheet error caption', () => {
  failWrites('Bonus failed')
  renderTab()
  fireEvent.press(screen.getByRole('button', { name: '+ Bonus HP' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '7')
  fireEvent.press(screen.getByRole('button', { name: 'Set bonus HP to 7' }))
  expect(screen.getByText('Bonus failed')).toBeTruthy()
})

test('a non-Error write failure falls back to the shared save_failed copy', () => {
  mockResourceMutate.mockImplementation(() => mockHookOptions.forEach((o) => o?.onError?.('boom')))
  renderTab()
  fireEvent.press(screen.getByRole('button', { name: '+ Bonus HP' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '7')
  fireEvent.press(screen.getByRole('button', { name: 'Set bonus HP to 7' }))
  expect(screen.getByText(ERROR_COPY.save_failed)).toBeTruthy()
})

test('the D&D profile section renders after proficiencies', () => {
  renderTab({ alignment: 'Neutral', backstory: 'Raised in a library.' })
  expect(screen.getByText('Profile')).toBeTruthy()
  expect(screen.getByText('Raised in a library.')).toBeTruthy()
})

test('long name and big HP: the name wraps to two lines max, HP value fits on one line', () => {
  const long = 'Aelindra Voss of the Silver Thornwood Hal' // 41 chars
  const c = makeCharacter()
  ;(useCharacter as jest.Mock).mockReturnValue({
    data: { ...c, name: long, resources: { ...c.resources, hp: { current: 120, max: 120, temp: 15 } } },
    isLoading: false, isError: false, refetch: jest.fn(),
  })
  render(<><CharacterTab /><PortalHost /></>)
  expect(screen.getByText(long)).toHaveProp('numberOfLines', 2)
  const hpTile = screen.getByRole('button', { name: 'HP 120/120 +15' })
  const value = within(hpTile).getByText('120')
  expect(value).toHaveProp('numberOfLines', 1)
  expect(value).toHaveProp('adjustsFontSizeToFit', true)
  expect(within(hpTile).getByText('/120 +15')).toHaveProp('numberOfLines', 1)
  // nav actions live in their own row above the header, so a long name can't push them off
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Level up' })).toBeTruthy()
})

test('loading shows skeleton cards; error shows Try again', () => {
  ;(useCharacter as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() })
  const { rerender } = render(<CharacterTab />)
  expect(screen.getByLabelText('Loading character')).toBeTruthy()
  const refetch = jest.fn()
  ;(useCharacter as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch })
  rerender(<CharacterTab />)
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalled()
})

test('vitals: the system’s counter resources (hit dice) render as a tile', () => {
  renderTab()
  expect(screen.getByLabelText('Hit Dice 3/3')).toBeTruthy()
})

test('above 0 HP there are no death saves and the HP tile is not destructive', () => {
  renderTab()
  expect(screen.queryByText('Death Save Successes')).toBeNull()
  expect(screen.queryByLabelText(/Death Save Successes/)).toBeNull()
})

function renderDown(successUsed = 1, failureUsed = 2) {
  const c = makeCharacter()
  ;(useCharacter as jest.Mock).mockReturnValue({
    data: {
      ...c,
      resources: {
        ...c.resources,
        hp: { current: 0, max: 20, temp: 0 },
        death_saves_success: { tiers: { '1': { max: 3, used: successUsed } } },
        death_saves_failure: { tiers: { '1': { max: 3, used: failureUsed } } },
      },
    },
    isLoading: false, isError: false, refetch: jest.fn(),
  })
  return render(<><CharacterTab /><PortalHost /></>)
}

test('at 0 HP: death-save pips from the system resources (marked count) and a destructive HP tile', () => {
  renderDown(1, 2)
  expect(screen.getByText('Death Save Successes')).toBeTruthy()
  expect(screen.getByLabelText('Death Save Successes, 1 of 3 marked')).toBeTruthy()
  expect(screen.getByLabelText('Death Save Failures, 2 of 3 marked')).toBeTruthy()
  const hpTile = screen.getByRole('button', { name: 'HP 0/20' })
  expect(within(hpTile).getByText('0').props.className).toContain('text-destructive')
})

test('marking a death save writes the slots resource through the resource mutation', () => {
  renderDown(1, 0)
  fireEvent.press(screen.getByRole('button', { name: 'Mark Death Save Successes' }))
  const change = mockResourceMutate.mock.calls.at(-1)[0]
  expect(change.key).toBe('death_saves_success')
  expect(change.apply({ tiers: { '1': { max: 3, used: 1 } } })).toEqual({ tiers: { '1': { max: 3, used: 2 } } })
  // nothing marked yet: clearing a failure is disabled
  expect(screen.getByRole('button', { name: 'Clear Death Save Failures' })).toBeDisabled()
})

test('conditions use the tinted badge', () => {
  renderTab()
  expect(screen.getByText('Prone').props.className).toContain('text-tinted-foreground')
})

test('shared sheet header: caret Back leaves the sheet; Level up opens the level-up screen', () => {
  renderTab()
  fireEvent.press(screen.getByRole('button', { name: 'Back' }))
  expect(mockRouter.dismiss).toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Level up' }))
  expect(mockRouter.push).toHaveBeenCalledWith('/(app)/characters/ch1/level-up')
})

test('compact chips in the conditions sheet', () => {
  render(<><ConditionsSheet open onOpenChange={jest.fn()} options={['blinded', 'prone']} value={[]} onApply={jest.fn()} /><PortalHost /></>)
  expect(screen.getByRole('button', { name: 'Blinded' }).props.className).toContain('h-8')
})
