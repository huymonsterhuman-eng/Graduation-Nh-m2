import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { SearchResult } from '@/types/api'

/**
 * Semantic search thuần vector (Phase 5) — không có filter cứng.
 * Backend endpoint: GET /api/catalog/search/semantic?q=&limit=
 * Đang chỉ được dùng ở màn debug/legacy; sản phẩm mới dùng useHybridSearch.
 */
export function useSemanticSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: ['semantic-search', query, limit],
    enabled: !!query && query.trim().length > 0,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SearchResult[]>>('/catalog/search/semantic', {
        params: { q: query, limit },
      })
      return data.data ?? []
    },
  })
}

export interface HybridSearchFilter {
  q?: string
  categoryId?: number
  brandId?: number
  minPrice?: number
  maxPrice?: number
  /** Filter theo spec JSONB: {key: [values]} — cùng key OR, khác key AND. */
  specs?: Record<string, string[]>
  limit?: number
}

/**
 * Hybrid search — filter cứng SQL (category/brand/giá) + rerank ngữ nghĩa vector khi có q.
 * Backend endpoint: GET /api/catalog/search/hybrid.
 *
 * - Không có q → SQL thuần, 0 token Gemini, similarity = 0.
 * - Có q → embed + rerank trong tập đã prefilter, similarity > 0.
 */
export function useHybridSearch(filter: HybridSearchFilter) {
  const key: [string, HybridSearchFilter] = ['hybrid-search', filter]
  const hasAnyFilter =
    !!filter.q?.trim() ||
    filter.categoryId != null ||
    filter.brandId != null ||
    filter.minPrice != null ||
    filter.maxPrice != null ||
    (filter.specs != null && Object.keys(filter.specs).length > 0)
  return useQuery({
    queryKey: key,
    enabled: hasAnyFilter,
    queryFn: async () => {
      // Build params thủ công để hỗ trợ spec.<key>=v lặp nhiều lần
      const params = new URLSearchParams()
      if (filter.q?.trim()) params.set('q', filter.q.trim())
      if (filter.categoryId != null) params.set('categoryId', String(filter.categoryId))
      if (filter.brandId != null) params.set('brandId', String(filter.brandId))
      if (filter.minPrice != null) params.set('minPrice', String(filter.minPrice))
      if (filter.maxPrice != null) params.set('maxPrice', String(filter.maxPrice))
      params.set('limit', String(filter.limit ?? 20))
      if (filter.specs) {
        for (const [k, vs] of Object.entries(filter.specs)) {
          for (const v of vs) if (v) params.append(`spec.${k}`, v)
        }
      }
      const { data } = await api.get<ApiResponse<SearchResult[]>>(
        `/catalog/search/hybrid?${params.toString()}`
      )
      return data.data ?? []
    },
  })
}
