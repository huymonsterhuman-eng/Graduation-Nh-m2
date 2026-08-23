import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Review } from '@/types/api'

export interface CreateReviewPayload {
  productId: number
  rating: number
  comment?: string
  image?: string
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await api.post<ApiResponse<Review>>('/reviews', payload)
      return data.data!
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['product-reviews', vars.productId] })
      qc.invalidateQueries({ queryKey: ['product'] })  // để rating summary refresh
    },
  })
}
