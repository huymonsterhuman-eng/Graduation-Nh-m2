/**
 * Wrapper localStorage cho auth tokens.
 * Trong Zustand persist đã lo state chính, đây là snapshot đơn giản cho
 * Axios interceptor đọc trực tiếp (không cần import store, tránh vòng lặp).
 */
const ACCESS_KEY = 'lw_access_token'
const REFRESH_KEY = 'lw_refresh_token'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
