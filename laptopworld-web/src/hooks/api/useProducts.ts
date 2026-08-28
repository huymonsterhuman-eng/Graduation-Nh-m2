import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, ProductDetail, ProductListItem } from '@/types/api'

export interface ProductFilter {
  keyword?: string
  categoryId?: number
  brandId?: number
  minPrice?: number
  maxPrice?: number
  /**
   * Filter theo thông số kỹ thuật (specs JSONB). Key = tên field trong spec_template
   * (VD `ram`, `chip`). Value = mảng các value muốn lọc (cùng key OR, khác key AND).
   * Encode thành query param `spec.<key>=value` (lặp nhiều lần cho multi-value).
   */
  specs?: Record<string, string[]>
  page?: number
  size?: number
  sort?: string
}

export function useProducts(filter: ProductFilter = {}) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: async () => {
      // Build params string thủ công để hỗ trợ `spec.<key>=v` lặp nhiều lần.
      const params = new URLSearchParams()
      if (filter.keyword) params.set('keyword', filter.keyword)
      if (filter.categoryId != null) params.set('categoryId', String(filter.categoryId))
      if (filter.brandId != null) params.set('brandId', String(filter.brandId))
      if (filter.minPrice != null) params.set('minPrice', String(filter.minPrice))
      if (filter.maxPrice != null) params.set('maxPrice', String(filter.maxPrice))
      params.set('page', String(filter.page ?? 0))
      params.set('size', String(filter.size ?? 20))
      if (filter.sort) params.set('sort', filter.sort)
      if (filter.specs) {
        for (const [key, values] of Object.entries(filter.specs)) {
          for (const v of values) {
            if (v) params.append(`spec.${key}`, v)
          }
        }
      }
      const { data } = await api.get<ApiResponse<PagedResponse<ProductListItem>>>(
        `/catalog/products?${params.toString()}`
      )
      return data.data!
    },
  })
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductDetail>>(`/catalog/products/${slug}`)
      return data.data!
    },
  })
}

export function useRelatedProducts(productId: number | undefined, limit = 8) {
  return useQuery({
    queryKey: ['related-products', productId, limit],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductListItem[]>>(
        `/catalog/products/${productId}/related`,
        { params: { limit } }
      )
      return data.data!
    },
  })
}
