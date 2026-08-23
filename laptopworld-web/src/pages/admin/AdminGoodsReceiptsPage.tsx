import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArchiveRestore, Plus, Eye, Search, X, Trash2 } from 'lucide-react'
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
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { ProductCombobox } from '@/components/admin/common/ProductCombobox'
import {
  useAdminReceipts, useAdminReceiptDetail, useCreateReceipt,
  usePartners,
  type ReceiptItemInput,
} from '@/hooks/api/useAdminInventory'
import { formatPrice, formatDateTime, productImageSrc } from '@/lib/format'
import type { GoodsReceiptListItem, ProductListItem } from '@/types/api'

export function AdminGoodsReceiptsPage() {
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: paged, isLoading } = useAdminReceipts({ page, size: 20 })

  const columns: AdminColumn<GoodsReceiptListItem>[] = [
    {
      key: 'code', header: 'Mã phiếu',
      cell: (r) => <span className="font-mono text-sm font-medium">{r.code}</span>,
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
      key: 'note', header: 'Ghi chú', className: 'max-w-xs',
      cell: (r) => <span className="line-clamp-2 text-xs text-muted-foreground">{r.note || '—'}</span>,
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
        data={paged?.content}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu nhập nào"
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

      {createOpen && <CreateReceiptDialog onClose={() => setCreateOpen(false)} />}
      {detailId && <ReceiptDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

// =============== Create dialog ===============

interface RowState extends ReceiptItemInput {
  productName?: string
  productImage?: string
  currentStock?: number
}

function CreateReceiptDialog({ onClose }: { onClose: () => void }) {
  const { data: partners } = usePartners('supplier')
  const create = useCreateReceipt()

  const [supplierId, setSupplierId] = useState<string>('')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<RowState[]>([])

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.importPrice) || 0), 0)

  const addRow = (p: ProductListItem) => {
    if (rows.some((r) => r.productId === p.id)) {
      toast.info(`"${p.name}" đã có trong phiếu`)
      return
    }
    setRows([...rows, {
      productId: p.id,
      productName: p.name,
      productImage: p.primaryImage,
      currentStock: p.stock,
      quantity: 1,
      importPrice: Number((p.price * 0.85).toFixed(0)),  // gợi ý 85% giá bán
    }])
  }

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    const next = [...rows]
    next[idx] = { ...next[idx], ...patch }
    setRows(next)
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!supplierId) { toast.error('Chưa chọn nhà cung cấp'); return }
    if (rows.length === 0) { toast.error('Chưa có sản phẩm nào'); return }
    for (const r of rows) {
      if (r.quantity <= 0) { toast.error(`SP "${r.productName}" cần số lượng > 0`); return }
      if (r.importPrice <= 0) { toast.error(`SP "${r.productName}" cần giá nhập > 0`); return }
    }
    try {
      await create.mutateAsync({
        supplierId: Number(supplierId),
        note: note || undefined,
        items: rows.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          importPrice: r.importPrice,
        })),
      })
      toast.success('Đã tạo phiếu nhập — kho đã được cộng thêm')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu nhập kho</DialogTitle>
          <DialogDescription>
            Chọn nhà cung cấp, thêm SP, nhập số lượng + giá nhập. Kho sẽ tự cộng thêm khi lưu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nhà cung cấp *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Chọn nhà cung cấp" /></SelectTrigger>
              <SelectContent>
                {(partners ?? []).filter((p) => p.isActive).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập hàng đầu tháng, v.v..." />
          </div>
        </div>

        {/* Items table */}
        <div className="space-y-2">
          <Label>Sản phẩm ({rows.length})</Label>

          <ProductCombobox
            placeholder="Tìm SP theo tên để thêm vào phiếu nhập..."
            excludeIds={rows.map((r) => r.productId)}
            onPick={(p) => addRow(p)}
          />

          {rows.length === 0 ? (
            <Card className="grid place-items-center border-dashed py-8 text-sm text-muted-foreground">
              Dùng thanh tìm ở trên để chọn SP.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_140px_140px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Sản phẩm</span>
                <span className="text-right">Số lượng</span>
                <span className="text-right">Giá nhập (đ)</span>
                <span className="text-right">Thành tiền</span>
                <span />
              </div>
              <div className="divide-y">
                {rows.map((r, i) => (
                  <div key={r.productId} className="grid grid-cols-[1fr_100px_140px_140px_40px] items-center gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img src={productImageSrc(r.productImage)} alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover" />
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-medium">{r.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          Tồn hiện tại: {r.currentStock ?? '?'}
                        </div>
                      </div>
                    </div>
                    <Input type="number" min={1} value={r.quantity}
                      onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9 text-right" />
                    <Input type="number" min={0} value={r.importPrice}
                      onChange={(e) => updateRow(i, { importPrice: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-9 text-right" />
                    <div className="text-right text-sm font-semibold">
                      {formatPrice(r.quantity * r.importPrice)}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}
                      title="Xóa dòng">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t bg-muted/30 px-3 py-2 text-sm">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Tổng tiền phiếu</div>
                  <div className="text-lg font-bold text-primary">{formatPrice(totalAmount)}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>Hủy</Button>
          <Button onClick={submit} disabled={create.isPending || rows.length === 0}>
            {create.isPending ? 'Đang lưu...' : 'Lưu phiếu nhập'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============== Detail dialog ===============

function ReceiptDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: receipt, isLoading } = useAdminReceiptDetail(id)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="h-5 w-5" />
            {isLoading || !receipt ? 'Đang tải...' : (
              <><span className="font-mono">{receipt.code}</span>
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
                      <Badge variant={it.remainingQuantity > 0 ? 'default' : 'secondary'}>{it.remainingQuantity}</Badge>
                    </span>
                    <span className="text-right text-sm font-semibold">{formatPrice(it.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-3 w-3" /> Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
