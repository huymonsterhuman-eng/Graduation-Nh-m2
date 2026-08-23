import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminUiState {
  sidebarCollapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

export const useAdminUi = create<AdminUiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileOpen: false,
      toggleCollapsed: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: 'lw-admin-ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
)
