import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse } from '@/types/api'
import type { ChatRole } from '@/hooks/api/useChat'

export interface ChatStatsPoint {
  day: string
  sessions: number
  messages: number
  likes: number
  dislikes: number
}

export interface ChatStatsResponse {
  rangeDays: number
  totalSessions: number
  totalMessages: number
  totalLikes: number
  totalDislikes: number
  series: ChatStatsPoint[]
}

export function useChatStats(days = 30) {
  return useQuery({
    queryKey: ['admin', 'chat-stats', days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChatStatsResponse>>(
        '/admin/ai/chat-stats', { params: { days } }
      )
      return data.data!
    },
  })
}

export interface ChatCleanupResult {
  cutoffDate: string
  guestSessionsDeleted: number
  durationMs: number
}

export function useRunChatCleanup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<ChatCleanupResult>>(
        '/admin/ai/chat-cleanup/run-now'
      )
      return data.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'chat-sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'chat-stats'] })
    },
  })
}

export interface AdminChatSessionListItem {
  id: number
  title?: string
  userId: number
  username: string
  messageCount: number
  likeCount: number
  dislikeCount: number
  lastActivityAt: string
  createdAt: string
}

export interface AdminChatMessage {
  id: number
  role: ChatRole
  content: string
  toolName?: string | null
  tokensInput?: number | null
  tokensOutput?: number | null
  responseTimeMs?: number | null
  feedback?: number | null
  createdAt: string
}

export interface AdminChatSessionDetail {
  id: number
  title?: string
  userId: number
  username: string
  userEmail: string
  isArchived: boolean
  lastActivityAt: string
  createdAt: string
  messages: AdminChatMessage[]
}

export interface AdminChatSessionFilter {
  dateFrom?: string
  dateTo?: string
  hasDislike?: boolean
  page?: number
  size?: number
}

export function useAdminChatSessions(f: AdminChatSessionFilter) {
  const params: Record<string, string | number | boolean> = {
    page: f.page ?? 0,
    size: f.size ?? 20,
  }
  if (f.dateFrom) params.dateFrom = f.dateFrom
  if (f.dateTo)   params.dateTo   = f.dateTo
  if (f.hasDislike) params.hasDislike = true

  return useQuery({
    queryKey: ['admin', 'chat-sessions', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PagedResponse<AdminChatSessionListItem>>>(
        '/admin/ai/chat-sessions', { params }
      )
      return data.data
    },
  })
}

export function useAdminChatSessionDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'chat-session', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminChatSessionDetail>>(
        `/admin/ai/chat-sessions/${id}`
      )
      return data.data
    },
  })
}
