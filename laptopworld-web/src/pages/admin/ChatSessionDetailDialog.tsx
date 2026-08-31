import { MessageSquareText, User, Bot, Wrench, Clock, ThumbsUp, ThumbsDown } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminChatSessionDetail } from '@/hooks/api/useAdminChatSessions'
import { formatChatTime, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  sessionId: number | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ChatSessionDetailDialog({ sessionId, open, onOpenChange }: Props) {
  const { data, isLoading } = useAdminChatSessionDetail(sessionId ?? undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Chi tiết session chat #{sessionId ?? '—'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {data ? (
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-medium">{data.username} · {data.userEmail}</span>
                <span>·</span>
                <span>Tạo lúc {formatDateTime(data.createdAt)}</span>
                <span>·</span>
                <span>Hoạt động cuối {formatDateTime(data.lastActivityAt)}</span>
                <span>·</span>
                <span>{data.messages.length} tin nhắn</span>
              </span>
            ) : (
              <span>Đang tải...</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto bg-muted/30 px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-2/3" />
              ))}
            </div>
          ) : data?.messages.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Session này chưa có tin nhắn nào.
            </div>
          ) : (
            <div className="space-y-3">
              {data?.messages.map((m) => {
                const isUser = m.role === 'user'
                const isSystem = m.role === 'system'
                const isTool = m.role === 'tool' || !!m.toolName
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex gap-2',
                      isUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isUser && (
                      <div
                        className={cn(
                          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                          isSystem && 'bg-slate-500/20 text-slate-600 dark:text-slate-300',
                          isTool && 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
                          !isSystem && !isTool && 'bg-primary/15 text-primary'
                        )}
                        title={m.role}
                      >
                        {isTool ? <Wrench className="h-3.5 w-3.5" />
                          : <Bot className="h-3.5 w-3.5" />}
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
                        isUser && 'bg-primary text-primary-foreground',
                        isSystem && 'bg-slate-500/10 text-slate-700 italic dark:text-slate-300',
                        isTool && 'bg-amber-500/10 text-amber-900 font-mono text-xs dark:text-amber-100',
                        !isUser && !isSystem && !isTool && 'bg-background border'
                      )}
                    >
                      {isTool && m.toolName && (
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                          tool: {m.toolName}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">
                        {m.content || <span className="italic opacity-70">(không có nội dung)</span>}
                      </div>
                      <div
                        className={cn(
                          'mt-1 flex items-center gap-2 text-[10px] opacity-70',
                          isUser && 'justify-end'
                        )}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" /> {formatChatTime(m.createdAt)}
                        </span>
                        {m.responseTimeMs != null && (
                          <span>· {m.responseTimeMs}ms</span>
                        )}
                        {(m.tokensInput != null || m.tokensOutput != null) && (
                          <span>· {m.tokensInput ?? 0}↑ / {m.tokensOutput ?? 0}↓ tok</span>
                        )}
                        {m.feedback === 1 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 opacity-100"
                                title="Khách đánh giá hữu ích">
                            <ThumbsUp className="h-2.5 w-2.5" /> Hữu ích
                          </span>
                        )}
                        {m.feedback === -1 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/20 px-1 py-0.5 font-semibold text-rose-700 dark:text-rose-300 opacity-100"
                                title="Khách phàn nàn — cần xem lại">
                            <ThumbsDown className="h-2.5 w-2.5" /> Chưa tốt
                          </span>
                        )}
                      </div>
                    </div>
                    {isUser && (
                      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
