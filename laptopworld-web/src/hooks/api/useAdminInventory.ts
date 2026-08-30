import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type {
  Partner, PartnerType,
  GoodsReceiptListItem, GoodsReceipt,
  GoodsIssueListItem, GoodsIssue, GoodsIssueStatus,
  ProductStockSummary, PagedResponse, ProductListItem,
} from '@/types/api'

// ================== Partners ==================

export function usePartners(type?: PartnerType) {
  return useQuery({
    queryKey: ['admin', 'partners', type],
    queryFn: async () => {
      const q = type ? `?type=${type}` : ''
      const { data } = await api.get<ApiResponse<Partner[]>>(`/admin/partners${q}`)
      return data.data ?? []
    },
  })
}

export interface PartnerInput {
  name: string
  code?: string
  type: PartnerType
  phone?: string
  email?: string
  address?: string
  isActive?: boolean
}

export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PartnerInput) => {
      const { data } = await api.post<ApiResponse<Partner>>('/admin/partners', body)
      if (!data.success) throw new Error(data.message || 'Tạo thất bại')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'partners'] }),
  })
}

export function useUpdatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: PartnerInput }) => {
      const { data } = await api.put<ApiResponse<Partner>>(`/admin/partners/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'partners'] }),
  })
}

export function useDeletePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/partners/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'partners'] }),
  })
}

// ================== Goods Receipts ==================

export interface AdminReceiptsFilter {
  page?: number
  size?: number
  from?: string  // yyyy-MM-dd
  to?: string
  supplierId?: number
}

export function useAdminReceipts(f: AdminReceiptsFilter) {
  const params = new URLSearchParams()
  params.set('page', String(f.page ?? 0))
  params.set('size', String(f.size ?? 20))
  if (f.from) params.set('from', f.from)
  if (f.to) params.set('to', f.to)
  if (f.supplierId) params.set('supplierId', String(f.supplierId))
  return useQuery({
    queryKey: ['admin', 'receipts', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<GoodsReceiptListItem>>>(
        `/admin/goods-receipts?${params.toString()}`
      )
      return data.data
    },
  })
}

export function useAdminReceiptDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GoodsReceipt>>(`/admin/goods-receipts/${id}`)
      return data.data
    },
  })
}

export interface ReceiptItemInput {
  productId: number
  quantity: number
  importPrice: number
}

export interface CreateReceiptInput {
  supplierId: number
  note?: string
  items: ReceiptItemInput[]
}

export function useCreateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateReceiptInput) => {
      const { data } = await api.post<ApiResponse<GoodsReceipt>>('/admin/goods-receipts', body)
      if (!data.success) throw new Error(data.message || 'Tạo phiếu thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'receipts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'inventory-batches'] })
    },
  })
}

export function useApproveReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ApiResponse<GoodsReceipt>>(`/admin/goods-receipts/${id}/approve`)
      if (!data.success) throw new Error(data.message || 'Duyệt thất bại')
      return data.data
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'receipts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'receipt', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'inventory-batches'] })
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useCancelReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const { data } = await api.post<ApiResponse<GoodsReceipt>>(
        `/admin/goods-receipts/${id}/cancel`, { reason }
      )
      if (!data.success) throw new Error(data.message || 'Hủy thất bại')
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'receipts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'receipt', id] })
    },
  })
}

// ================== Goods Issues ==================

export interface AdminIssuesFilter {
  status?: GoodsIssueStatus | 'ALL'
  type?: 'auto' | 'manual'
  page?: number
  size?: number
  from?: string  // yyyy-MM-dd
  to?: string
}

export function useAdminIssues(f: AdminIssuesFilter) {
  const params = new URLSearchParams()
  if (f.status && f.status !== 'ALL') params.set('status', f.status)
  if (f.type) params.set('type', f.type)
  if (f.from) params.set('from', f.from)
  if (f.to) params.set('to', f.to)
  params.set('page', String(f.page ?? 0))
  params.set('size', String(f.size ?? 20))

  return useQuery({
    queryKey: ['admin', 'issues', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<GoodsIssueListItem>>>(
        `/admin/goods-issues?${params.toString()}`
      )
      return data.data
    },
  })
}

export interface IssueCounts {
  auto: number
  manual: number
  autoPending: number
  manualPending: number
}

export function useIssueCounts() {
  return useQuery({
    queryKey: ['admin', 'issue-counts'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<IssueCounts>>('/admin/goods-issues/counts')
      return data.data ?? { auto: 0, manual: 0, autoPending: 0, manualPending: 0 }
    },
  })
}

export function useAdminIssueDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'issue', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GoodsIssue>>(`/admin/goods-issues/${id}`)
      return data.data
    },
  })
}

export function useApproveIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, shippingPartnerId }: { id: number; shippingPartnerId?: number }) => {
      const body = shippingPartnerId != null ? { shippingPartnerId } : {}
      const { data } = await api.post<ApiResponse<GoodsIssue>>(
        `/admin/goods-issues/${id}/approve`, body
      )
      if (!data.success) throw new Error(data.message || 'Duyệt thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'issues'] })
      qc.invalidateQueries({ queryKey: ['admin', 'issue', vars.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'pending-counts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders-status-counts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'issue-counts'] })
    },
  })
}

export function useRejectIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const { data } = await api.post<ApiResponse<GoodsIssue>>(
        `/admin/goods-issues/${id}/reject`, { reason }
      )
      if (!data.success) throw new Error(data.message || 'Từ chối thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'issues'] })
      qc.invalidateQueries({ queryKey: ['admin', 'issue', vars.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'pending-counts'] })
    },
  })
}

export interface ManualIssueItem {
  productId: number
  quantity: number
}
export interface CreateManualIssueInput {
  note: string
  items: ManualIssueItem[]
}

export function useCreateManualIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateManualIssueInput) => {
      const { data } = await api.post<ApiResponse<GoodsIssue>>(`/admin/goods-issues`, body)
      if (!data.success) throw new Error(data.message || 'Tạo phiếu thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'issues'] })
      qc.invalidateQueries({ queryKey: ['admin', 'pending-counts'] })
    },
  })
}

// ================== Inventory batches ==================

export function useProductBatches(productId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'inventory-batches', productId],
    enabled: enabled && !!productId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProductStockSummary>>(
        `/admin/inventory/products/${productId}/batches`
      )
      return data.data
    },
  })
}

// Reuse product search — dùng lại từ Sprint 9C
export function useProductSearchLite(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'product-search-lite', keyword],
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

