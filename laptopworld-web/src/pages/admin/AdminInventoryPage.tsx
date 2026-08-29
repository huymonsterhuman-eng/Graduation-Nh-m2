import { useState, useMemo } from 'react'
import { Boxes, Eye, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { useAdminProducts, type StockStatus } from '@/hooks/api/useAdminProducts'
import { useAdminBrands } from '@/hooks/api/useAdminCatalog'
import { useProductBatches } from '@/hooks/api/useAdminInventory'
import { formatPrice, productImageSrc, formatDateTime } from '@/lib/format'
import type { ProductListItem } from '@/types/api'

const STOCK_LABEL: Record<StockStatus, string> = {
  ALL: 'Tất cả',
  IN_STOCK: 'Còn hàng',
  LOW_STOCK: 'Thấp (5-10)',
  CRITICAL_STOCK: 'Cảnh báo (1-4)',
  OUT_OF_STOCK: 'Hết hàng',
}

function stockBadge(stock: number) {
  if (stock <= 0) return { label: 'Hết', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' }
  if (stock <= 4) return { label: `${stock}`, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' }
  if (stock <= 10) return { label: `${stock}`, className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' }
  return { label: `${stock}`, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
}

export function AdminInventoryPage() {
  const [keyword, setKeyword] = useState('')
  const [brandId, setBrandId] = useState<string>('ALL')
  const [stockStatus, setStockStatus] = useState<StockStatus>('ALL')
  const [page, setPage] = useState(0)
  const [batchOfProduct, setBatchOfProduct] = useState<{ id: number; name: string } | null>(null)

  const filter = useMemo(() => ({
    keyword: keyword || undefined,
    brandId: brandId === 'ALL' ? null : Number(brandId),
    isActive: true,      // trang tồn kho chỉ list SP đang bán
    stockStatus,
    page, size: 20,
  }), [keyword, brandId, stockStatus, page])

  const { data: paged, isLoading } = useAdminProducts(filter)
  const { data: brands } = useAdminBrands()

  const columns: AdminColumn<ProductListItem>[] = [
    {
      key: 'image', header: '', className: 'w-14',
      cell: (p) => <img src={productImageSrc(p.primaryImage)} alt=""
        className="h-10 w-10 rounded border object-cover" />,
    },
    {
      key: 'name', header: 'Sản phẩm',
      cell: (p) => (
        <div className="min-w-0">
          <div className="line-clamp-1 font-medium">{p.name}</div>
          <div className="text-xs text-muted-foreground">
            {p.brandName || '—'} · {p.categoryName || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'price', header: 'Giá bán', align: 'right',
      cell: (p) => <span className="text-sm">{formatPrice(p.salePrice ?? p.price)}</span>,
    },
    {
      key: 'stock', header: 'Tồn kho', align: 'center', className: 'w-24',
      cell: (p) => {
        const b = stockBadge(p.stock)
        return <Badge className={b.className}>{b.label}</Badge>
      },
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-40',
      cell: (p) => (
        <Button variant="outline" size="sm"
          onClick={() => setBatchOfProduct({ id: p.id, name: p.name })}>
          <Eye className="mr-2 h-3 w-3" /> Xem lô hàng
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Tồn kho"
        icon={Boxes}
        sprint="Sprint 9E"
        description="Xem tồn kho theo từng SP + chi tiết các lô nhập theo FIFO."
      />

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
            placeholder="Tìm theo tên SP..."
            className="pl-9" />
        </div>
        <Select value={brandId} onValueChange={(v) => { setBrandId(v); setPage(0) }}>
          <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="ALL">Tất cả brand</SelectItem>
            {(brands ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockStatus} onValueChange={(v) => { setStockStatus(v as StockStatus); setPage(0) }}>
          <SelectTrigger><SelectValue placeholder="Tồn kho" /></SelectTrigger>
          <SelectContent>
            {(Object.keys(STOCK_LABEL) as StockStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STOCK_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <AdminTable<ProductListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="Không có SP nào khớp"
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

      {batchOfProduct && (
        <BatchesDialog
          productId={batchOfProduct.id}
          productName={batchOfProduct.name}
          onClose={() => setBatchOfProduct(null)}
        />
      )}
    </div>
  )
}

function BatchesDialog({
  productId, productName, onClose,
}: { productId: number; productName: string; onClose: () => void }) {
  const { data, isLoading } = useProductBatches(productId, true)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">Lô hàng: {productName}</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Đang tải...</div>
        ) : (
          <>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">Tồn kho hiện tại</div>
                <div className="text-2xl font-bold text-primary">{data.totalRemaining}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">Số lô nhập còn hàng</div>
                <div className="text-2xl font-bold">{data.batchCount}</div>
              </Card>
            </div>

            {data.cachedStock !== data.totalRemaining && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Số hiển thị ở danh sách sản phẩm ({data.cachedStock}) đang lệch so với tổng theo lô nhập
                ({data.totalRemaining}). Lần nhập/xuất tiếp theo hệ thống sẽ tự đồng bộ lại.
              </div>
            )}

            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px_130px_140px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Mã phiếu nhập</span>
                <span className="text-right">SL nhập</span>
                <span className="text-right">Còn lại</span>
                <span className="text-right">Giá nhập</span>
                <span>Ngày nhập</span>
              </div>
              <div className="divide-y">
                {data.batches.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Chưa có lô nào còn hàng.</div>
                ) : data.batches.map((b, i) => (
                  <div key={b.goodsReceiptDetailId} className="grid grid-cols-[1fr_100px_100px_130px_140px] items-center gap-2 px-3 py-2">
                    <div>
                      <div className="font-mono text-sm">{b.goodsReceiptCode || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        NCC: {b.supplierName || '—'} · {i === 0 && <span className="font-semibold text-primary">FIFO next</span>}
                      </div>
                    </div>
                    <span className="text-right text-sm">{b.quantity}</span>
                    <span className="text-right">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {b.remainingQuantity}
                      </Badge>
                    </span>
                    <span className="text-right text-sm">{formatPrice(b.importPrice)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(b.importedAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="mr-2 h-3 w-3" /> Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
