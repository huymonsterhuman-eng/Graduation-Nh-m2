import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PagedResponse } from '@/types/api'
import type { ChatRole } from '@/hooks/api/useChat'

export interface AdminChatSessionListItem {
  id: number
  title?: string
  userId?: number | null
  username?: string | null
  isGuest: boolean
  messageCount: number
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
  createdAt: string
}

export interface AdminChatSessionDetail {
  id: number
  title?: string
  userId?: number | null
  username?: string | null
  userEmail?: string | null
  isGuest: boolean
  isArchived: boolean
  lastActivityAt: string
  createdAt: string
  messages: AdminChatMessage[]
}

export interface AdminChatSessionFilter {
  loggedIn?: boolean | null
  dateFrom?: string
  dateTo?: string
  page?: number
  size?: number
}

export function useAdminChatSessions(f: AdminChatSessionFilter) {
  const params: Record<string, string | number | boolean> = {
    page: f.page ?? 0,
    size: f.size ?? 20,
  }
  if (f.loggedIn != null) params.loggedIn = f.loggedIn
  if (f.dateFrom) params.dateFrom = f.dateFrom
  if (f.dateTo)   params.dateTo   = f.dateTo

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
