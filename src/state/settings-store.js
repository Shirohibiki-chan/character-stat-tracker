import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(persist(
  (set) => ({
    theme: 'default',
    defaultView: 'table',
    pageSize: 50,
    compactMode: false,
    setTheme:       (t) => set({ theme: t }),
    setDefaultView: (v) => set({ defaultView: v }),
    setPageSize:    (n) => set({ pageSize: n }),
    setCompactMode: (b) => set({ compactMode: b }),
  }),
  { name: 'charsnap-settings' }
))
