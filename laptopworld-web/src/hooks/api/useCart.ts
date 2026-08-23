import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Cart } from '@/types/api'

const CART_KEY = ['cart']

/** GET /api/cart — chỉ chạy khi login. */
export function useCart() {
  const isLoggedIn = !!useAuthStore((s) => s.user)
  return useQuery({
    queryKey: CART_KEY,
    enabled: isLoggedIn,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Cart>>('/cart')
      return data.data!
    },
  })
}

export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { productId: number; quantity: number }) => {
      const { data } = await api.post<ApiResponse<Cart>>('/cart/items', payload)
      return data.data!
    },
    onSuccess: (cart) => qc.setQueryData(CART_KEY, cart),
  })
}

export function useUpdateCartItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const { data } = await api.put<ApiResponse<Cart>>(`/cart/items/${itemId}`, { quantity })
      return data.data!
    },
    onSuccess: (cart) => qc.setQueryData(CART_KEY, cart),
  })
}

export function useRemoveCartItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete<ApiResponse<Cart>>(`/cart/items/${itemId}`)
      return data.data!
    },
    onSuccess: (cart) => qc.setQueryData(CART_KEY, cart),
  })
}

export function useClearCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/cart')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEY }),
  })
}
