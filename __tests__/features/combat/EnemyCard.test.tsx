import '@testing-library/jest-native/extend-expect'
import { PortalHost } from '@rn-primitives/portal'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { buildGmOrder, type GmEnemyRow } from '@/features/combat/battleOrder'
import { EnemyCard } from '@/features/combat/EnemyCard'
import type { EnemyHp } from '@/features/combat/useEnemyHp'
import { DND_CONDITIONS } from '@/systems/dnd5e-2024/definition'
import { combat, enemy } from '../../helpers/combat'

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), auth: { getSession: jest.fn() } } }))

function rowOf(over: Partial<Parameters<typeof enemy>[0]> = {}): GmEnemyRow {
  return buildGmOrder({
    combat: combat(),
    entries: [enemy({
      id: 'g1', name: 'Goblin 1', hp: 22, max_hp: 30, temp_hp: 0, ac: 13, notes: 'flees at half', initiative: 12,
      attacks: [{ name: 'Scimitar', toHit: '+4', damage: '1d6+2' }], xp: 50, ...over,
    })],
    party: [],
    userId: 'gm',
  }).rows[0] as GmEnemyRow
}

function setup(row: GmEnemyRow, extra: Partial<React.ComponentProps<typeof EnemyCard>> = {}, canUndo = false) {
  const hp: EnemyHp = { apply: jest.fn().mockResolvedValue(true), undoFor: jest.fn().mockResolvedValue(undefined), canUndo: () => canUndo, pending: false }
  const props = {
    row, selected: false, onToggleSelect: jest.fn(), hp, conditionOptions: DND_CONDITIONS,
    onPatch: jest.fn().mockResolvedValue(undefined), onRemove: jest.fn().mockResolvedValue(undefined), onCopy: jest.fn().mockResolvedValue(undefined),
    ...extra,
  }
  render(<><EnemyCard {...props} /><PortalHost /></>)
  return props
}
const openStatBlock = () => fireEvent.press(screen.getByRole('button', { name: /Full stat block/ }))

test('shows name, the defense large under its default label AC, hit points as text and a bar, attacks and XP', () => {
  setup(rowOf())
  expect(screen.getByText('Goblin 1')).toBeTruthy()
  expect(screen.getByText('AC')).toBeTruthy()
  expect(screen.getByText('13')).toBeTruthy()
  expect(screen.getByText('22/30')).toBeTruthy()
  expect(screen.getByRole('progressbar', { name: 'Goblin 1 hit points' })).toBeTruthy()
  expect(screen.getByText('Scimitar +4 · 1d6+2')).toBeTruthy()
  expect(screen.getByText('XP 50')).toBeTruthy()
})

test('a system defense label replaces AC', () => {
  setup(rowOf({ defense_label: 'Evasion', ac: 12 }))
  expect(screen.getByText('Evasion')).toBeTruthy()
  expect(screen.queryByText('AC')).toBeNull()
})

test('XP is absent when the enemy has none', () => {
  setup(rowOf({ xp: null }))
  expect(screen.queryByText(/XP/)).toBeNull()
})

test('no element shows initiative, in text or in a label', () => {
  setup(rowOf({ is_current: true }))
  expect(screen.queryByText(/init/i)).toBeNull()
  expect(screen.queryByLabelText(/initiative/i)).toBeNull()
})

test('temp hit points show beside the total', () => {
  setup(rowOf({ temp_hp: 3 }))
  expect(screen.getByText('+3 Temp HP')).toBeTruthy()
})

test('the current enemy says Current in text, a ▶ marker and in its accessibility label', () => {
  setup(rowOf({ is_current: true }))
  expect(screen.getByText('Current')).toBeTruthy()
  expect(screen.getByText('▶')).toBeTruthy()
  expect(screen.getByLabelText(/current turn/)).toBeTruthy()
})

test('a card that is not current has no marker', () => {
  setup(rowOf())
  expect(screen.queryByText('▶')).toBeNull()
  expect(screen.queryByText('Current')).toBeNull()
})

test('the HP entry is on the card: damage typed 7 on 22/30 applies to this enemy', () => {
  const p = setup(rowOf())
  fireEvent.changeText(screen.getByLabelText('Amount'), '7')
  fireEvent.press(screen.getByRole('button', { name: 'Damage' }))
  expect(p.hp.apply).toHaveBeenCalledWith(['g1'], 'damage', 7)
})

test('Heal and Temp HP pass their modes', () => {
  const p = setup(rowOf())
  fireEvent.changeText(screen.getByLabelText('Amount'), '2')
  fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
  fireEvent.changeText(screen.getByLabelText('Amount'), '4')
  fireEvent.press(screen.getByRole('button', { name: 'Temp HP' }))
  expect(p.hp.apply).toHaveBeenNthCalledWith(1, ['g1'], 'heal', 2)
  expect(p.hp.apply).toHaveBeenNthCalledWith(2, ['g1'], 'temp', 4)
})

test('Undo shows when there is something to undo and undoes this enemy', () => {
  const p = setup(rowOf(), {}, true)
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }))
  expect(p.hp.undoFor).toHaveBeenCalledWith('g1')
})

test('+1 copies the enemy', () => {
  const p = setup(rowOf())
  fireEvent.press(screen.getByRole('button', { name: 'Add another Goblin 1' }))
  expect(p.onCopy).toHaveBeenCalledTimes(1)
  expect(screen.getByText('+1')).toBeTruthy()
})

test('the 44pt Select toggle reports and reflects selection', () => {
  const p = setup(rowOf(), { selected: true })
  const toggle = screen.getByRole('button', { name: 'Select Goblin 1' })
  expect(toggle).toHaveAccessibilityState({ selected: true })
  fireEvent.press(toggle)
  expect(p.onToggleSelect).toHaveBeenCalledTimes(1)
})

describe('a downed enemy', () => {
  test('collapses to one line: name, Down and XP, with no HP entry, attacks or stat block', () => {
    setup(rowOf({ hp: 0 }))
    expect(screen.getByText('Goblin 1')).toBeTruthy()
    expect(screen.getByText('Down')).toBeTruthy()
    expect(screen.getByText('XP 50')).toBeTruthy()
    expect(screen.queryByLabelText('Amount')).toBeNull()
    expect(screen.queryByText('Scimitar +4 · 1d6+2')).toBeNull()
    expect(screen.queryByRole('button', { name: /Full stat block/ })).toBeNull()
  })

  test('holding the turn, it says Current in text, a ▶ marker and in its accessibility label', () => {
    setup(rowOf({ hp: 0, is_current: true }))
    expect(screen.getByText('Current')).toBeTruthy()
    expect(screen.getByText('▶')).toBeTruthy()
    expect(screen.getByLabelText(/current turn/)).toBeTruthy()
  })

  test('not holding the turn, it has no marker', () => {
    setup(rowOf({ hp: 0 }))
    expect(screen.queryByText('Current')).toBeNull()
    expect(screen.queryByText('▶')).toBeNull()
    expect(screen.queryByLabelText(/current turn/)).toBeNull()
  })

  test('offers Undo when its last change can be undone', () => {
    const p = setup(rowOf({ hp: 0 }), {}, true)
    fireEvent.press(screen.getByRole('button', { name: 'Undo' }))
    expect(p.hp.undoFor).toHaveBeenCalledWith('g1')
  })

  test('has no Undo when there is nothing to undo', () => {
    setup(rowOf({ hp: 0 }))
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  test('can be opened again to heal it', () => {
    const p = setup(rowOf({ hp: 0 }))
    fireEvent.press(screen.getByRole('button', { name: 'Show Goblin 1' }))
    fireEvent.changeText(screen.getByLabelText('Amount'), '5')
    fireEvent.press(screen.getByRole('button', { name: 'Heal' }))
    expect(p.hp.apply).toHaveBeenCalledWith(['g1'], 'heal', 5)
  })
})

describe('conditions', () => {
  test('render as chips with their names', () => {
    setup(rowOf({ conditions: ['prone', 'poisoned'] }))
    expect(screen.getByText('Prone')).toBeTruthy()
    expect(screen.getByText('Poisoned')).toBeTruthy()
  })

  test('are added from the system list through one patch', async () => {
    const p = setup(rowOf({ conditions: ['prone'] }))
    fireEvent.press(screen.getByRole('button', { name: 'Conditions: Goblin 1' }))
    fireEvent.press(screen.getByRole('button', { name: 'Restrained' }))
    fireEvent.press(screen.getByRole('button', { name: 'Apply (2)' }))
    await waitFor(() => expect(p.onPatch).toHaveBeenCalledWith({ conditions: ['prone', 'restrained'] }))
  })

  test('are removed through the same picker', async () => {
    const p = setup(rowOf({ conditions: ['prone', 'poisoned'] }))
    fireEvent.press(screen.getByRole('button', { name: 'Conditions: Goblin 1' }))
    fireEvent.press(screen.getByRole('button', { name: 'Prone' }))
    fireEvent.press(screen.getByRole('button', { name: 'Apply (1)' }))
    await waitFor(() => expect(p.onPatch).toHaveBeenCalledWith({ conditions: ['poisoned'] }))
  })

  test('a system with no condition list offers no picker', () => {
    setup(rowOf(), { conditionOptions: [] })
    expect(screen.queryByRole('button', { name: 'Conditions: Goblin 1' })).toBeNull()
  })
})

describe('the full stat block', () => {
  test('is closed until tapped, then shows the notes', () => {
    setup(rowOf())
    expect(screen.queryByText('flees at half')).toBeNull()
    openStatBlock()
    expect(screen.getByText('flees at half')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Full stat block/ })).toHaveAccessibilityState({ expanded: true })
  })

  test('a hidden enemy is badged Hidden and offers Reveal', () => {
    const p = setup(rowOf({ hidden: true }))
    expect(screen.getByText('Hidden')).toBeTruthy()
    openStatBlock()
    fireEvent.press(screen.getByRole('button', { name: 'Reveal' }))
    expect(p.onPatch).toHaveBeenCalledWith({ hidden: false })
  })

  test('a visible enemy offers Hide', () => {
    const p = setup(rowOf())
    expect(screen.queryByText('Hidden')).toBeNull()
    openStatBlock()
    fireEvent.press(screen.getByRole('button', { name: 'Hide' }))
    expect(p.onPatch).toHaveBeenCalledWith({ hidden: true })
  })

  test('Set HP sends the typed exact value, 0 included', () => {
    const p = setup(rowOf())
    openStatBlock()
    fireEvent.changeText(screen.getByLabelText('Set HP to'), '0')
    fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
    expect(p.onPatch).toHaveBeenCalledWith({ hp: 0 })
  })

  test('Set HP does nothing for a blank field and strips letters', () => {
    const p = setup(rowOf())
    openStatBlock()
    fireEvent.press(screen.getByRole('button', { name: 'Set HP' }))
    expect(p.onPatch).not.toHaveBeenCalled()
    fireEvent.changeText(screen.getByLabelText('Set HP to'), '4x.5')
    expect(screen.getByLabelText('Set HP to').props.value).toBe('45')
  })

  test('the notes editor saves trimmed notes, or null when emptied', () => {
    const p = setup(rowOf())
    openStatBlock()
    fireEvent.changeText(screen.getByLabelText('Notes'), '  low on arrows ')
    fireEvent.press(screen.getByRole('button', { name: 'Save notes' }))
    expect(p.onPatch).toHaveBeenCalledWith({ notes: 'low on arrows' })
    fireEvent.changeText(screen.getByLabelText('Notes'), '   ')
    fireEvent.press(screen.getByRole('button', { name: 'Save notes' }))
    expect(p.onPatch).toHaveBeenLastCalledWith({ notes: null })
  })

  test('Select group only appears when the enemy has a group', () => {
    setup(rowOf())
    openStatBlock()
    expect(screen.queryByRole('button', { name: 'Select group' })).toBeNull()
    screen.unmount()
    const p = setup(rowOf(), { onSelectGroup: jest.fn() })
    openStatBlock()
    fireEvent.press(screen.getByRole('button', { name: 'Select group' }))
    expect(p.onSelectGroup).toHaveBeenCalledTimes(1)
  })

  test('Remove needs the confirm, and Cancel does not remove', async () => {
    const p = setup(rowOf())
    openStatBlock()
    fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
    expect(p.onRemove).not.toHaveBeenCalled()
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
    expect(p.onRemove).not.toHaveBeenCalled()
    fireEvent.press(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.press(screen.getByRole('button', { name: 'Remove Goblin 1' }))
    await waitFor(() => expect(p.onRemove).toHaveBeenCalledTimes(1))
  })
})

test('a 60-character name stays on one line, alive or down', () => {
  const name = 'G'.repeat(60)
  setup(rowOf({ name }))
  expect(screen.getByText(name).props.numberOfLines).toBe(1)
  screen.unmount()
  setup(rowOf({ name, hp: 0 }))
  expect(screen.getByText(name).props.numberOfLines).toBe(1)
})
