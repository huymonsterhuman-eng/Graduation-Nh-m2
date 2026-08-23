import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { SearchResult } from '@/types/api'

/**
 * Semantic search dùng Gemini embedding (Phase 5).
 * Backend endpoint: GET /api/catalog/search/semantic?q=&limit=
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
