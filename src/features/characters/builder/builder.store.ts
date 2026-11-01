// Character builder wizard state: which system is being built and its draft. Every edit goes
// through the system's pruneDraft so dependent choices (subclass, spells…) stay consistent.
import { create } from 'zustand'
import { getSystem } from '@/systems/registry'
import type { BuilderStepDef, Draft, SystemId } from '@/systems/types'

type BuilderState = {
  systemId: SystemId | null
  draft: Draft
  start(systemId: SystemId): void
  update(patch: Partial<Draft>): void
  reset(): void
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  systemId: null,
  draft: {},
  start: (systemId) => set({ systemId, draft: getSystem(systemId).builder.initialDraft() }),
  update: (patch) => {
    const { systemId, draft } = get()
    if (!systemId) return
    set({ draft: getSystem(systemId).builder.pruneDraft(draft, patch) })
  },
  reset: () => set({ systemId: null, draft: {} }),
}))

/** Steps the draft currently shows (a step's `skip` hides it, e.g. Spells for a Fighter). */
export function visibleSteps(steps: BuilderStepDef[], draft: Draft): BuilderStepDef[] {
  return steps.filter((s) => !s.skip?.(draft))
}
