import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, PostCategory, PostDetail, PostListItem } from '@/types/api'

export function usePostCategories() {
  return useQuery({
    queryKey: ['post-categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PostCategory[]>>('/blog/post-categories')
      return data.data ?? []
    },
  })
}

export function usePosts(params: { keyword?: string; categoryId?: number; page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<PostListItem>>>('/blog/posts', {
        params: {
          keyword: params.keyword || undefined,
          categoryId: params.categoryId,
          page: params.page ?? 0,
          size: params.size ?? 12,
        },
      })
      return data.data!
    },
  })
}

export function usePostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['post', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PostDetail>>(`/blog/posts/${slug}`)
      return data.data!
    },
  })
}
