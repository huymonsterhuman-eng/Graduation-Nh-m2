import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PackageMinus, Plus, Eye, CheckCircle2, XCircle, Search, Trash2, X, Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { IssueStatusBadge, IssueTypeBadge } from '@/components/admin/common/OrderStatusBadge'
import {
  useAdminIssues, useAdminIssueDetail, useApproveIssue, useRejectIssue,
  useCreateManualIssue, useIssueCounts, usePartners,
  type ManualIssueItem,
} from '@/hooks/api/useAdminInventory'
import { ProductCombobox } from '@/components/admin/common/ProductCombobox'
import {
  Select as UiSelect, SelectContent as UiSelectContent, SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatPrice, formatDateTime, productImageSrc } from '@/lib/format'
import type { GoodsIssueListItem, GoodsIssueStatus, ProductListItem } from '@/types/api'

const STATUS_LABEL: Record<GoodsIssueStatus | 'ALL', string> = {
  ALL: 'Tất cả',
  pending: 'Chờ duyệt',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

export function AdminGoodsIssuesPage() {
  const [typeTab, setTypeTab] = useState<'auto' | 'manual'>('auto')
  const [status, setStatus] = useState<GoodsIssueStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [approveId, setApproveId] = useState<number | null>(null)
  const [approvePartnerId, setApprovePartnerId] = useState<string>('')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: paged, isLoading } = useAdminIssues({ status, type: typeTab, page, size: 20 })
  const { data: counts } = useIssueCounts()
  const { data: shippingPartners } = usePartners('shipping_provider')
  const approve = useApproveIssue()
  const reject = useRejectIssue()

  const handleApprove = async () => {
    if (!approveId) return
    const isAuto = paged?.content.find((i) => i.id === approveId)?.type === 'auto'
    if (isAuto && !approvePartnerId) {
      toast.error('Vui lòng chọn đơn vị vận chuyển')
      return
    }
    try {
      await approve.mutateAsync({
        id: approveId,
        shippingPartnerId: isAuto ? Number(approvePartnerId) : undefined,
      })
      toast.success(isAuto ? 'Đã bàn giao ĐVVC — kho đã trừ + tracking sinh' : 'Đã duyệt — kho đã trừ')
      setApproveId(null)
      setApprovePartnerId('')
    } catch (e) { toast.error((e as Error).message) }
  }
  const handleReject = async () => {
    if (!rejectId) return
    try {
      await reject.mutateAsync({ id: rejectId, reason: rejectReason || undefined })
      toast.success('Đã từ chối phiếu xuất')
      setRejectId(null)
      setRejectReason('')
    } catch (e) { toast.error((e as Error).message) }
  }

  const approvingIssue = paged?.content.find((i) => i.id === approveId)
  const rejectingIssue = paged?.content.find((i) => i.id === rejectId)

  const columns: AdminColumn<GoodsIssueListItem>[] = [
    {
      key: 'code', header: 'Mã phiếu',
      cell: (i) => <span className="font-mono text-sm font-medium">{i.code}</span>,
    },
    {
      key: 'order', header: 'Đơn hàng',
      cell: (i) => i.orderCode
        ? <span className="font-mono text-xs">{i.orderCode}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    { key: 'type', header: 'Loại', cell: (i) => <IssueTypeBadge type={i.type} /> },
    { key: 'status', header: 'Trạng thái', cell: (i) => <IssueStatusBadge status={i.status} /> },
    {
      key: 'author', header: 'Người thực hiện',
      cell: (i) => <span className="text-sm text-muted-foreground">{i.authorName || '—'}</span>,
    },
    {
      key: 'cogs', header: 'Giá trị (COGS)', align: 'right',
      cell: (i) => i.totalCogs > 0
        ? <span className="font-semibold">{formatPrice(i.totalCogs)}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'time', header: 'Ngày',
      cell: (i) => <span className="text-xs text-muted-foreground">{formatDateTime(i.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-40',
      cell: (i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(i.id)} title="Chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          {i.status === 'pending' && (
            <>
              <Button variant="ghost" size="icon"
                onClick={() => setApproveId(i.id)}
                title={i.type === 'auto' ? 'Bàn giao ĐVVC' : 'Duyệt phiếu'}>
                {i.type === 'auto'
                  ? <Truck className="h-4 w-4 text-primary" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </Button>
              <Button variant="ghost" size="icon"
                onClick={() => setRejectId(i.id)} title="Từ chối">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Phiếu xuất kho"
        icon={PackageMinus}
        sprint="Sprint 9E"
        description={`Auto (từ đơn hàng): ${counts?.auto ?? 0} · Manual (thủ công): ${counts?.manual ?? 0}`}
        actions={
          <Button asChild>
            <Link to="/admin/phieu-xuat/moi">
              <Plus className="mr-2 h-4 w-4" /> Tạo phiếu xuất thủ công
            </Link>
          </Button>
        }
      />

      {/* Tab type: Auto vs Manual */}
      <Card className="p-1">
        <div className="flex gap-1">
          {(['auto', 'manual'] as const).map((t) => {
            const active = typeTab === t
            const total = t === 'auto' ? counts?.auto ?? 0 : counts?.manual ?? 0
            const pending = t === 'auto' ? counts?.autoPending ?? 0 : counts?.manualPending ?? 0
            const label = t === 'auto' ? '🚚 Tự động (từ đơn hàng)' : '📝 Thủ công'
            return (
              <button key={t} type="button"
                onClick={() => { setTypeTab(t); setStatus('ALL'); setPage(0) }}
                className={cn(
                  'flex flex-1 items-center justify-between rounded-md px-4 py-2.5 text-sm font-medium transition',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <span>{label}</span>
                <div className="flex items-center gap-2">
                  {pending > 0 && (
                    <span className={cn(
                      'grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[10px] font-semibold',
                      active
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    )}>
                      {pending} chờ
                    </span>
                  )}
                  <span className={cn(
                    'grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[10px] font-semibold',
                    active ? 'bg-primary-foreground text-primary' : 'bg-muted'
                  )}>{total}</span>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <AdminTable<GoodsIssueListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu xuất nào"
        toolbar={
          <Select value={status} onValueChange={(v) => { setStatus(v as GoodsIssueStatus | 'ALL'); setPage(0) }}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as Array<GoodsIssueStatus | 'ALL'>).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Trang {page + 1} / {paged.totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!paged.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>Trước</Button>
            <Button variant="outline" size="sm" disabled={!paged.hasNext}
              onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {/* Approve dialog */}
      <AlertDialog open={approveId !== null} onOpenChange={(o) => !o && (setApproveId(null), setApprovePartnerId(''))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvingIssue?.type === 'auto'
                ? 'Bàn giao hàng cho đơn vị vận chuyển?'
                : 'Duyệt phiếu xuất kho?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvingIssue?.type === 'auto'
                ? <>Chọn ĐVVC → hệ thống tự sinh mã vận đơn → kho trừ tồn theo FIFO → đơn <b>{approvingIssue.orderCode}</b> tự sang <i>Đang giao hàng</i>. <b>Không thể hoàn tác.</b></>
                : 'Kho sẽ trừ tồn theo FIFO. Không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {approvingIssue?.type === 'auto' && (
            <div className="space-y-2">
              <Label htmlFor="shipPartner">Đơn vị vận chuyển *</Label>
              <UiSelect value={approvePartnerId} onValueChange={setApprovePartnerId}>
                <UiSelectTrigger id="shipPartner">
                  <UiSelectValue placeholder="Chọn ĐVVC..." />
                </UiSelectTrigger>
                <UiSelectContent>
                  {(shippingPartners ?? []).filter((p) => p.isActive).map((p) => (
                    <UiSelectItem key={p.id} value={String(p.id)}>
                      <span className="font-mono text-xs mr-2 text-primary">{p.code}</span>
                      {p.name}
                    </UiSelectItem>
                  ))}
                </UiSelectContent>
              </UiSelect>
              <p className="text-xs text-muted-foreground">
                Mã vận đơn tự sinh: <span className="font-mono">{'{MÃ_ĐVVC}{YYMMDD}{5 số ngẫu nhiên}'}</span>
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={approve.isPending}>Không</AlertDialogCancel>
            <AlertDialogAction disabled={approve.isPending}
              onClick={(e) => { e.preventDefault(); handleApprove() }}>
              {approve.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối phiếu xuất?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectingIssue?.type === 'auto'
                ? <>Phiếu <b>{rejectingIssue.code}</b> sẽ bị hủy, đơn <b>{rejectingIssue.orderCode}</b> quay về <i>Đã xác nhận</i>. Kho không đổi.</>
                : <>Phiếu manual <b>{rejectingIssue?.code}</b> sẽ bị hủy. Kho không đổi.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do từ chối (tùy chọn)</Label>
            <textarea id="reason" rows={3} value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Hàng chưa về kịp, cần nhập thêm..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reject.isPending}>Không</AlertDialogCancel>
            <AlertDialogAction disabled={reject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleReject() }}>
              {reject.isPending ? 'Đang xử lý...' : 'Từ chối'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {createOpen && <CreateManualIssueDialog onClose={() => setCreateOpen(false)} />}
      {detailId && <IssueDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

// =============== Create manual issue ===============

interface ManualRow extends ManualIssueItem {
  productName?: string
  productImage?: string
  currentStock?: number
}

function CreateManualIssueDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateManualIssue()
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<ManualRow[]>([])

  const addRow = (p: ProductListItem) => {
    if (rows.some((r) => r.productId === p.id)) {
      toast.info(`"${p.name}" đã có trong phiếu`)
      return
    }
    setRows([...rows, { productId: p.id, productName: p.name, productImage: p.primaryImage, currentStock: p.stock, quantity: 1 }])
  }
  const updateRow = (idx: number, patch: Partial<ManualRow>) => {
    const next = [...rows]; next[idx] = { ...next[idx], ...patch }; setRows(next)
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!note.trim()) { toast.error('Vui lòng nhập lý do xuất kho'); return }
    if (rows.length === 0) { toast.error('Chưa có SP nào'); return }
    for (const r of rows) {
      if (r.quantity <= 0) { toast.error(`SP "${r.productName}" cần SL > 0`); return }
      if (r.currentStock != null && r.quantity > r.currentStock) {
        toast.error(`SP "${r.productName}" chỉ còn ${r.currentStock} — không đủ để xuất ${r.quantity}`); return
      }
    }
    try {
      await create.mutateAsync({
        note,
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
      })
      toast.success('Đã tạo phiếu xuất — chờ kho duyệt')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu xuất thủ công</DialogTitle>
          <DialogDescription>
            Xuất kho ngoài quy trình đơn hàng (VD: chuyển kho khác, hỏng vỡ, quà tặng...).
            Phiếu tạo ra ở trạng thái <b>Chờ duyệt</b>, cần approve mới trừ tồn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="note">Lý do xuất *</Label>
          <textarea id="note" rows={2} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Chuyển sang chi nhánh, hỏng vỡ khi bảo trì..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
        </div>

        <div className="space-y-2">
          <Label>Sản phẩm ({rows.length})</Label>

          <ProductCombobox
            placeholder="Tìm SP theo tên để xuất kho..."
            excludeIds={rows.map((r) => r.productId)}
            requireStock
            onPick={(p) => addRow(p)}
          />

          {rows.length === 0 ? (
            <Card className="grid place-items-center border-dashed py-8 text-sm text-muted-foreground">
              Dùng thanh tìm ở trên để chọn SP.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Sản phẩm</span>
                <span className="text-right">Tồn hiện tại</span>
                <span className="text-right">SL xuất</span>
                <span />
              </div>
              <div className="divide-y">
                {rows.map((r, i) => {
                  const overStock = r.currentStock != null && r.quantity > r.currentStock
                  return (
                    <div key={r.productId} className="grid grid-cols-[1fr_120px_120px_40px] items-center gap-2 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <img src={productImageSrc(r.productImage)} alt="" className="h-9 w-9 rounded object-cover" />
                        <span className="line-clamp-1 text-sm">{r.productName}</span>
                      </div>
                      <span className="text-right text-sm">
                        <Badge variant={r.currentStock && r.currentStock > 0 ? 'default' : 'destructive'}>
                          {r.currentStock ?? '?'}
                        </Badge>
                      </span>
                      <Input type="number" min={1} value={r.quantity}
                        onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className={`h-8 text-right ${overStock ? 'border-destructive' : ''}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>Hủy</Button>
          <Button onClick={submit} disabled={create.isPending || rows.length === 0}>
            {create.isPending ? 'Đang lưu...' : 'Tạo phiếu (chờ duyệt)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============== Detail dialog ===============

function IssueDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: issue, isLoading } = useAdminIssueDetail(id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <PackageMinus className="h-5 w-5" />
            {isLoading || !issue ? 'Đang tải...' : (<>
              <span className="font-mono">{issue.code}</span>
              <IssueTypeBadge type={issue.type} />
              <IssueStatusBadge status={issue.status} />
            </>)}
          </DialogTitle>
        </DialogHeader>

        {issue && (
          <>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              {issue.orderCode && <div><span className="text-muted-foreground">Đơn: </span><b className="font-mono">{issue.orderCode}</b></div>}
              <div><span className="text-muted-foreground">Người thực hiện: </span>{issue.authorName || '—'}</div>
              <div><span className="text-muted-foreground">Ngày: </span>{formatDateTime(issue.createdAt)}</div>
              {issue.totalCogs > 0 && (
                <div><span className="text-muted-foreground">Tổng COGS: </span><b>{formatPrice(issue.totalCogs)}</b></div>
              )}
              {issue.note && <div className="md:col-span-2"><span className="text-muted-foreground">Ghi chú: </span>{issue.note}</div>}
            </div>

            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_60px_130px_130px_130px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Sản phẩm</span>
                <span className="text-right">SL</span>
                <span className="text-right">Giá vốn</span>
                <span className="text-right">Thành tiền</span>
                <span>Lô nhập</span>
              </div>
              <div className="divide-y">
                {issue.items.map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_60px_130px_130px_130px] items-center gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img src={productImageSrc(it.productImage)} alt="" className="h-8 w-8 rounded object-cover" />
                      <span className="line-clamp-1 text-sm">{it.productName}</span>
                    </div>
                    <span className="text-right text-sm">{it.quantity}</span>
                    <span className="text-right text-sm">{formatPrice(it.importPrice)}</span>
                    <span className="text-right text-sm font-semibold">{formatPrice(it.totalPrice)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {it.goodsReceiptCode ?? <i>chưa gán</i>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="mr-2 h-3 w-3" /> Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
