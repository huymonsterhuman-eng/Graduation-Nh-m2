import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { OrderDetail, OrderListItem, OrderStatus, PagedResponse, PaymentMethod } from '@/types/api'

export interface CheckoutPayload {
  addressId: number
  paymentMethod: PaymentMethod
  voucherCode?: string
  shippingMethod?: string
  shippingFee: number
  customerNote?: string
}

export function useMyOrders(status: OrderStatus | undefined, page = 0, size = 10) {
  const isLoggedIn = !!useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['my-orders', status, page, size],
    enabled: isLoggedIn,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<OrderListItem>>>('/orders', {
        params: { status, page, size },
      })
      return data.data!
    },
  })
}

export function useOrderByCode(code: string | undefined) {
  return useQuery({
    queryKey: ['order', code],
    enabled: !!code,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OrderDetail>>(`/orders/${code}`)
      return data.data!
    },
  })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const { data } = await api.post<ApiResponse<OrderDetail>>('/checkout', payload)
      return data.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<ApiResponse<OrderDetail>>(`/orders/${code}/cancel`)
      return data.data!
    },
    onSuccess: (order) => {
      qc.setQueryData(['order', order.code], order)
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
}
