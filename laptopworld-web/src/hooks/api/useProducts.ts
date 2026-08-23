import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, ProductDetail, ProductListItem } from '@/types/api'

export interface ProductFilter {
  keyword?: string
  categoryId?: number
  brandId?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  size?: number
  sort?: string
}

export function useProducts(filter: ProductFilter = {}) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<ProductListItem>>>('/catalog/products', {
        params: {
          keyword: filter.keyword || undefined,
          categoryId: filter.categoryId,
          brandId: filter.brandId,
          minPrice: filter.minPrice,
          maxPrice: filter.maxPrice,
          page: filter.page ?? 0,
          size: filter.size ?? 20,
          sort: filter.sort,
        },
      })
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
