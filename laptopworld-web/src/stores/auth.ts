import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type ApiResponse } from '@/lib/api'
import { tokenStorage } from '@/lib/storage'

export interface AuthUser {
  id: number
  username: string
  email: string
  fullName?: string
  roles: string[]
  permissions?: string[]
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInSeconds: number
  user: AuthUser
}

/** Nguồn login — dùng để phân biệt session customer vs session admin. */
export type LoginSource = 'admin' | 'customer'

interface AuthState {
  user: AuthUser | null
  isReady: boolean
  /**
   * Nguồn login của session hiện tại.
   * - `'admin'`: user login qua /admin/dang-nhap → được vào /admin/*
   * - `'customer'`: user login qua /dang-nhap → KHÔNG vào được /admin/* (phải login lại qua form admin)
   * - `null`: chưa login (hoặc session cũ trước khi có tracking này)
   */
  loginSource: LoginSource | null
  isAuthenticated: () => boolean
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  /** ADMIN bypass true. Ngược lại check user.permissions. */
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (...perms: string[]) => boolean
  login: (usernameOrEmail: string, password: string, source: LoginSource) => Promise<void>
  logout: () => Promise<void>
  loadCurrentUser: () => Promise<void>
  setUser: (u: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isReady: false,
      loginSource: null,

      isAuthenticated: () => !!get().user && !!tokenStorage.getAccess(),

      hasRole: (role) => {
        const roles = get().user?.roles ?? []
        return roles.some((r) => r === role || r === `ROLE_${role}` || r.replace(/^ROLE_/, '') === role)
      },

      isAdmin: () => {
        const roles = get().user?.roles ?? []
        return roles.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN')
      },

      hasPermission: (perm) => {
        if (!perm) return true
        const u = get().user
        if (!u) return false
        // ADMIN bypass mọi permission check
        if (u.roles?.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN')) return true
        return (u.permissions ?? []).includes(perm)
      },

      hasAnyPermission: (...perms) => {
        if (perms.length === 0) return true
        const u = get().user
        if (!u) return false
        if (u.roles?.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN')) return true
        const list = u.permissions ?? []
        return perms.some((p) => list.includes(p))
      },

      login: async (usernameOrEmail, password, source) => {
        const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
          usernameOrEmail,
          password,
        })
        if (!data.success || !data.data) {
          throw new Error(data.message || 'Đăng nhập thất bại')
        }
        tokenStorage.set(data.data.accessToken, data.data.refreshToken)
        set({ user: data.data.user, isReady: true, loginSource: source })
      },

      logout: async () => {
        try {
          const refresh = tokenStorage.getRefresh()
          if (refresh) {
            await api.post('/auth/logout', { refreshToken: refresh }).catch(() => {})
          }
        } finally {
          tokenStorage.clear()
          set({ user: null, isReady: true, loginSource: null })
        }
      },

      loadCurrentUser: async () => {
        if (!tokenStorage.getAccess()) {
          set({ isReady: true })
          return
        }
        try {
          const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me')
          if (data.success && data.data) {
            set({ user: data.data, isReady: true })
          } else {
            tokenStorage.clear()
            set({ user: null, isReady: true, loginSource: null })
          }
        } catch {
          tokenStorage.clear()
          set({ user: null, isReady: true, loginSource: null })
        }
      },

      setUser: (u) => set({ user: u }),
    }),
    {
      name: 'lw-auth',
      partialize: (s) => ({ user: s.user, loginSource: s.loginSource }),  // token đã trong tokenStorage
    }
  )
)

// Đăng ký listener khi Axios interceptor phát event logout
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.setState({ user: null, loginSource: null })
  })
}
