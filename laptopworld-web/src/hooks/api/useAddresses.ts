import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Address } from '@/types/api'

const KEY = ['addresses']

export interface AddressPayload {
  name: string
  phone: string
  address: string
  ward?: string
  district?: string
  province?: string
  isDefault?: boolean
}

export function useAddresses() {
  const isLoggedIn = !!useAuthStore((s) => s.user)
  return useQuery({
    queryKey: KEY,
    enabled: isLoggedIn,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Address[]>>('/addresses')
      return data.data ?? []
    },
  })
}

export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddressPayload) => {
      const { data } = await api.post<ApiResponse<Address>>('/addresses', payload)
      return data.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AddressPayload }) => {
      const { data } = await api.put<ApiResponse<Address>>(`/addresses/${id}`, payload)
      return data.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/addresses/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetDefaultAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.put(`/addresses/${id}/set-default`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
