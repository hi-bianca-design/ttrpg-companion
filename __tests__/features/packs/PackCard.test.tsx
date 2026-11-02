import '@testing-library/jest-native/extend-expect'
import { render, screen } from '@testing-library/react-native'
import { PackCard } from '@/features/packs/PackCard'
import type { PackRow } from '@/features/packs/packs.api'

const pack: PackRow = {
  id: 'p1',
  slug: 'ember-court',
  name: 'Ember Court',
  description: 'Three subclasses and a bestiary of cinder-touched monsters.',
  kind: 'content',
  system_id: 'dnd5e-2024',
  artist_credit: 'Mira Voss',
  cover_url: null,
  store_product_id: null,
  published: true,
  created_at: '2026-11-02T00:00:00Z',
}

test('shows the pack name, description and artist credit', () => {
  render(<PackCard pack={pack} owned={false} />)
  expect(screen.getByText('Ember Court')).toBeTruthy()
  expect(screen.getByText('Three subclasses and a bestiary of cinder-touched monsters.')).toBeTruthy()
  expect(screen.getByText('Art by Mira Voss')).toBeTruthy()
})

test('an owned pack shows Owned and no purchase button', () => {
  render(<PackCard pack={pack} owned />)
  expect(screen.getByText('Owned')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Coming soon' })).toBeNull()
})

test('a pack that is not owned shows a disabled Coming soon button (there is no purchase flow yet)', () => {
  render(<PackCard pack={pack} owned={false} />)
  expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled()
  expect(screen.queryByText('Owned')).toBeNull()
})

test('a pack without a description or artist credit renders just the name', () => {
  render(<PackCard pack={{ ...pack, description: null, artist_credit: null }} owned={false} />)
  expect(screen.getByText('Ember Court')).toBeTruthy()
  expect(screen.queryByText(/Art by/)).toBeNull()
})
