import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse, PostCategory, PostDetail, PostListItem } from '@/types/api'

// ================== Post Categories ==================

export interface PostCategoryInput {
  name: string
  slug?: string
  description?: string
}

export function useAdminPostCategories() {
  return useQuery({
    queryKey: ['admin', 'post-categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PostCategory[]>>('/admin/post-categories')
      return data.data ?? []
    },
  })
}

export function useCreatePostCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PostCategoryInput) => {
      const { data } = await api.post<ApiResponse<PostCategory>>('/admin/post-categories', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'post-categories'] })
      qc.invalidateQueries({ queryKey: ['post-categories'] })
    },
  })
}

export function useUpdatePostCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: PostCategoryInput }) => {
      const { data } = await api.put<ApiResponse<PostCategory>>(`/admin/post-categories/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'post-categories'] })
      qc.invalidateQueries({ queryKey: ['post-categories'] })
    },
  })
}

export function useDeletePostCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/post-categories/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'post-categories'] })
      qc.invalidateQueries({ queryKey: ['post-categories'] })
    },
  })
}

// ================== Posts ==================

export interface PostInput {
  title: string
  slug?: string
  postCategoryId?: number | null
  image?: string | null
  excerpt?: string
  content?: string
  isPublished?: boolean
  publishedAt?: string | null
}

export function useAdminPosts(params: {
  keyword?: string
  categoryId?: number | null
  isPublished?: boolean | null
  page?: number
  size?: number
} = {}) {
  return useQuery({
    queryKey: ['admin', 'posts', params],
    queryFn: async () => {
      const query: Record<string, unknown> = {
        page: params.page ?? 0,
        size: params.size ?? 20,
      }
      if (params.keyword) query.keyword = params.keyword
      if (params.categoryId != null) query.categoryId = params.categoryId
      if (params.isPublished != null) query.isPublished = params.isPublished
      const { data } = await api.get<ApiResponse<PagedResponse<PostListItem>>>('/admin/posts', { params: query })
      return data.data!
    },
  })
}

export function useAdminPostDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'post', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PostDetail>>(`/admin/posts/${id}`)
      return data.data!
    },
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PostInput) => {
      const { data } = await api.post<ApiResponse<PostDetail>>('/admin/posts', body)
      if (!data.success) throw new Error(data.message || 'Tạo bài viết thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: PostInput }) => {
      const { data } = await api.put<ApiResponse<PostDetail>>(`/admin/posts/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'post', vars.id] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/posts/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
