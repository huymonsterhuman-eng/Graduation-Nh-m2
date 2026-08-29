import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Voucher, VoucherCheckResult, VoucherType } from '@/types/api'

export function useAvailableVouchers() {
  const isLoggedIn = !!useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['vouchers-available'],
    enabled: isLoggedIn,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Voucher[]>>('/vouchers/available')
      return data.data ?? []
    },
  })
}

export function useMyVouchers() {
  const isLoggedIn = !!useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['vouchers-mine'],
    enabled: isLoggedIn,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Voucher[]>>('/vouchers/mine')
      return data.data ?? []
    },
  })
}

/** Preview check voucher với subtotal — không mark used. */
export async function checkVoucherApi(code: string, subtotal: number): Promise<VoucherCheckResult> {
  const { data } = await api.get<ApiResponse<VoucherCheckResult>>(
    `/vouchers/${encodeURIComponent(code)}/check`,
    { params: { subtotal } }
  )
  return data.data!
}

export function useSaveVoucher() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<ApiResponse<Voucher>>(`/vouchers/${encodeURIComponent(code)}/save`)
      return data.data!
    },
  })
}

// ================== Admin ==================

export interface VoucherInput {
  code: string
  name: string
  type: VoucherType
  discountAmount: number
  minOrderValue?: number
  maxDiscount?: number | null
  startedAt?: string | null   // ISO
  expiresAt?: string | null
  usageLimit?: number | null
  isActive?: boolean
}

export function useAdminVouchers() {
  return useQuery({
    queryKey: ['admin', 'vouchers'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Voucher[]>>('/admin/vouchers')
      return data.data ?? []
    },
  })
}

export function useCreateVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: VoucherInput) => {
      const { data } = await api.post<ApiResponse<Voucher>>('/admin/vouchers', body)
      if (!data.success) throw new Error(data.message || 'Tạo voucher thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vouchers'] })
      qc.invalidateQueries({ queryKey: ['vouchers-available'] })
    },
  })
}

export function useUpdateVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: VoucherInput }) => {
      const { data } = await api.put<ApiResponse<Voucher>>(`/admin/vouchers/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vouchers'] })
      qc.invalidateQueries({ queryKey: ['vouchers-available'] })
    },
  })
}

export function useDeleteVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/vouchers/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vouchers'] })
      qc.invalidateQueries({ queryKey: ['vouchers-available'] })
    },
  })
}
