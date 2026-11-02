import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/query-client'
import type { EntitlementRow } from './packs.api'

/**
 * Ids of packs with an active entitlement. Mirrors the DB's owns_pack: permanent (no expiry) or
 * expiring strictly after now. RLS stays the real gate; this only drives the "Owned" display.
 */
export function activePackIds(rows: EntitlementRow[], now = new Date()): Set<string> {
  return new Set(rows.filter((r) => r.expires_at == null || new Date(r.expires_at) > now).map((r) => r.pack_id))
}

/** The published pack catalog. api is required lazily so this module stays importable without the Supabase client. */
export function usePacks() {
  return useQuery({
    queryKey: qk.packs,
    queryFn: () => {
      const { listPacks } = require('./packs.api') as typeof import('./packs.api')
      return listPacks()
    },
  })
}

/** The caller's active pack ids (`data` is a Set). */
export function useMyPackIds() {
  return useQuery({
    queryKey: qk.entitlements,
    queryFn: () => {
      const { listMyEntitlements } = require('./packs.api') as typeof import('./packs.api')
      return listMyEntitlements()
    },
    select: (rows) => activePackIds(rows),
  })
}
