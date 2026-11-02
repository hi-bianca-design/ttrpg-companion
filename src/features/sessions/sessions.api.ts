import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { unwrap } from '@/features/errors'

export type Session = Database['public']['Tables']['sessions']['Row']

/** The campaign's active session, or null when nobody has opened one. */
export async function getActiveSession(campaignId: string): Promise<Session | null> {
  const res = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
    .maybeSingle()
  return unwrap(res) ?? null
}

/** Any active member; returns the already-active session if there is one. */
export async function openSession(campaignId: string): Promise<Session> {
  return unwrap(await supabase.rpc('open_session', { p_campaign_id: campaignId }))
}

/** GM or the opener. Also ends combat and clears the turn. */
export async function endSession(sessionId: string): Promise<Session> {
  return unwrap(await supabase.rpc('end_session', { p_session_id: sessionId }))
}

/** Any active member may enter combat; ending is for the GM or whoever entered it. */
export async function setCombat(sessionId: string, inCombat: boolean): Promise<Session> {
  return unwrap(await supabase.rpc('set_combat', { p_session_id: sessionId, p_in_combat: inCombat }))
}

/** GM only, while in combat. `null` clears the turn. */
export async function setTurn(sessionId: string, userId: string | null): Promise<Session> {
  // Generated Args can't express a nullable parameter; the function accepts null to clear.
  return unwrap(await supabase.rpc('set_turn', { p_session_id: sessionId, p_user_id: userId as string }))
}

/** The current turn holder ends their own turn. */
export async function endTurn(sessionId: string): Promise<Session> {
  return unwrap(await supabase.rpc('end_turn', { p_session_id: sessionId }))
}
