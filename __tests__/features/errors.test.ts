import { AppError, ERROR_COPY, toAppError } from '@/features/errors'
import { qk } from '@/lib/query-client'

describe('toAppError', () => {
  it.each(['invalid_code', 'already_member', 'system_mismatch', 'not_your_character', 'not_member', 'no_active_session', 'not_allowed', 'not_in_combat', 'invalid_turn_target', 'not_your_turn'] as const)(
    'maps a P0001 %s error to its code',
    (message) => {
      const err = toAppError({ code: 'P0001', message })
      expect(err).toBeInstanceOf(AppError)
      expect(err.code).toBe(message)
      expect(err.message).toBe(ERROR_COPY[message])
    },
  )

  it('maps network failures to network', () => {
    expect(toAppError(new TypeError('Network request failed')).code).toBe('network')
    expect(toAppError({ message: 'TypeError: Failed to fetch' }).code).toBe('network')
  })

  it('maps anything else to unknown', () => {
    expect(toAppError({ code: '23505', message: 'duplicate key' }).code).toBe('unknown')
    expect(toAppError('boom').code).toBe('unknown')
    expect(toAppError(null).code).toBe('unknown')
  })

  it('returns an existing AppError unchanged', () => {
    const original = new AppError('already_member')
    expect(toAppError(original)).toBe(original)
  })

  it('uses the agreed user-facing copy', () => {
    expect(ERROR_COPY).toEqual({
      invalid_code: "We couldn't find a campaign with that code.",
      already_member: "You're already in this campaign.",
      system_mismatch: 'That character is from a different game system than this campaign.',
      not_your_character: 'You can only join with your own characters.',
      duplicate: 'You already have one with this name.',
      in_use: 'This is used by a character. Remove it from them first.',
      username_taken: 'That username is taken.',
      network: "Can't reach the server. Check your connection and try again.",
      load_failed: 'Couldn’t load this. Check your connection and try again.',
      save_failed: 'Couldn’t save. Try again.',
      unknown: 'Something went wrong. Please try again.',
      not_member: "You're not part of this campaign yet.",
      no_active_session: 'This session has already ended.',
      not_allowed: "You can't do that in this session.",
      not_in_combat: "Combat hasn't started yet.",
      invalid_turn_target: "That player can't take a turn right now.",
      not_your_turn: "It isn't your turn.",
      no_active_combat: 'That fight has already ended.',
      not_rolling: 'Combat has already started.',
      not_active: 'Combat has not started yet.',
      invalid_target: "That row isn't in this fight any more.",
      invalid_amount: 'Enter a whole number above zero.',
      invalid_mode: 'Something went wrong. Please try again.',
      invalid_initiative: 'Initiative must be a whole number from -20 to 99.',
      invalid_position: "That spot isn't in the order.",
      invalid_enemy: 'Check the enemy details: a name up to 60 characters, at least 1 hit point, armor class 0 to 40, up to 20 copies.',
      invalid_patch: 'Something went wrong. Please try again.',
    })
  })
})

describe('qk', () => {
  it('builds stable query keys', () => {
    expect(qk.content('dnd5e-2024', 'spell', 'pickable')).toEqual(['content', 'dnd5e-2024', 'spell', 'pickable'])
    expect(qk.character('c1')).toEqual(['character', 'c1'])
    expect(qk.characters).toEqual(['characters'])
    expect(qk.campaigns).toEqual(['campaigns'])
    expect(qk.campaign('x')).toEqual(['campaign', 'x'])
  })
})
