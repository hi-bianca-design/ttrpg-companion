import { useLayoutEffect } from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Platform, Text, View } from 'react-native'
import { SearchPanel } from '@/features/search/SearchPanel'
import type { SearchResult } from '@/features/search/search'

const items: SearchResult[] = [
  { id: '1', kind: 'spell', name: 'Fireball', summary: 'A bright streak explodes.', group: 'SRD' },
  { id: '2', kind: 'magic_item', name: 'Firebrand', summary: 'A flaming sword.', group: 'SRD' },
  { id: '3', kind: 'encounter', name: 'Fire Cult Ambush', summary: null, group: 'Encounters' },
]

describe('SearchPanel', () => {
  test('renders nothing while closed', () => {
    render(<SearchPanel open={false} onClose={jest.fn()} items={items} />)
    expect(screen.queryByTestId('search-panel')).toBeNull()
  })
  test('shows results grouped by kind once a query is typed', () => {
    render(<SearchPanel open onClose={jest.fn()} items={items} />)
    fireEvent.changeText(screen.getByLabelText('Search'), 'fire')
    expect(screen.getByText('Spells')).toBeTruthy()
    expect(screen.getByText('Magic items')).toBeTruthy()
    expect(screen.getByText('Encounters')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fireball' })).toBeTruthy()
  })
  test('Escape (native key press) calls onClose', () => {
    const onClose = jest.fn()
    render(<SearchPanel open onClose={onClose} items={items} />)
    fireEvent(screen.getByLabelText('Search'), 'keyPress', { nativeEvent: { key: 'Escape' } })
    expect(onClose).toHaveBeenCalled()
  })
  test('the close button calls onClose', () => {
    const onClose = jest.fn()
    render(<SearchPanel open onClose={onClose} items={items} />)
    fireEvent.press(screen.getByRole('button', { name: 'Close search' }))
    expect(onClose).toHaveBeenCalled()
  })
  test('picking a result shows its summary and keeps the cards rendered', () => {
    const onPick = jest.fn()
    render(
      <View>
        <Text>the cards</Text>
        <SearchPanel open onClose={jest.fn()} items={items} onPick={onPick} />
      </View>,
    )
    fireEvent.changeText(screen.getByLabelText('Search'), 'fire')
    fireEvent.press(screen.getByRole('button', { name: 'Fireball' }))
    expect(screen.getByTestId('search-detail')).toHaveTextContent(/A bright streak explodes\./)
    expect(screen.getByText('the cards')).toBeTruthy()
    expect(onPick).toHaveBeenCalledWith(items[0])
  })
  test('a picked result with no description says so', () => {
    render(<SearchPanel open onClose={jest.fn()} items={items} />)
    fireEvent.changeText(screen.getByLabelText('Search'), 'cult')
    fireEvent.press(screen.getByRole('button', { name: 'Fire Cult Ambush' }))
    expect(screen.getByText('No description.')).toBeTruthy()
  })
  test('on web, Escape on the document closes and focus returns to the prior element', () => {
    const original = Platform.OS
    ;(Platform as { OS: string }).OS = 'web'
    type L = (e: { key: string }) => void
    let ls: L[] = []
    const prior = { focus: jest.fn() }
    ;(global as unknown as { document: unknown }).document = {
      activeElement: prior,
      addEventListener: (_t: string, l: L) => ls.push(l),
      removeEventListener: (_t: string, l: L) => { ls = ls.filter((x) => x !== l) },
    }
    try {
      const onClose = jest.fn()
      const { rerender } = render(<SearchPanel open onClose={onClose} items={items} />)
      ls.forEach((l) => l({ key: 'Escape' }))
      expect(onClose).toHaveBeenCalledTimes(1)
      rerender(<SearchPanel open={false} onClose={onClose} items={items} />)
      expect(prior.focus).toHaveBeenCalled()
      expect(ls).toHaveLength(0)
    } finally {
      ;(Platform as { OS: string }).OS = original
      delete (global as unknown as { document?: unknown }).document
    }
  })

  test('on web, focus returns to the element active BEFORE open, even though mounting the input steals focus', () => {
    const original = Platform.OS
    ;(Platform as { OS: string }).OS = 'web'
    type L = (e: { key: string }) => void
    let ls: L[] = []
    const opener = { focus: jest.fn(), isConnected: true }
    const searchInput = { focus: jest.fn(), isConnected: true }
    const doc = {
      activeElement: opener as unknown,
      addEventListener: (_t: string, l: L) => ls.push(l),
      removeEventListener: (_t: string, l: L) => { ls = ls.filter((x) => x !== l) },
    }
    ;(global as unknown as { document: unknown }).document = doc
    // Like autoFocus: runs in the commit, before any passive effect of the panel.
    function Stealer({ open }: { open: boolean }) {
      useLayoutEffect(() => { if (open) doc.activeElement = searchInput }, [open])
      return null
    }
    const tree = (open: boolean) => (<><SearchPanel open={open} onClose={jest.fn()} items={items} /><Stealer open={open} /></>)
    try {
      const { rerender } = render(tree(false))
      rerender(tree(true))
      rerender(tree(false))
      expect(opener.focus).toHaveBeenCalled()
      expect(searchInput.focus).not.toHaveBeenCalled()
    } finally {
      ;(Platform as { OS: string }).OS = original
      delete (global as unknown as { document?: unknown }).document
    }
  })
})
