import { useMemo, useState } from 'react'
import {
  MessageSquareText, Search, Eye, UserRound, UserX2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import {
  useAdminChatSessions,
  type AdminChatSessionListItem,
} from '@/hooks/api/useAdminChatSessions'
import { formatDateTime } from '@/lib/format'
import { ChatSessionDetailDialog } from './ChatSessionDetailDialog'

const LOGGED_ALL = '__all__'
type LoggedFilter = '__all__' | 'guest' | 'user'

export function AdminAiChatSessionsPage() {
  const [logged, setLogged] = useState<LoggedFilter>(LOGGED_ALL)
  const [dateFrom, setDateFrom] = useState('') // yyyy-MM-dd
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)

  const filter = useMemo(() => ({
    loggedIn:
      logged === 'user' ? true :
      logged === 'guest' ? false : null,
    dateFrom: dateFrom ? `${dateFrom}T00:00:00+07:00` : undefined,
    dateTo:   dateTo   ? `${dateTo}T23:59:59+07:00`   : undefined,
    page,
    size: 20,
  }), [logged, dateFrom, dateTo, page])

  const { data: paged, isLoading } = useAdminChatSessions(filter)

  const columns: AdminColumn<AdminChatSessionListItem>[] = [
    {
      key: 'id', header: 'ID', className: 'w-20',
      cell: (s) => <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>,
    },
    {
      key: 'user', header: 'Người dùng',
      cell: (s) => s.isGuest ? (
        <Badge variant="outline" className="gap-1">
          <UserX2 className="h-3 w-3" /> Khách vãng lai
        </Badge>
      ) : (
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
        title="Chat sessions AI"
        icon={MessageSquareText}
        sprint="Sprint 9G · Bước D"
        description={paged
          ? `${paged.totalElements} session — giám sát toàn bộ hội thoại với trợ lý AI (RAG + Agent 5 tools)`
          : 'Xem lại lịch sử hội thoại của khách hàng với chatbot AI'}
      />

      {/* Filter */}
      <Card className="grid items-end gap-3 p-3 md:grid-cols-[220px_180px_180px_1fr]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Người dùng</label>
          <Select
            value={logged}
            onValueChange={(v) => { setLogged(v as LoggedFilter); setPage(0) }}
          >
            <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={LOGGED_ALL}>Tất cả</SelectItem>
              <SelectItem value="user">Đã đăng nhập</SelectItem>
              <SelectItem value="guest">Khách vãng lai</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>
            Lọc theo <b>ngày tạo session</b> (múi giờ VN). Ô ngày để trống nghĩa là không giới hạn.
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

      <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
        💡 <b>Lưu ý:</b> Chat log gồm cả session guest (không login) — dùng để đánh giá chất lượng
        chatbot và xem tool nào Gemini gọi (search_products / compare_products / recommend_by_budget /
        get_product_detail / get_my_orders). Tokens + response time hiển thị trong từng bubble giúp
        theo dõi hiệu năng.
      </div>

      <ChatSessionDetailDialog
        sessionId={detailId}
        open={detailId != null}
        onOpenChange={(v) => { if (!v) setDetailId(null) }}
      />
    </div>
  )
}
