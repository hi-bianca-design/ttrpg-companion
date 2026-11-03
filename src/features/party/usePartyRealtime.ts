import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import type { CharacterFull } from '@/features/characters/characters.api'
import { toRuleInput } from '@/features/characters/picks'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord } from '@/systems/types'
import { partyCharacterIds } from './party.queries'

/** A characters row from a Realtime UPDATE, parsed by its system and folded into the cached character. */
function applyRow(c: CharacterFull, row: Record<string, unknown>): CharacterFull {
  const system = getSystem(c.system_id)
  const record: CharacterRecord = {
    id: c.id,
    system_id: c.system_id,
    name: row.name as string,
    level: row.level as number,
    stats: system.schemas.stats.parse(row.stats) as CharacterRecord['stats'],
    resources: system.schemas.resources.parse(row.resources) as CharacterRecord['resources'],
    conditions: row.conditions as string[],
    details: system.schemas.details.parse(row.details) as CharacterRecord['details'],
  }
  // Picks and items did not change with this row, so derived values are recomputed from the cached ones.
  return { ...c, ...record, derived: system.rules.derived(record, toRuleInput(c.picks, c.items)) }
}

/**
 * Keeps the party's cached characters live: subscribes to UPDATEs of exactly their rows (the select
 * policy decides what each subscriber receives), folds each change into the cache, and refetches when
 * the connection comes back after a drop. `connected` is false while the channel is down.
 */
export function usePartyRealtime(campaign: CampaignFull | undefined): { connected: boolean } {
  const qc = useQueryClient()
  const [connected, setConnected] = useState(true)
  const wasDown = useRef(false)
  const campaignId = campaign?.id
  const idsKey = partyCharacterIds(campaign).join(',')

  useEffect(() => {
    if (!campaignId || !idsKey) return
    let closed = false
    const refetch = () => qc.invalidateQueries({ queryKey: qk.party(campaignId) })

    const channel = supabase
      .channel(`party:${campaignId}:${idsKey}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=in.(${idsKey})` },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          let failed = false
          qc.setQueriesData<CharacterFull[]>({ queryKey: qk.party(campaignId) }, (list) =>
            list?.map((c) => {
              if (c.id !== row.id) return c
              try {
                return applyRow(c, row)
              } catch {
                failed = true
                return c
              }
            }),
          )
          if (failed) refetch()
        },
      )
      .subscribe((status) => {
        if (closed) return
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          if (wasDown.current) {
            wasDown.current = false
            refetch()
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasDown.current = true
          setConnected(false)
        }
      })

    return () => {
      closed = true
      supabase.removeChannel(channel)
    }
  }, [campaignId, idsKey, qc])

  return { connected }
}
