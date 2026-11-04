import { selectUpNext } from '@/features/home/selectUpNext'
import type { CampaignSummary } from '@/features/campaigns/campaigns.api'
import type { CharacterSummary } from '@/features/characters/characters.api'
import type { Session } from '@/features/sessions/sessions.api'

const campaign = (id: string) => ({ id, name: `Campaign ${id}` }) as CampaignSummary
const character = (id: string) => ({ id, name: `Char ${id}` }) as CharacterSummary
const session = (over: Partial<Session> = {}) => ({ in_combat: false, current_turn_user_id: null, ...over }) as Session

const base = { userId: 'me', campaigns: [campaign('c1'), campaign('c2')], sessions: {}, characters: [character('a'), character('b')] }

test('your turn beats everything: in combat and the turn is yours', () => {
  const r = selectUpNext({ ...base, sessions: { c1: session(), c2: session({ in_combat: true, current_turn_user_id: 'me' }) } })
  expect(r).toEqual({ kind: 'turn', campaign: campaign('c2') })
})

test('a session in combat on someone else\'s turn is live, not your turn', () => {
  const r = selectUpNext({ ...base, sessions: { c1: session({ in_combat: true, current_turn_user_id: 'them' }) } })
  expect(r).toEqual({ kind: 'live', campaign: campaign('c1') })
})

test('any open session is live', () => {
  expect(selectUpNext({ ...base, sessions: { c2: session() } })).toEqual({ kind: 'live', campaign: campaign('c2') })
})

test('no session: pick up the most recent character (the list is newest first)', () => {
  expect(selectUpNext({ ...base, sessions: { c1: null, c2: undefined } })).toEqual({ kind: 'recent', character: character('a') })
})

test('nothing at all: none', () => {
  expect(selectUpNext({ ...base, characters: [], campaigns: [] })).toEqual({ kind: 'none' })
})

test('without a signed-in user nothing is anyone\'s turn', () => {
  const r = selectUpNext({ ...base, userId: undefined, sessions: { c1: session({ in_combat: true, current_turn_user_id: null }) } })
  expect(r.kind).toBe('live')
})
