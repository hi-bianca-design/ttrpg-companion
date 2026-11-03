import { Platform } from 'react-native'

export const CODE_LENGTH = 6
const JOIN_PATH = '/campaigns/join'

export function inviteOrigin(): string | null {
  if (Platform.OS === 'web') {
    return (typeof window !== 'undefined' && window.location?.origin) || null
  }
  const url = process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/+$/, '')
  return url || null
}

export function buildInviteLink(code: string, origin: string | null = inviteOrigin()): string | null {
  if (!origin) return null
  return `${origin.replace(/\/+$/, '')}${JOIN_PATH}?code=${encodeURIComponent(code)}`
}

export function parseInviteCode(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

export function inviteShareMessage(code: string, link: string | null): string {
  const base = `Join my campaign on Session Zero. Invite code: ${code}`
  return link ? `${base}\n${link}` : base
}
