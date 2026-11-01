import { AppError, ERROR_COPY, toAppError } from '@/features/errors'
import { qk } from '@/lib/query-client'

describe('toAppError', () => {
  it.each(['invalid_code', 'already_member', 'system_mismatch', 'not_your_character'] as const)(
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
      network: "Can't reach the server. Check your connection and try again.",
      unknown: 'Something went wrong. Please try again.',
    })
  })
})

describe('qk', () => {
  it('builds stable query keys', () => {
    expect(qk.content('dnd5e-2024', 'spell', 'all')).toEqual(['content', 'dnd5e-2024', 'spell', 'all'])
    expect(qk.character('c1')).toEqual(['character', 'c1'])
    expect(qk.characters).toEqual(['characters'])
    expect(qk.campaigns).toEqual(['campaigns'])
    expect(qk.campaign('x')).toEqual(['campaign', 'x'])
  })
})
