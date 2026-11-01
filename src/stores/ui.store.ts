import { create } from 'zustand'

type UIStore = {
  collapsed: Record<string, boolean>
  isCollapsed: (key: string) => boolean
  toggleSection: (key: string) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  collapsed: {},
  isCollapsed: (key) => get().collapsed[key] ?? false,
  toggleSection: (key) =>
    set((state) => ({
      collapsed: { ...state.collapsed, [key]: !state.collapsed[key] },
    })),
}))
