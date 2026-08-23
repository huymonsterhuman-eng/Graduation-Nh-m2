import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, Review } from '@/types/api'

export function useProductReviews(productId: number | undefined, page = 0, size = 10) {
  return useQuery({
    queryKey: ['product-reviews', productId, page, size],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<Review>>>(
        `/catalog/products/${productId}/reviews`,
        { params: { page, size } }
      )
      return data.data!
    },
  })
}

// ================== Admin moderation ==================

export function useAdminReviews(isHidden: boolean | null, page = 0, size = 20) {
  return useQuery({
    queryKey: ['admin', 'reviews', { isHidden, page, size }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size }
      if (isHidden !== null) params.isHidden = isHidden
      const { data } = await api.get<ApiResponse<PagedResponse<Review>>>('/admin/reviews', { params })
      return data.data!
    },
  })
}

export function useToggleReviewHidden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, hidden }: { id: number; hidden: boolean }) => {
      const { data } = await api.put<ApiResponse<Review>>(`/admin/reviews/${id}/hide`, { hidden })
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      qc.invalidateQueries({ queryKey: ['product-reviews'] })
    },
  })
}

export function useReplyReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      const { data } = await api.put<ApiResponse<Review>>(`/admin/reviews/${id}/reply`, { reply })
      if (!data.success) throw new Error(data.message || 'Gửi phản hồi thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      qc.invalidateQueries({ queryKey: ['product-reviews'] })
    },
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/reviews/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      qc.invalidateQueries({ queryKey: ['product-reviews'] })
    },
  })
}
