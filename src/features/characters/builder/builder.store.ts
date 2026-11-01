// Character builder wizard state: which system is being built and its draft. Every edit goes
// through the system's pruneDraft so dependent choices (subclass, spells…) stay consistent.
import { create } from 'zustand'
import { getSystem } from '@/systems/registry'
import type { BuilderStepDef, Draft, SystemId } from '@/systems/types'

type BuilderState = {
  systemId: SystemId | null
  draft: Draft
  /** The wizard is leaving on purpose (character saved or draft discarded): no discard prompt, and
   * still-mounted step screens render nothing instead of redirecting back in once the store is reset. */
  exiting: boolean
  start(systemId: SystemId): void
  update(patch: Partial<Draft>): void
  exit(): void
  reset(): void
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  systemId: null,
  draft: {},
  exiting: false,
  start: (systemId) => set({ systemId, draft: getSystem(systemId).builder.initialDraft(), exiting: false }),
  update: (patch) => {
    const { systemId, draft } = get()
    if (!systemId) return
    set({ draft: getSystem(systemId).builder.pruneDraft(draft, patch) })
  },
  exit: () => set({ exiting: true }),
  // Keeps `exiting`: the screens being dismissed still read it after the reset.
  reset: () => set({ systemId: null, draft: {} }),
}))

/** True once the draft holds any choice beyond the system's starting draft. */
export function isDraftDirty(systemId: SystemId | null, draft: Draft): boolean {
  if (!systemId) return false
  return JSON.stringify(draft) !== JSON.stringify(getSystem(systemId).builder.initialDraft())
}

/** Steps the draft currently shows (a step's `skip` hides it, e.g. Spells for a Fighter). */
export function visibleSteps(steps: BuilderStepDef[], draft: Draft): BuilderStepDef[] {
  return steps.filter((s) => !s.skip?.(draft))
}
