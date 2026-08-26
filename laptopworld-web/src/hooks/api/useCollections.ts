import { useQuery, useQueries } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Collection, HomePosition, ProductListItem } from '@/types/api'

/**
 * Danh sách collection theo vị trí trên homepage.
 * Position: 'FEATURED_BLOCK' | 'PHONE_CHIP' | 'LAPTOP_CHIP' | 'NONE'.
 * ADMIN gán qua form Collection.
 */
export function useCollectionsByPosition(position: HomePosition) {
  return useQuery({
    queryKey: ['collections-by-position', position],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Collection[]>>(
        `/catalog/collections/by-position/${position}`
      )
      return data.data ?? []
    },
  })
}

/**
 * Danh sách collection được đánh dấu Nổi bật (isFeatured=true).
 * Dùng cho section "Bộ sưu tập nổi bật" trên HomePage.
 * Độc lập với homePosition — 1 collection có thể vừa là chip Laptop vừa là featured.
 */
export function useHomeCollections() {
  return useQuery({
    queryKey: ['collections-featured'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Collection[]>>('/catalog/collections/featured')
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
