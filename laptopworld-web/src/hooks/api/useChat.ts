import { useMutation } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: number
  role: ChatRole
  content: string
  tokensInput?: number
  tokensOutput?: number
  responseTimeMs?: number
  createdAt: string
}

export interface CitedProduct {
  id: number
  name: string
  slug: string
  price: number
  primaryImage?: string
  similarity: number
}

export interface ChatResponse {
  sessionId: number
  assistant: ChatMessage
  citedProducts: CitedProduct[]
}

export interface ChatSession {
  id: number
  title?: string
  isArchived: boolean
  lastActivityAt: string
  createdAt: string
  messages: ChatMessage[]
}

/** Tạo session mới (guest OK). */
export function useCreateChatSession() {
  return useMutation({
    mutationFn: async (title?: string) => {
      const { data } = await api.post<ApiResponse<ChatSession>>('/ai/chat/sessions', { title })
      return data.data!
    },
  })
}

/** Gửi message ở chế độ Agent — Gemini gọi 4 tools. */
export function useSendAgentMessage() {
  return useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: number; message: string }) => {
      const { data } = await api.post<ApiResponse<ChatResponse>>(
        `/ai/chat/sessions/${sessionId}/agent-messages`,
        { message }
      )
      return data.data!
    },
  })
}

// LocalStorage key cho session — chat persist qua reload
const SESSION_KEY = 'lw_chat_session_id'

export const chatSessionStorage = {
  get: () => {
    const v = localStorage.getItem(SESSION_KEY)
    return v ? Number(v) : null
  },
  set: (id: number) => localStorage.setItem(SESSION_KEY, String(id)),
  clear: () => localStorage.removeItem(SESSION_KEY),
}
