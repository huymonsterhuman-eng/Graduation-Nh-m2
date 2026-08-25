import { useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'

// ============ Pending counts (Sprint 9A) ============

export interface PendingCounts {
  ordersPending: number
  ordersPreparing: number
  goodsIssuesPending: number
}

export function usePendingCounts(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'pending-counts'],
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PendingCounts>>('/admin/pending-counts')
      return data.data ?? { ordersPending: 0, ordersPreparing: 0, goodsIssuesPending: 0 }
    },
  })
}

// ============ Common range ============

export interface DateRange {
  from: string // yyyy-MM-dd
  to: string
}

function rangeParams(r: DateRange): string {
  return `?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`
}

// ============ KPI ============

export interface KpiSummary {
  revenue: number
  orders: number
  newUsers: number
  ordersInRange: number
  criticalStock: number
  outOfStock: number
}

export function useDashboardKpi(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'kpi', range],
    staleTime: 30_000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<KpiSummary>>(`/admin/dashboard/kpi${rangeParams(range)}`)
      return data.data
    },
  })
}

// ============ Revenue timeseries ============

export interface TimeseriesPoint { label: string; value: number }

export function useRevenueTimeseries(range: DateRange) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'revenue-ts', range],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TimeseriesPoint[]>>(`/admin/dashboard/revenue-timeseries${rangeParams(range)}`)
      return data.data ?? []
    },
  })
}

// ============ Stock movement ============

export interface StockMovementPoint { label: string; incoming: number; outgoing: number }

export function useStockMovement(range: DateRange) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stock-move', range],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StockMovementPoint[]>>(`/admin/dashboard/stock-movement${rangeParams(range)}`)
      return data.data ?? []
    },
  })
}

// ============ Sales by category ============

export interface SalesByCategory { categoryName: string; totalSold: number }

export function useSalesByCategory(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'sales-by-cat', limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SalesByCategory[]>>(`/admin/dashboard/sales-by-category?limit=${limit}`)
      return data.data ?? []
    },
  })
}

// ============ Top products ============

export interface TopProduct {
  id: number
  name: string
  slug: string
  primaryImage?: string
  totalSold: number
  currentStock: number
  price: number
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'top-products', limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TopProduct[]>>(`/admin/dashboard/top-products?limit=${limit}`)
      return data.data ?? []
    },
  })
}

// ============ Dead stock ============

export interface DeadStockItem {
  id: number
  name: string
  slug: string
  primaryImage?: string
  stock: number
  price: number
  createdAt: string
}

export function useDeadStock(days = 30, limit = 5) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'dead-stock', days, limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DeadStockItem[]>>(`/admin/dashboard/dead-stock?days=${days}&limit=${limit}`)
      return data.data ?? []
    },
  })
}

// ============ Low rated ============

export interface LowRatedItem {
  id: number
  name: string
  slug: string
  primaryImage?: string
  categoryName?: string
  avgRating: number
  reviewCount: number
}

export function useLowRated(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'low-rated', limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<LowRatedItem[]>>(`/admin/dashboard/low-rated?limit=${limit}`)
      return data.data ?? []
    },
  })
}

// ============ Latest orders ============

export interface LatestOrderItem {
  id: number
  code: string
  username?: string
  shippingName?: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
}

export function useLatestOrders(range: DateRange, limit = 8) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'latest-orders', range, limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<LatestOrderItem[]>>(`/admin/dashboard/latest-orders${rangeParams(range)}&limit=${limit}`)
      return data.data ?? []
    },
  })
}

// ============ Chatbot stats ============

export interface ChatbotStats {
  sessions: number
  messages: number
  loggedInSessions: number
  loggedInRate: number
  avgResponseMs: number
}

export function useChatbotStats(range: DateRange) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'chatbot-stats', range],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChatbotStats>>(`/admin/dashboard/chatbot-stats${rangeParams(range)}`)
      return data.data
    },
  })
}

// ============ Chatbot top questions ============

export interface ChatbotTopQuestion { question: string; askCount: number; lastAsked: string }

export function useChatbotTopQuestions(days = 30, limit = 10) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'chatbot-questions', days, limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChatbotTopQuestion[]>>(`/admin/dashboard/chatbot-top-questions?days=${days}&limit=${limit}`)
      return data.data ?? []
    },
  })
}
