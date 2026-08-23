import { useState, useMemo } from 'react'
import { MessageSquare, Star, EyeOff, Eye, Trash2, Search, Reply, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { Pagination } from '@/components/common/Pagination'
import {
  useAdminReviews, useToggleReviewHidden, useReplyReview, useDeleteReview,
} from '@/hooks/api/useReviews'
import type { Review } from '@/types/api'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
    </div>
  )
}

export function AdminReviewsPage() {
  const [hiddenFilter, setHiddenFilter] = useState<string>('ALL')  // ALL | true | false
  const [ratingFilter, setRatingFilter] = useState<string>('ALL')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const size = 20

  const hiddenParam: boolean | null =
    hiddenFilter === 'true' ? true : hiddenFilter === 'false' ? false : null

  const { data, isLoading } = useAdminReviews(hiddenParam, page, size)
  const toggleHidden = useToggleReviewHidden()
  const reply = useReplyReview()
  const remove = useDeleteReview()

  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Review | null>(null)
  const [replyText, setReplyText] = useState('')

  // Client-side lọc thêm rating + keyword (backend chỉ hỗ trợ isHidden)
  const filtered = useMemo(() => {
    if (!data) return []
    return data.content.filter((r) => {
      if (ratingFilter !== 'ALL' && r.rating !== Number(ratingFilter)) return false
      if (keyword) {
        const kw = keyword.toLowerCase()
        const inProduct = r.productName?.toLowerCase().includes(kw) ?? false
        const inUser = (r.username ?? '').toLowerCase().includes(kw) ||
          (r.userFullName ?? '').toLowerCase().includes(kw)
        const inComment = (r.comment ?? '').toLowerCase().includes(kw)
        if (!inProduct && !inUser && !inComment) return false
      }
      return true
    })
  }, [data, ratingFilter, keyword])

  const openReply = (r: Review) => {
    setReplyingTo(r)
    setReplyText(r.adminReply ?? '')
    setReplyDialogOpen(true)
  }

  const handleReply = async () => {
    if (!replyingTo) return
    if (!replyText.trim()) { toast.error('Vui lòng nhập nội dung phản hồi'); return }
    try {
      await reply.mutateAsync({ id: replyingTo.id, reply: replyText.trim() })
      toast.success('Đã gửi phản hồi')
      setReplyDialogOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleToggleHidden = async (r: Review) => {
    try {
      await toggleHidden.mutateAsync({ id: r.id, hidden: !r.isHidden })
      toast.success(r.isHidden ? 'Đã hiện lại review' : 'Đã ẩn review')
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (r: Review) => {
    try {
      await remove.mutateAsync(r.id)
      toast.success('Đã xóa review')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<Review>[] = [
    {
      key: 'user', header: 'Khách hàng', className: 'w-48',
      cell: (r) => (
        <div className="flex items-start gap-2">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{r.userFullName || r.username}</div>
            <div className="truncate text-xs text-muted-foreground">@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'product', header: 'Sản phẩm',
      cell: (r) => (
        <div className="max-w-xs">
          <div className="line-clamp-2 text-sm font-medium">{r.productName}</div>
          <div className="text-xs text-muted-foreground">ID: {r.productId}</div>
        </div>
      ),
    },
    {
      key: 'rating', header: 'Đánh giá', className: 'w-32',
      cell: (r) => (
        <div className="space-y-1">
          <Stars rating={r.rating} />
          <div className="text-xs text-muted-foreground">{r.rating}/5 sao</div>
        </div>
      ),
    },
    {
      key: 'content', header: 'Nội dung',
      cell: (r) => (
        <div className="max-w-md space-y-2">
          <p className="line-clamp-3 text-sm">{r.comment || <em className="text-muted-foreground">(không có bình luận)</em>}</p>
          {r.adminReply && (
            <div className="rounded border-l-2 border-primary bg-primary/5 px-2 py-1 text-xs">
              <div className="font-medium text-primary">Admin phản hồi:</div>
              <p className="line-clamp-2 text-muted-foreground">{r.adminReply}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: 'Ngày', className: 'w-32',
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
        </div>
      ),
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center', className: 'w-24',
      cell: (r) => (
        <Badge variant={r.isHidden ? 'secondary' : 'default'}>
          {r.isHidden ? 'Đã ẩn' : 'Hiển thị'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-40',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost" size="icon" title={r.adminReply ? 'Sửa phản hồi' : 'Phản hồi'}
            onClick={() => openReply(r)}
          >
            <Reply className={`h-4 w-4 ${r.adminReply ? 'text-primary' : ''}`} />
          </Button>
          <Button
            variant="ghost" size="icon"
            title={r.isHidden ? 'Hiện lại' : 'Ẩn'}
            onClick={() => handleToggleHidden(r)}
          >
            {r.isHidden
              ? <Eye className="h-4 w-4" />
              : <EyeOff className="h-4 w-4 text-amber-600" />}
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa review?"
            description={<>Xóa review <b>{r.rating} sao</b> của <b>{r.username}</b> cho <b>{r.productName}</b>. Không thể hoàn tác.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(r)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Kiểm duyệt đánh giá"
        icon={MessageSquare}
        sprint="Sprint 9F"
        description="Xem review từ khách hàng, ẩn nội dung không phù hợp, phản hồi hoặc xóa."
      />

      <AdminTable<Review>
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={keyword || ratingFilter !== 'ALL'
          ? 'Không có review khớp bộ lọc'
          : 'Chưa có review nào'}
        toolbar={
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo sản phẩm / user / nội dung..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Số sao" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi mức sao</SelectItem>
                <SelectItem value="5">5 sao</SelectItem>
                <SelectItem value="4">4 sao</SelectItem>
                <SelectItem value="3">3 sao</SelectItem>
                <SelectItem value="2">2 sao</SelectItem>
                <SelectItem value="1">1 sao</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={hiddenFilter}
              onValueChange={(v) => { setHiddenFilter(v); setPage(0) }}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="false">Đang hiển thị</SelectItem>
                <SelectItem value="true">Đã ẩn</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
      )}

      <FormDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        title={replyingTo?.adminReply ? 'Sửa phản hồi' : 'Phản hồi review'}
        onSubmit={handleReply}
        loading={reply.isPending}
        submitLabel={replyingTo?.adminReply ? 'Cập nhật' : 'Gửi phản hồi'}
        size="lg"
      >
        {replyingTo && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">{replyingTo.userFullName || replyingTo.username}</span>
              <Stars rating={replyingTo.rating} />
            </div>
            <p className="text-muted-foreground">{replyingTo.comment || <em>(không có bình luận)</em>}</p>
            <div className="mt-2 text-xs text-muted-foreground">Về SP: {replyingTo.productName}</div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="reply">Nội dung phản hồi *</Label>
          <textarea
            id="reply"
            rows={4}
            maxLength={1000}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Cảm ơn quý khách đã đánh giá..."
          />
          <p className="text-xs text-muted-foreground">{replyText.length}/1000 ký tự</p>
        </div>
      </FormDialog>
    </div>
  )
}
