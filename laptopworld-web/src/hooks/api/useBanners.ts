import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Banner } from '@/types/api'

// ================== Public ==================

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Banner[]>>('/banners')
      return data.data ?? []
    },
  })
}

// ================== Admin ==================

export interface BannerInput {
  title?: string
  image: string
  link?: string
  sortOrder?: number
  isActive?: boolean
}

export function useAdminBanners() {
  return useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Banner[]>>('/admin/banners')
      return data.data ?? []
    },
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: BannerInput) => {
      const { data } = await api.post<ApiResponse<Banner>>('/admin/banners', body)
      if (!data.success) throw new Error(data.message || 'Tạo banner thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] })
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: BannerInput }) => {
      const { data } = await api.put<ApiResponse<Banner>>(`/admin/banners/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] })
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/banners/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] })
      qc.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}
