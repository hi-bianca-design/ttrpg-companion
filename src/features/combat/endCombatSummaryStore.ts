import { useSyncExternalStore } from 'react'

type EndSummary = { round: number; xp: number | null }

/**
 * Two small pieces of module state, both keyed by campaign, that let the summary outlive the GM screen:
 * - the live snapshot, written by GmCombatScreen while it is mounted (round and XP as of now), and
 * - the pending summary, set once an end call succeeds and read by the host that stays mounted in PartyPage.
 * The screen unmounts as soon as combat ends, and the server has already deleted the entries by then, so the
 * numbers must be taken from the snapshot *before* the end call.
 */
const snapshots = new Map<string, EndSummary>()
let pending: { campaignId: string; summary: EndSummary } | null = null
const listeners = new Set<() => void>()

export const setSnapshot = (campaignId: string, s: EndSummary) => void snapshots.set(campaignId, s)
export const clearSnapshot = (campaignId: string) => void snapshots.delete(campaignId)
export const takeSnapshot = (campaignId: string): EndSummary | null => snapshots.get(campaignId) ?? null

function emit() {
  listeners.forEach((l) => l())
}

export function showEndSummary(campaignId: string, summary: EndSummary) {
  pending = { campaignId, summary }
  emit()
}

export function dismissEndSummary() {
  pending = null
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

/** The summary waiting to be shown for this campaign, or null. */
export function usePendingEndSummary(campaignId: string): EndSummary | null {
  const p = useSyncExternalStore(subscribe, () => pending, () => pending)
  return p && p.campaignId === campaignId ? p.summary : null
}
