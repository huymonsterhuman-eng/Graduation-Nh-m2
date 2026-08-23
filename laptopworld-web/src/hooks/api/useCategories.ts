import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Brand, Category } from '@/types/api'

/** Danh mục dạng tree (cha có mảng children). */
export function useCategories() {
  return useQuery({
    queryKey: ['categories-tree'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/catalog/categories/tree')
      return data.data ?? []
    },
  })
}

/** Danh mục flat — dùng khi cần list tất cả (VD dropdown). */
export function useCategoriesFlat() {
  return useQuery({
    queryKey: ['categories-flat'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/catalog/categories')
      return data.data ?? []
    },
  })
}

/** Recursive tìm category theo slug trong tree. */
function findInTree(tree: Category[], slug: string): Category | undefined {
  for (const c of tree) {
    if (c.slug === slug) return c
    if (c.children) {
      const found = findInTree(c.children, slug)
      if (found) return found
    }
  }
  return undefined
}

export function useCategoryBySlug(slug: string | undefined) {
  const { data: tree, isLoading } = useCategories()
  const category = slug && tree ? findInTree(tree, slug) : undefined
  return { data: category, isLoading }
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Brand[]>>('/catalog/brands')
      return data.data ?? []
    },
  })
}
