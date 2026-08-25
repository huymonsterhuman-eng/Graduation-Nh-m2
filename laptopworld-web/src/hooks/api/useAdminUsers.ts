import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type {
  AdminUserDetail, AdminUserListItem, AdminUserStatsSummary, AdminUserStatus,
  AdminUserVoucherItem, OrderListItem, PagedResponse, Review,
} from '@/types/api'

export interface AdminUserFilter {
  keyword?: string
  status?: AdminUserStatus | ''
  roleId?: number | ''
  page: number
  size?: number
}

// ==================== Queries ====================

export function useAdminUsers(filter: AdminUserFilter) {
  const params: Record<string, string | number> = { page: filter.page, size: filter.size ?? 20 }
  if (filter.keyword) params.keyword = filter.keyword
  if (filter.status)  params.status  = filter.status
  if (filter.roleId)  params.roleId  = filter.roleId

  return useQuery({
    queryKey: ['admin', 'users', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<AdminUserListItem>>>('/admin/users', { params })
      return data.data
    },
  })
}

export function useAdminUserStats() {
  return useQuery({
    queryKey: ['admin', 'users', 'stats'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminUserStatsSummary>>('/admin/users/stats')
      return data.data
    },
  })
}

export function useAdminUserDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`)
      return data.data
    },
  })
}

// ==================== Tab data cho trang chi tiết ====================

export function useAdminUserOrders(id: number | undefined, page = 0, size = 20) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'orders', page, size],
    enabled: !!id,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<OrderListItem>>>(
        `/admin/users/${id}/orders`, { params: { page, size } })
      return data.data
    },
  })
}

export function useAdminUserReviews(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'reviews'],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Review[]>>(`/admin/users/${id}/reviews`)
      return data.data ?? []
    },
  })
}

export function useAdminUserVouchers(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'vouchers'],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminUserVoucherItem[]>>(`/admin/users/${id}/vouchers`)
      return data.data ?? []
    },
  })
}

export function useAdminUserAddresses(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'addresses'],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<import('@/types/api').Address[]>>(`/addresses/of-user/${id}`)
      return data.data ?? []
    },
  })
}

// ==================== Mutations ====================

export interface CreateUserBody {
  username: string
  email: string
  password: string
  fullName?: string
  phone?: string
  gender?: 'male' | 'female' | 'other' | ''
  birthday?: string   // yyyy-MM-dd
  status?: AdminUserStatus
  roleIds?: number[]
}

export interface UpdateUserBody {
  fullName?: string
  phone?: string
  gender?: 'male' | 'female' | 'other' | ''
  birthday?: string   // yyyy-MM-dd
}

export function useCreateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data } = await api.post<ApiResponse<AdminUserDetail>>('/admin/users', body)
      if (!data.success) throw new Error(data.message || 'Tạo user thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] })
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] })
    },
  })
}

export function useUpdateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: UpdateUserBody }) => {
      const { data } = await api.put<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'user', vars.id] })
    },
  })
}


export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: AdminUserStatus }) => {
      const { data } = await api.post<ApiResponse<AdminUserDetail>>(
        `/admin/users/${id}/status`, { status })
      if (!data.success) throw new Error(data.message || 'Đổi trạng thái thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'user', vars.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] })
    },
  })
}

export function useSetUserRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, roleIds }: { id: number; roleIds: number[] }) => {
      const { data } = await api.post<ApiResponse<AdminUserDetail>>(
        `/admin/users/${id}/roles`, { roleIds })
      if (!data.success) throw new Error(data.message || 'Gán vai trò thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'user', vars.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] })
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] })  // userCount trên role list đổi
    },
  })
}
