import { Platform } from 'react-native'
import { buildInviteLink, inviteOrigin, inviteShareMessage, parseInviteCode } from '@/features/campaigns/inviteLink'

describe('buildInviteLink', () => {
  test('joins origin, route and code', () => {
    expect(buildInviteLink('ABC123', 'https://sz.example')).toBe('https://sz.example/campaigns/join?code=ABC123')
  })
  test('a trailing slash does not double up', () => {
    expect(buildInviteLink('ABC123', 'https://sz.example/')).toBe('https://sz.example/campaigns/join?code=ABC123')
  })
  test('no origin gives null', () => {
    expect(buildInviteLink('ABC123', null)).toBeNull()
  })
})

describe('parseInviteCode', () => {
  test('uppercases and strips', () => expect(parseInviteCode('ab12cd ')).toBe('AB12CD'))
  test('caps at six', () => expect(parseInviteCode('ABCDEFGH')).toBe('ABCDEF'))
  test('non-strings are empty', () => {
    expect(parseInviteCode(undefined)).toBe('')
    expect(parseInviteCode(42)).toBe('')
    expect(parseInviteCode('')).toBe('')
  })
  test('arrays use the first element', () => expect(parseInviteCode(['xy9z88', 'q'])).toBe('XY9Z88'))
})

describe('inviteShareMessage', () => {
  test('includes code and link', () => {
    const m = inviteShareMessage('ABC123', 'https://sz.example/campaigns/join?code=ABC123')
    expect(m).toContain('ABC123')
    expect(m).toContain('https://sz.example/campaigns/join?code=ABC123')
  })
  test('without a link there is no url', () => {
    const m = inviteShareMessage('ABC123', null)
    expect(m).toContain('ABC123')
    expect(m).not.toContain('http')
  })
})

describe('inviteOrigin on native', () => {
  const original = Platform.OS
  const env = process.env.EXPO_PUBLIC_WEB_URL
  beforeEach(() => { Platform.OS = 'ios' })
  afterEach(() => {
    Platform.OS = original
    if (env === undefined) delete process.env.EXPO_PUBLIC_WEB_URL
    else process.env.EXPO_PUBLIC_WEB_URL = env
  })
  test('reads and trims the env var', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://sz.example/'
    expect(inviteOrigin()).toBe('https://sz.example')
  })
  test('unset is null', () => {
    delete process.env.EXPO_PUBLIC_WEB_URL
    expect(inviteOrigin()).toBeNull()
  })
})
