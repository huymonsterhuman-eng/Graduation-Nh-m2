import { useMemo, useState } from 'react'
import {
  MessageSquareText, Search, Eye, UserRound, ThumbsUp, ThumbsDown,
  Trash2, Loader2, MessagesSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import {
  useAdminChatSessions,
  useChatStats,
  useRunChatCleanup,
  type AdminChatSessionListItem,
} from '@/hooks/api/useAdminChatSessions'
import { formatDateTime } from '@/lib/format'
import { ChatSessionDetailDialog } from './ChatSessionDetailDialog'

export function AdminAiChatSessionsPage() {
  const [dateFrom, setDateFrom] = useState('') // yyyy-MM-dd
  const [dateTo, setDateTo] = useState('')
  const [onlyDislike, setOnlyDislike] = useState(false)
  const [page, setPage] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)

  const filter = useMemo(() => ({
    dateFrom: dateFrom ? `${dateFrom}T00:00:00+07:00` : undefined,
    dateTo:   dateTo   ? `${dateTo}T23:59:59+07:00`   : undefined,
    hasDislike: onlyDislike || undefined,
    page,
    size: 20,
  }), [dateFrom, dateTo, onlyDislike, page])

  const { data: paged, isLoading } = useAdminChatSessions(filter)
  const { data: stats } = useChatStats(30)
  const cleanup = useRunChatCleanup()

  const handleCleanup = async () => {
    if (!window.confirm(
      'Dọn tất cả phiên chat của khách vãng lai cũ hơn 30 ngày?\n\n'
      + 'Số liệu vẫn được giữ trong bảng thống kê để xem trend dài hạn.\n'
      + 'Phiên của khách đã đăng nhập KHÔNG bị xoá.'
    )) return
    try {
      const r = await cleanup.mutateAsync()
      toast.success(`Đã dọn ${r.guestSessionsDeleted} phiên guest (< ${r.cutoffDate}) trong ${r.durationMs}ms`)
    } catch (e) {
      toast.error((e as Error).message || 'Không dọn được, thử lại nhé')
    }
  }

  const columns: AdminColumn<AdminChatSessionListItem>[] = [
    {
      key: 'id', header: 'ID', className: 'w-20',
      cell: (s) => <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>,
    },
    {
      key: 'user', header: 'Người dùng',
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-sm">
          <UserRound className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{s.username}</span>
        </div>
      ),
    },
    {
      key: 'title', header: 'Tiêu đề',
      cell: (s) => (
        <span className="text-sm text-muted-foreground">
          {s.title || <span className="italic">(không có)</span>}
        </span>
      ),
    },
    {
      key: 'messageCount', header: 'Số tin nhắn', align: 'center', className: 'w-28',
      cell: (s) => (
        <Badge variant="outline" className="font-mono">{s.messageCount}</Badge>
      ),
    },
    {
      key: 'feedback', header: 'Đánh giá', align: 'center', className: 'w-28',
      cell: (s) => {
        if (s.likeCount === 0 && s.dislikeCount === 0) {
          return <span className="text-xs text-muted-foreground/60">—</span>
        }
        return (
          <div className="flex items-center justify-center gap-2 text-xs">
            {s.likeCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="Câu trả lời được khen">
                <ThumbsUp className="h-3 w-3" /> {s.likeCount}
              </span>
            )}
            {s.dislikeCount > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 dark:text-rose-400" title="Câu trả lời bị phàn nàn">
                <ThumbsDown className="h-3 w-3" /> {s.dislikeCount}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'lastActivityAt', header: 'Hoạt động cuối', className: 'w-40',
      cell: (s) => <span className="text-xs">{formatDateTime(s.lastActivityAt)}</span>,
    },
    {
      key: 'createdAt', header: 'Bắt đầu', className: 'w-40',
      cell: (s) => <span className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</span>,
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-32',
      cell: (s) => (
        <Button variant="outline" size="sm" onClick={() => setDetailId(s.id)}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Xem
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Lịch sử chat AI"
        icon={MessageSquareText}
        sprint="Sprint 9G · Bước D"
        description={paged
          ? `${paged.totalElements} phiên — giám sát toàn bộ hội thoại của khách với trợ lý AI`
          : 'Xem lại lịch sử hội thoại của khách hàng với chatbot AI'}
      />

      {/* KPI 30 ngày qua */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <MessagesSquare className="h-3.5 w-3.5 text-primary" /> Phiên chat
            </div>
            <div className="mt-1 text-2xl font-bold">{stats.totalSessions.toLocaleString('vi-VN')}</div>
            <div className="text-xs text-muted-foreground">30 ngày qua</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5 text-sky-500" /> Tin nhắn
            </div>
            <div className="mt-1 text-2xl font-bold">{stats.totalMessages.toLocaleString('vi-VN')}</div>
            <div className="text-xs text-muted-foreground">Bao gồm cả câu hỏi + trả lời</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <ThumbsUp className="h-3.5 w-3.5" /> Câu trả lời tốt
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalLikes.toLocaleString('vi-VN')}
            </div>
            <div className="text-xs text-muted-foreground">Khách bấm 👍</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <ThumbsDown className="h-3.5 w-3.5" /> Cần xem lại
            </div>
            <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.totalDislikes.toLocaleString('vi-VN')}
            </div>
            <div className="text-xs text-muted-foreground">Khách bấm 👎 — bấm nút lọc bên dưới</div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card className="grid items-end gap-3 p-3 md:grid-cols-[180px_180px_auto_1fr]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Từ ngày</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
            className="[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đến ngày</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
            className="[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <button
          type="button"
          onClick={() => { setOnlyDislike((v) => !v); setPage(0) }}
          className={
            'inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition ' +
            (onlyDislike
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-input bg-background text-muted-foreground hover:bg-muted')
          }
          title="Chỉ hiện phiên có khách bấm 👎"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {onlyDislike ? 'Đang lọc: chỉ có 👎' : 'Chỉ phiên bị 👎'}
        </button>
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>
            Bấm <b>Chỉ phiên bị 👎</b> để xem nhanh các phiên khách đánh giá bot trả lời chưa tốt.
          </span>
        </div>
      </Card>

      <AdminTable<AdminChatSessionListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="Chưa có session nào khớp bộ lọc"
      />

      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang <b>{page + 1}</b> / {paged.totalPages} · Tổng {paged.totalElements} session
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              disabled={!paged.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >Trước</Button>
            <Button variant="outline" size="sm"
              disabled={!paged.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >Sau</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300 md:flex-row md:items-center md:justify-between">
        <div>
          💡 <b>Dọn dữ liệu tự động:</b> Chatbot AI chỉ phục vụ khách đã đăng nhập.
          Hệ thống tự xoá phiên chat cũ hơn <b>6 tháng</b> vào 3h sáng mỗi Chủ nhật (số liệu vẫn giữ ở bảng thống kê).
        </div>
        <Button
          variant="outline" size="sm"
          onClick={handleCleanup}
          disabled={cleanup.isPending}
          className="border-sky-500/40 bg-background/60"
        >
          {cleanup.isPending
            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
          Dọn ngay
        </Button>
      </div>

      <ChatSessionDetailDialog
        sessionId={detailId}
        open={detailId != null}
        onOpenChange={(v) => { if (!v) setDetailId(null) }}
      />
    </div>
  )
}
