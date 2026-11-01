import { create } from 'zustand'

type SectionStore = {
  collapsed: Record<string, boolean>
  isCollapsed: (id: string) => boolean
  toggle: (id: string) => void
}

export const useSectionStore = create<SectionStore>((set, get) => ({
  collapsed: {},
  isCollapsed: (id) => get().collapsed[id] ?? false,
  toggle: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
}))
