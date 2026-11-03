import { useQueryClient } from '@tanstack/react-query'
import type { CampaignFull } from '@/features/campaigns/campaigns.api'
import type { CharacterFull } from '@/features/characters/characters.api'
import { toRuleInput } from '@/features/characters/picks'
import { useRealtimeChannel } from '@/lib/useRealtimeChannel'
import { qk } from '@/lib/query-client'
import { getSystem } from '@/systems/registry'
import type { CharacterRecord } from '@/systems/types'
import { partyCharacterIds } from './party.queries'

/**
 * A characters row from a Realtime UPDATE, parsed by its system and folded into the cached character.
 * Columns the payload leaves out (Postgres omits unchanged large jsonb values) keep their cached value.
 * Throws on anything malformed so the caller refetches instead of caching it.
 */
function applyRow(c: CharacterFull, row: Record<string, unknown>): CharacterFull {
  const system = getSystem(c.system_id)
  const { name, level, conditions } = row
  if (typeof name !== 'string' || typeof level !== 'number') throw new Error('malformed party row')
  if (!Array.isArray(conditions) || !conditions.every((x) => typeof x === 'string')) throw new Error('malformed party row')
  const record: CharacterRecord = {
    id: c.id,
    system_id: c.system_id,
    name,
    level,
    stats: row.stats === undefined ? c.stats : (system.schemas.stats.parse(row.stats) as CharacterRecord['stats']),
    resources: row.resources === undefined ? c.resources : (system.schemas.resources.parse(row.resources) as CharacterRecord['resources']),
    conditions,
    details: row.details === undefined ? c.details : (system.schemas.details.parse(row.details) as CharacterRecord['details']),
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
  const campaignId = campaign?.id
  const idsKey = partyCharacterIds(campaign).join(',')

  const refetch = () => {
    if (!campaignId) return
    qc.invalidateQueries({ queryKey: qk.party(campaignId) })
    // Members may have joined or left while the page was not listening.
    qc.invalidateQueries({ queryKey: qk.campaign(campaignId) })
  }

  return useRealtimeChannel({
    topic: campaignId && idsKey ? `party:${campaignId}:${idsKey}` : null,
    onSubscribed: refetch,
    bind: (channel) =>
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=in.(${idsKey})` },
        (payload) => {
          if (payload.errors) {
            refetch()
            return
          }
          const row = payload.new as Record<string, unknown>
          let failed = false
          qc.setQueriesData<CharacterFull[]>({ queryKey: qk.party(campaignId!) }, (list) =>
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
      ),
  })
}
