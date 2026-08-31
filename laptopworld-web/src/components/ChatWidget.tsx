import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogIn, Mic, MicOff, Send, Sparkles, ThumbsDown, ThumbsUp, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SmartImage } from '@/components/common/SmartImage'
import { MascotIcon } from '@/components/MascotIcon'
import { cn } from '@/lib/utils'
import { formatChatTime, formatPrice } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import {
  chatSessionStorage,
  useCreateChatSession,
  useSendAgentMessage,
  useSendFeedback,
  type ChatMessage,
  type CitedProduct,
} from '@/hooks/api/useChat'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

interface UiMessage extends Pick<ChatMessage, 'role' | 'content'> {
  id: string
  /** Id thật từ backend — cần để gửi feedback. Null với welcome/pending/error. */
  messageId?: number
  cited?: CitedProduct[]
  pending?: boolean
  createdAt?: string    // ISO — có timestamp thì hiện, không thì bỏ (welcome/pending)
  feedback?: 1 | -1 | null   // trạng thái nút 👍/👎 người dùng đã chọn
}

const WELCOME_TEXT = 'Xin chào! Mình là trợ lý AI của LaptopWorld. Bạn cần tư vấn sản phẩm hay xem đơn hàng?'

const SUGGESTIONS = [
  'Laptop gaming dưới 25 triệu',
  'iPhone 15 còn hàng không?',
  'Đơn hàng của tôi',
]

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_TEXT },
  ])
  const [input, setInput] = useState('')

  const userId = useAuthStore((s) => s.user?.id)
  const isAuthenticated = userId != null
  const location = useLocation()
  const createSession = useCreateChatSession()
  const sendMessage = useSendAgentMessage()
  const sendFeedback = useSendFeedback()
  const voice = useVoiceInput('vi-VN')

  const handleFeedback = (messageId: number, value: 1 | -1) => {
    setMessages((prev) => prev.map((m) => {
      if (m.messageId !== messageId) return m
      const next = m.feedback === value ? null : value  // click lại = huỷ
      return { ...m, feedback: next }
    }))
    const message = messages.find((m) => m.messageId === messageId)
    const nextValue = message?.feedback === value ? null : value
    sendFeedback.mutate({ messageId, feedback: nextValue }, {
      onError: () => toast.error('Không gửi được đánh giá, thử lại nhé'),
      onSuccess: () => {
        if (nextValue === -1) toast.success('Cảm ơn! Admin sẽ xem lại câu trả lời này.')
      },
    })
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setSessionId(chatSessionStorage.get()) }, [])

  // Khi user login/logout: clear session
  useEffect(() => {
    chatSessionStorage.clear()
    setSessionId(null)
    setMessages([{ id: 'welcome', role: 'assistant', content: WELCOME_TEXT }])
  }, [userId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  // Voice: transcript vào input
  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript)
  }, [voice.transcript])

  useEffect(() => {
    if (voice.error) toast.error(voice.error)
  }, [voice.error])

  const ensureSession = async (): Promise<number | null> => {
    if (sessionId) return sessionId
    try {
      const s = await createSession.mutateAsync('Chat từ web')
      chatSessionStorage.set(s.id)
      setSessionId(s.id)
      return s.id
    } catch {
      toast.error('Không tạo được cuộc trò chuyện')
      return null
    }
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content) return
    setInput('')
    if (voice.listening) voice.stop()

    let sid = await ensureSession()
    if (!sid) return

    const now = new Date().toISOString()
    const userMsg: UiMessage = { id: `u-${Date.now()}`, role: 'user', content, createdAt: now }
    const pendingId = `a-${Date.now()}`
    setMessages((prev) => [...prev, userMsg, { id: pendingId, role: 'assistant', content: '', pending: true }])

    const trySend = async (targetSid: number): Promise<void> => {
      try {
        const res = await sendMessage.mutateAsync({ sessionId: targetSid, message: content })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: `a-${res.assistant.id}`,
                  messageId: res.assistant.id,
                  role: 'assistant',
                  content: res.assistant.content,
                  cited: res.citedProducts,
                  createdAt: res.assistant.createdAt,
                }
              : m
          )
        )
      } catch (e) {
        const err = e as AxiosError<ApiResponse<{ code?: string }>>
        const body = err.response?.data
        const isSessionMismatch = err.response?.status === 400 &&
          (body?.message?.includes('tài khoản khác') || body?.message?.includes('không thuộc về bạn'))
        if (isSessionMismatch) {
          chatSessionStorage.clear()
          setSessionId(null)
          try {
            const s = await createSession.mutateAsync('Chat từ web')
            chatSessionStorage.set(s.id)
            setSessionId(s.id)
            await trySend(s.id)
            return
          } catch { /* fallthrough */ }
        }
        const msg = body?.message || 'Xin lỗi, hiện tại AI đang bận. Vui lòng thử lại sau.'
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, content: msg, pending: false } : m))
        )
      }
    }

    await trySend(sid)
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input) }
  const toggleVoice = () => voice.listening ? voice.stop() : voice.start()

  return (
    <>
      {/* Float button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-110 hover:shadow-xl"
          aria-label="Mở chat AI"
        >
          <MascotIcon className="h-11 w-11" animate />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
            <Sparkles className="h-3 w-3 text-white" />
          </span>
        </button>
      )}

      {/* Popup */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(600px,calc(100vh-3rem))] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <MascotIcon className="h-8 w-8" animate />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Trợ lý AI LaptopWorld</div>
              <div className="flex items-center gap-1 text-xs opacity-90">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Đang hoạt động
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Message list — chỉ hiện khi đã login */}
          {isAuthenticated ? (
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} onFeedback={handleFeedback} />
              ))}
              {messages.length === 1 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground text-center">Câu hỏi gợi ý:</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary/5 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <LoginGate returnTo={location.pathname + location.search} />
          )}

          {/* Input — ẩn khi chưa login */}
          {isAuthenticated && (
            <form onSubmit={handleSubmit} className="border-t p-3 bg-background">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(input)
                    }
                  }}
                  placeholder={voice.listening ? 'Đang nghe... hãy nói' : 'Hỏi trợ lý AI...'}
                  rows={1}
                  maxLength={2000}
                  disabled={sendMessage.isPending}
                  className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 max-h-24"
                />
                {voice.isSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={voice.listening ? 'destructive' : 'outline'}
                    onClick={toggleVoice}
                    disabled={sendMessage.isPending}
                    aria-label={voice.listening ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                    className={voice.listening ? 'animate-pulse' : ''}
                  >
                    {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <Button type="submit" size="icon" disabled={sendMessage.isPending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground text-center">
                AI có thể trả lời không chính xác. Vui lòng xác thực với bộ phận CSKH.
              </p>
            </form>
          )}
        </div>
      )}
    </>
  )
}

function LoginGate({ returnTo }: { returnTo: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
        <MascotIcon className="h-12 w-12" animate />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Đăng nhập để trò chuyện với AI</h3>
        <p className="text-xs text-muted-foreground">
          Trợ lý AI cần biết bạn là ai để tư vấn sản phẩm hợp gu, đồng thời tra được
          đơn hàng cá nhân khi bạn hỏi.
        </p>
      </div>
      <div className="w-full space-y-2 text-left">
        <div className="flex items-start gap-2 rounded-md border bg-background p-2 text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Tư vấn theo ngân sách + mục đích sử dụng</span>
        </div>
        <div className="flex items-start gap-2 rounded-md border bg-background p-2 text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>So sánh 2-3 sản phẩm cùng lúc</span>
        </div>
        <div className="flex items-start gap-2 rounded-md border bg-background p-2 text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Tra cứu đơn hàng của bạn qua giọng nói</span>
        </div>
      </div>
      <Button asChild className="w-full">
        <Link to="/dang-nhap" state={{ from: returnTo }}>
          <LogIn className="mr-2 h-4 w-4" /> Đăng nhập ngay
        </Link>
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/dang-ky" className="font-medium text-primary hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  )
}

function MessageBubble({ msg, onFeedback }: {
  msg: UiMessage
  onFeedback: (messageId: number, value: 1 | -1) => void
}) {
  const isUser = msg.role === 'user'
  const time = formatChatTime(msg.createdAt)
  const canFeedback = !isUser && !msg.pending && msg.messageId != null
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <MascotIcon className="h-6 w-6" />}
      </div>
      <div className={cn('max-w-[80%] space-y-1', isUser && 'items-end')}>
        <div className={cn(
          'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'
        )}>
          {msg.pending ? <TypingDots /> : msg.content}
        </div>
        <div className={cn('flex items-center gap-2 px-1', isUser ? 'justify-end' : 'justify-start')}>
          {time && (
            <p className="text-[10px] text-muted-foreground">
              {time}
            </p>
          )}
          {canFeedback && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onFeedback(msg.messageId!, 1)}
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full transition',
                  msg.feedback === 1
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground/60 hover:bg-muted hover:text-emerald-600'
                )}
                aria-label="Trả lời hữu ích"
                title="Câu trả lời hữu ích"
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback(msg.messageId!, -1)}
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full transition',
                  msg.feedback === -1
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground/60 hover:bg-muted hover:text-rose-600'
                )}
                aria-label="Trả lời chưa tốt"
                title="Câu trả lời chưa tốt"
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {msg.cited && msg.cited.length > 0 && (
          <div className="space-y-1">
            {msg.cited.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/san-pham/${p.slug}`}
                className="flex gap-2 rounded-md border bg-background p-2 transition hover:border-primary"
              >
                <SmartImage
                  src={p.primaryImage}
                  alt={p.name}
                  className="h-12 w-12 rounded object-cover"
                  usePicsum
                  seed={`p-${p.id}`}
                  fallbackSize="100x100"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
                  <p className="text-xs font-semibold text-primary">{formatPrice(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
