import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from '@/lib/storage'

/** Chuẩn ApiResponse của backend LaptopWorld. */
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Gắn Bearer token cho mọi request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// State chống refresh đồng thời — nhiều request 401 chỉ trigger 1 refresh
let isRefreshing = false
let pendingQueue: Array<(token: string | null) => void> = []

function subscribe(cb: (token: string | null) => void) {
  pendingQueue.push(cb)
}
function notify(token: string | null) {
  pendingQueue.forEach((cb) => cb(token))
  pendingQueue = []
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    // Unwrap message tiếng Việt từ BE (ApiResponse.error) và gán vào error.message
    // → mọi nơi dùng (e as Error).message tự nhận VN thay vì "Request failed with status code 400".
    // Nơi đọc err.response?.data?.message trực tiếp không bị ảnh hưởng (vẫn còn ở response).
    const beMessage = error.response?.data?.message
    if (beMessage && typeof beMessage === 'string') {
      error.message = beMessage
    }

    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refresh = tokenStorage.getRefresh()
    if (!refresh) {
      // Không có refresh → yêu cầu login lại
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      // Chờ refresh đang chạy
      return new Promise((resolve, reject) => {
        subscribe((newToken) => {
          if (!newToken) return reject(error)
          if (!original.headers) original.headers = {}
          original.headers.Authorization = `Bearer ${newToken}`
          resolve(api(original))
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post<ApiResponse<RefreshResponse>>(
        '/api/auth/refresh',
        { refreshToken: refresh },
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (!data.success || !data.data) throw new Error('Refresh failed')
      tokenStorage.set(data.data.accessToken, data.data.refreshToken)
      notify(data.data.accessToken)
      if (!original.headers) original.headers = {}
      original.headers.Authorization = `Bearer ${data.data.accessToken}`
      return api(original)
    } catch (e) {
      notify(null)
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(e)
    } finally {
      isRefreshing = false
    }
  }
)
