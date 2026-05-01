import { create } from 'zustand'
import { WizardDraft, INITIAL_DRAFT } from './character.types'

type CharacterStore = {
  draft: WizardDraft
  setDraftField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void
  setDraft: (partial: Partial<WizardDraft>) => void
  resetDraft: () => void
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  draft: { ...INITIAL_DRAFT },
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),
  resetDraft: () => set({ draft: { ...INITIAL_DRAFT } }),
}))
