import { activePackIds } from '@/features/packs/packs.queries'
import type { EntitlementRow } from '@/features/packs/packs.api'

const NOW = new Date('2026-11-02T12:00:00Z')

const row = (pack_id: string, expires_at: string | null): EntitlementRow => ({
  user_id: 'u1',
  pack_id,
  source: 'grant',
  expires_at,
  granted_at: '2026-01-01T00:00:00Z',
})

describe('activePackIds', () => {
  it('includes permanent entitlements and ones that expire in the future', () => {
    const ids = activePackIds([row('p1', null), row('p2', '2026-12-01T00:00:00Z')], NOW)
    expect([...ids].sort()).toEqual(['p1', 'p2'])
  })

  it('excludes entitlements that expired in the past', () => {
    expect(activePackIds([row('p1', '2026-11-01T00:00:00Z')], NOW).size).toBe(0)
  })

  it('treats an entitlement expiring exactly now as expired (matches the DB rule expires_at > now())', () => {
    expect(activePackIds([row('p1', NOW.toISOString())], NOW).size).toBe(0)
  })
})
