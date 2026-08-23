import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { Brand, Category, Collection, SpecField, ProductListItem, PagedResponse } from '@/types/api'

// ================== Brands ==================

export function useAdminBrands() {
  return useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Brand[]>>('/admin/brands')
      return data.data ?? []
    },
  })
}

export interface BrandInput {
  name: string
  slug?: string
  logo?: string | null
  description?: string
  isActive?: boolean
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: BrandInput) => {
      const { data } = await api.post<ApiResponse<Brand>>('/admin/brands', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'brands'] })
      qc.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useUpdateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: BrandInput }) => {
      const { data } = await api.put<ApiResponse<Brand>>(`/admin/brands/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'brands'] })
      qc.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useDeleteBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/brands/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'brands'] })
      qc.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

// ================== Categories ==================

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/admin/categories')
      return data.data ?? []
    },
  })
}

export interface CategoryInput {
  name: string
  slug?: string
  parentId?: number | null
  description?: string
  image?: string | null
  specTemplate?: SpecField[] | null
  isActive?: boolean
  sortOrder?: number
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CategoryInput) => {
      const { data } = await api.post<ApiResponse<Category>>('/admin/categories', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: CategoryInput }) => {
      const { data } = await api.put<ApiResponse<Category>>(`/admin/categories/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/categories/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// ================== Collections ==================

export function useAdminCollections() {
  return useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Collection[]>>('/admin/collections')
      return data.data ?? []
    },
  })
}

export interface CollectionInput {
  name: string
  slug?: string
  image?: string | null
  description?: string
  parentId?: number | null
  isActive?: boolean
  showOnHome?: boolean
  sortOrder?: number
}

export function useCreateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CollectionInput) => {
      const { data } = await api.post<ApiResponse<Collection>>('/admin/collections', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  })
}

export function useUpdateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: CollectionInput }) => {
      const { data } = await api.put<ApiResponse<Collection>>(`/admin/collections/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  })
}

export function useDeleteCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/collections/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  })
}

/** List SP trong collection — dùng cho dialog quản lý SP. */
export function useCollectionProducts(id: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'collection-products', id],
    enabled: enabled && !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductListItem[]>>(`/admin/collections/${id}/products`)
      return data.data ?? []
    },
  })
}

/** Thêm nhiều SP vào collection. */
export function useAddProductsToCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productIds }: { id: number; productIds: number[] }) => {
      const { data } = await api.post<ApiResponse<Collection>>(`/admin/collections/${id}/products`, productIds)
      if (!data.success) throw new Error(data.message || 'Thêm thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
      qc.invalidateQueries({ queryKey: ['admin', 'collection-products', vars.id] })
    },
  })
}

/** Xóa 1 SP khỏi collection. */
export function useRemoveProductFromCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productId }: { id: number; productId: number }) => {
      const { data } = await api.delete<ApiResponse<Collection>>(`/admin/collections/${id}/products/${productId}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
      qc.invalidateQueries({ queryKey: ['admin', 'collection-products', vars.id] })
    },
  })
}

/** Search sản phẩm để chọn thêm vào collection. Dùng /api/catalog/products?keyword= */
export function useProductSearch(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'product-search', keyword],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<ProductListItem>>>(
        `/catalog/products?keyword=${encodeURIComponent(keyword)}&size=20`
      )
      return data.data?.content ?? []
    },
  })
}
