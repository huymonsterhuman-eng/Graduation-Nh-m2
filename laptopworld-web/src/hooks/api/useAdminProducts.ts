import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, ProductListItem, ProductDetail } from '@/types/api'

// ============ Enums / types ============

export type StockStatus = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK'

export interface AdminProductFilter {
  keyword?: string
  categoryId?: number | null
  brandId?: number | null
  isActive?: boolean | null   // null = all, true = active, false = inactive
  stockStatus?: StockStatus
  page?: number
  size?: number
}

export interface ProductImageInput {
  path: string
  alt?: string
  sortOrder?: number
  isPrimary?: boolean
}

export interface ProductInput {
  name: string
  slug?: string
  sku?: string
  shortDescription?: string
  description?: string
  price: number
  salePrice?: number | null
  costPrice?: number | null
  brandId?: number | null
  categoryId?: number | null
  specs?: Record<string, unknown> | null
  stock?: number
  isFeatured?: boolean
  isActive?: boolean
  images?: ProductImageInput[]
}

// ============ List ============

export function useAdminProducts(f: AdminProductFilter) {
  const params = new URLSearchParams()
  if (f.keyword) params.set('keyword', f.keyword)
  if (f.categoryId != null) params.set('categoryId', String(f.categoryId))
  if (f.brandId != null) params.set('brandId', String(f.brandId))
  if (f.isActive != null) params.set('isActive', String(f.isActive))
  if (f.stockStatus && f.stockStatus !== 'ALL') params.set('stockStatus', f.stockStatus)
  params.set('page', String(f.page ?? 0))
  params.set('size', String(f.size ?? 20))

  return useQuery({
    queryKey: ['admin', 'products', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<ProductListItem>>>(
        `/admin/products?${params.toString()}`
      )
      return data.data
    },
  })
}

export function useDeletedProducts(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'products-deleted'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductListItem[]>>('/admin/products/deleted')
      return data.data ?? []
    },
  })
}

// ============ Detail ============

export function useAdminProductDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductDetail>>(`/admin/products/${id}`)
      return data.data
    },
  })
}

// ============ Mutations ============

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ProductInput) => {
      const { data } = await api.post<ApiResponse<ProductDetail>>('/admin/products', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: ProductInput }) => {
      const { data } = await api.put<ApiResponse<ProductDetail>>(`/admin/products/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'product', vars.id] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/products/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'products-deleted'] })
    },
  })
}

/** Toggle nhanh trạng thái kinh doanh — dùng cho Switch inline trong list. */
export function useToggleProductActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch<ApiResponse<ProductDetail>>(
        `/admin/products/${id}/active`,
        { isActive }
      )
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useRestoreProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ApiResponse<void>>(`/admin/products/${id}/restore`)
      if (!data.success) throw new Error(data.message || 'Khôi phục thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['admin', 'products-deleted'] })
    },
  })
}

// ============ AI embed ============

export interface EmbedResult {
  productId?: number
  productName?: string
  dimensions?: number
  durationMs?: number
  totalProducts?: number
  embedded?: number
  skipped?: number
  failed?: number
}

export function useReembedProduct() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ApiResponse<EmbedResult>>(`/admin/ai/embed-products/${id}`)
      if (!data.success) throw new Error(data.message || 'Re-embed thất bại')
      return data.data
    },
  })
}

export function useReembedAll() {
  return useMutation({
    mutationFn: async (force = false) => {
      const { data } = await api.post<ApiResponse<EmbedResult>>(
        `/admin/ai/embed-products?force=${force}`
      )
      if (!data.success) throw new Error(data.message || 'Embed thất bại')
      return data.data
    },
  })
}
