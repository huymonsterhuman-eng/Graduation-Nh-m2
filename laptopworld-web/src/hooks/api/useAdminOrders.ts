import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { OrderDetail, OrderListItem, OrderStatus, PagedResponse } from '@/types/api'

export interface AdminOrdersFilter {
  keyword?: string
  status?: OrderStatus
  from?: string   // yyyy-MM-dd
  to?: string
  page?: number
  size?: number
}

export type OrderStatusCounts = Record<OrderStatus, number>

export function useOrderStatusCounts() {
  return useQuery({
    queryKey: ['admin', 'orders-status-counts'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, number>>>(
        '/admin/orders/status-counts'
      )
      return (data.data ?? {}) as OrderStatusCounts
    },
  })
}

export function useAdminOrders(f: AdminOrdersFilter) {
  const params = new URLSearchParams()
  if (f.keyword) params.set('keyword', f.keyword)
  if (f.status) params.set('status', f.status)
  if (f.from) params.set('from', f.from)
  if (f.to) params.set('to', f.to)
  params.set('page', String(f.page ?? 0))
  params.set('size', String(f.size ?? 20))

  return useQuery({
    queryKey: ['admin', 'orders', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<OrderListItem>>>(
        `/admin/orders?${params.toString()}`
      )
      return data.data
    },
  })
}

export function useAdminOrderDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OrderDetail>>(`/admin/orders/${id}`)
      return data.data
    },
  })
}

export interface UpdateOrderStatusBody {
  status: OrderStatus
  adminNote?: string
  trackingNumber?: string
}

export interface UserPickResult {
  id: number
  username: string
  email: string
  fullName?: string
  phone?: string
}

/** Search user cho picker (tạo đơn thay khách). */
export function useAdminUserSearch(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'user-search', keyword],
    enabled: enabled && keyword.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UserPickResult[]>>(
        `/admin/users/search?keyword=${encodeURIComponent(keyword)}`
      )
      return data.data ?? []
    },
  })
}

/** Lấy address book của 1 user cụ thể (cho admin). */
export function useUserAddresses(userId: number | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'user-addresses', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Array<{
        id: number; name: string; phone: string; address: string;
        ward?: string; district?: string; province?: string; isDefault: boolean;
      }>>>(`/addresses/of-user/${userId}`)
      return data.data ?? []
    },
  })
}

export interface AdminCreateOrderInput {
  userId: number
  addressId?: number
  manualName?: string
  manualPhone?: string
  manualAddress?: string
  items: Array<{ productId: number; quantity: number }>
  paymentMethod: 'cod' | 'vnpay' | 'momo'
  adminNote?: string
}

export function useCreateAdminOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: AdminCreateOrderInput) => {
      const { data } = await api.post<ApiResponse<OrderDetail>>('/admin/orders', body)
      if (!data.success) throw new Error(data.message || 'Tạo đơn thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders-status-counts'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: UpdateOrderStatusBody }) => {
      const { data } = await api.put<ApiResponse<OrderDetail>>(`/admin/orders/${id}/status`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'order', vars.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'pending-counts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'issues'] })
    },
  })
}
