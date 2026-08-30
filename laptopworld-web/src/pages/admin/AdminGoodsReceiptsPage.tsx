import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArchiveRestore, Plus, Eye, X, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { DateRangeFilter, type DateRange } from '@/components/admin/common/DateRangeFilter'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useAdminReceipts, useAdminReceiptDetail,
  useApproveReceipt, useCancelReceipt,
} from '@/hooks/api/useAdminInventory'
import { formatPrice, formatDateTime, productImageSrc } from '@/lib/format'
import type { GoodsReceiptListItem, GoodsReceiptStatus } from '@/types/api'

const RECEIPT_STATUS_META: Record<GoodsReceiptStatus, { label: string; className: string }> = {
  pending: {
    label: 'Chờ duyệt',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  completed: {
    label: 'Đã duyệt',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
}

function ReceiptStatusBadge({ status }: { status: GoodsReceiptStatus }) {
  const meta = RECEIPT_STATUS_META[status] ?? RECEIPT_STATUS_META.completed
  return <Badge className={meta.className}>{meta.label}</Badge>
}

export function AdminGoodsReceiptsPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<GoodsReceiptStatus | 'ALL'>('ALL')
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: paged, isLoading } = useAdminReceipts({
    page, size: 20,
    from: dateRange.from, to: dateRange.to,
  })

  const filteredContent = (paged?.content ?? []).filter(
    (r) => statusFilter === 'ALL' || r.status === statusFilter
  )
  const statusCounts = (paged?.content ?? []).reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc },
    {} as Record<GoodsReceiptStatus, number>
  )

  const columns: AdminColumn<GoodsReceiptListItem>[] = [
    {
      key: 'code', header: 'Mã phiếu',
      cell: (r) => <span className="font-mono text-sm font-medium">{r.code}</span>,
    },
    {
      key: 'status', header: 'Trạng thái',
      cell: (r) => <ReceiptStatusBadge status={r.status} />,
    },
    {
      key: 'supplier', header: 'Nhà cung cấp',
      cell: (r) => <span className="text-sm">{r.supplierName || '—'}</span>,
    },
    {
      key: 'user', header: 'Người nhập',
      cell: (r) => <span className="text-sm text-muted-foreground">{r.userFullName || '—'}</span>,
    },
    {
      key: 'total', header: 'Tổng tiền', align: 'right',
      cell: (r) => <span className="font-semibold">{formatPrice(r.totalAmount)}</span>,
    },
    {
      key: 'time', header: 'Ngày nhập',
      cell: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-16',
      cell: (r) => (
        <Button variant="ghost" size="icon" onClick={() => setDetailId(r.id)} title="Chi tiết">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Phiếu nhập kho"
        icon={ArchiveRestore}
        sprint="Sprint 9E"
        description={`${paged?.totalElements ?? 0} phiếu`}
        actions={
          <Button asChild>
            <Link to="/admin/phieu-nhap/moi">
              <Plus className="mr-2 h-4 w-4" /> Tạo phiếu nhập
            </Link>
          </Button>
        }
      />

      <AdminTable<GoodsReceiptListItem>
        columns={columns}
        data={filteredContent}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={statusFilter === 'ALL' ? 'Chưa có phiếu nhập nào' : `Không có phiếu nào ở trạng thái "${RECEIPT_STATUS_META[statusFilter as GoodsReceiptStatus]?.label}"`}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GoodsReceiptStatus | 'ALL')}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái ({paged?.content.length ?? 0})</SelectItem>
                <SelectItem value="pending">Chờ duyệt ({statusCounts.pending ?? 0})</SelectItem>
                <SelectItem value="completed">Đã duyệt ({statusCounts.completed ?? 0})</SelectItem>
                <SelectItem value="cancelled">Đã hủy ({statusCounts.cancelled ?? 0})</SelectItem>
              </SelectContent>
            </Select>
            <DateRangeFilter
              value={dateRange}
              onChange={(v) => { setDateRange(v); setPage(0) }}
            />
          </div>
        }
      />

      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang {page + 1} / {paged.totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!paged.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>Trước</Button>
            <Button variant="outline" size="sm" disabled={!paged.hasNext}
              onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {detailId && <ReceiptDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

// =============== Detail dialog ===============

function ReceiptDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: receipt, isLoading } = useAdminReceiptDetail(id)
  const approve = useApproveReceipt()
  const cancel = useCancelReceipt()

  const [confirmAction, setConfirmAction] = useState<'approve' | 'cancel' | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const isPending = receipt?.status === 'pending'

  const doApprove = async () => {
    try {
      await approve.mutateAsync(id)
      toast.success('Đã duyệt phiếu — kho đã được cộng thêm')
      setConfirmAction(null)
    } catch (e) { toast.error((e as Error).message) }
  }

  const doCancel = async () => {
    try {
      await cancel.mutateAsync({ id, reason: cancelReason || undefined })
      toast.success('Đã hủy phiếu nhập')
      setConfirmAction(null)
      setCancelReason('')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="h-5 w-5" />
            {isLoading || !receipt ? 'Đang tải...' : (
              <><span className="font-mono">{receipt.code}</span>
              <ReceiptStatusBadge status={receipt.status} />
              <Badge variant="outline">{formatPrice(receipt.totalAmount)}</Badge></>
            )}
          </DialogTitle>
        </DialogHeader>

        {receipt && (
          <>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-muted-foreground">Nhà cung cấp: </span><b>{receipt.supplierName}</b></div>
              <div><span className="text-muted-foreground">Người nhập: </span>{receipt.userFullName || '—'}</div>
              <div className="md:col-span-2"><span className="text-muted-foreground">Ngày nhập: </span>{formatDateTime(receipt.createdAt)}</div>
              {receipt.note && <div className="md:col-span-2"><span className="text-muted-foreground">Ghi chú: </span>{receipt.note}</div>}
            </div>

            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_60px_120px_60px_130px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Sản phẩm</span>
                <span className="text-right">SL</span>
                <span className="text-right">Giá nhập</span>
                <span className="text-right">Còn</span>
                <span className="text-right">Thành tiền</span>
              </div>
              <div className="divide-y">
                {receipt.items.map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_60px_120px_60px_130px] items-center gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img src={productImageSrc(it.productImage)} alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover" />
                      <span className="line-clamp-1 text-sm">{it.productName}</span>
                    </div>
                    <span className="text-right text-sm">{it.quantity}</span>
                    <span className="text-right text-sm">{formatPrice(it.importPrice)}</span>
                    <span className="text-right">
                      {receipt.status === 'cancelled' ? (
                        <span className="text-xs text-muted-foreground">Đã hủy</span>
                      ) : isPending ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          title="Chưa nhập vào kho — bấm Duyệt phiếu để cộng.">
                          Chờ nhập
                        </Badge>
                      ) : (
                        <Badge variant={it.remainingQuantity > 0 ? 'default' : 'secondary'}
                          title={it.remainingQuantity > 0
                            ? `Còn ${it.remainingQuantity} sản phẩm trong lô này (đã bán ${it.quantity - it.remainingQuantity})`
                            : 'Lô này đã bán hết'}>
                          {it.remainingQuantity} / {it.quantity}
                        </Badge>
                      )}
                    </span>
                    <span className="text-right text-sm font-semibold">{formatPrice(it.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-3 w-3" /> Đóng
          </Button>
          {isPending && (
            <>
              <Button variant="destructive" onClick={() => setConfirmAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" /> Hủy phiếu
              </Button>
              <Button onClick={() => setConfirmAction('approve')}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Duyệt phiếu
              </Button>
            </>
          )}
        </DialogFooter>

        {/* Approve confirm */}
        <AlertDialog open={confirmAction === 'approve'} onOpenChange={(o) => !o && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận nhập hàng vào kho?</AlertDialogTitle>
              <AlertDialogDescription>
                Sau khi xác nhận, hàng trong phiếu <b className="font-mono">{receipt?.code}</b> sẽ
                được cộng vào tồn kho và có thể bán ngay. Thao tác này <b>không thể hoàn tác</b>.
                Nếu sau này phát hiện nhập sai, bạn cần tạo <b>phiếu xuất</b> để điều chỉnh.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={approve.isPending}>Xem lại</AlertDialogCancel>
              <AlertDialogAction disabled={approve.isPending}
                onClick={(e) => { e.preventDefault(); doApprove() }}>
                {approve.isPending ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel confirm */}
        <AlertDialog open={confirmAction === 'cancel'} onOpenChange={(o) => !o && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hủy phiếu này?</AlertDialogTitle>
              <AlertDialogDescription>
                Phiếu <b className="font-mono">{receipt?.code}</b> chưa được duyệt nên không ảnh hưởng
                đến kho. Sau khi hủy sẽ không mở lại được — nếu cần nhập lại, bạn phải tạo phiếu mới.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Lý do hủy (tùy chọn)</Label>
              <textarea id="cancel-reason" rows={2} value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: nhập nhầm giá, sai số lượng, đổi nhà cung cấp..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancel.isPending}>Không</AlertDialogCancel>
              <AlertDialogAction disabled={cancel.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => { e.preventDefault(); doCancel() }}>
                {cancel.isPending ? 'Đang hủy...' : 'Hủy phiếu'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
