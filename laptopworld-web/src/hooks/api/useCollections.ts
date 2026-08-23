import { useQuery, useQueries } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Collection, ProductListItem } from '@/types/api'

/** Danh sách collection show trên homepage — chỉ những cái showOnHome + active. */
export function useHomeCollections() {
  return useQuery({
    queryKey: ['collections-home'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Collection[]>>('/catalog/collections/home')
      return data.data ?? []
    },
  })
}

/** SP thuộc collection theo slug — public. */
export function useCollectionProductsBySlug(slug: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['collection-products', slug, limit],
    enabled: !!slug,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductListItem[]>>(
        `/catalog/collections/${slug}/products?limit=${limit}`
      )
      return data.data ?? []
    },
  })
}

/** Batch: cho mỗi collection, load sản phẩm — dùng cho HomePage nhiều block. */
export function useCollectionsWithProducts(slugs: string[], limit = 6) {
  return useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['collection-products', slug, limit],
      staleTime: 60_000,
      queryFn: async (): Promise<ProductListItem[]> => {
        const { data } = await api.get<ApiResponse<ProductListItem[]>>(
          `/catalog/collections/${slug}/products?limit=${limit}`
        )
        return data.data ?? []
      },
    })),
  })
}
