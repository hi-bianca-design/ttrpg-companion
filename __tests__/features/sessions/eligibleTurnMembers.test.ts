import { eligibleTurnMembers } from '@/features/sessions/turn'

const member = (user_id: string, over: object = {}) => ({
  campaign_id: 'camp1', user_id, role: 'player', status: 'active', character_id: 'ch', created_at: '', updated_at: '',
  username: user_id, character_name: null, ...over,
})

test('keeps active members with a character, in order', () => {
  const a = member('a'), b = member('b')
  expect(eligibleTurnMembers([a, b] as never).map((m) => m.user_id)).toEqual(['a', 'b'])
})

test('drops invited members, members without a character, and a GM with no character', () => {
  const list = [
    member('gm1', { role: 'gm', character_id: null }),
    member('inv', { status: 'invited', character_id: null }),
    member('invWithChar', { status: 'invited' }),
    member('nochar', { character_id: null }),
    member('ok'),
  ]
  expect(eligibleTurnMembers(list as never).map((m) => m.user_id)).toEqual(['ok'])
})
