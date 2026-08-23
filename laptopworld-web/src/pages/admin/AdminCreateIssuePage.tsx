import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Package, PackageMinus, FileText, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import { ProductCombobox } from '@/components/admin/common/ProductCombobox'
import { useCreateManualIssue } from '@/hooks/api/useAdminInventory'
import { productImageSrc } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProductListItem } from '@/types/api'

interface Row {
  productId: number
  productName: string
  productImage?: string
  currentStock: number
  quantity: number
}

export function AdminCreateIssuePage() {
  const navigate = useNavigate()
  const create = useCreateManualIssue()

  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Row[]>([])

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0)

  const addRow = (p: ProductListItem) => {
    if (rows.some((r) => r.productId === p.id)) {
      toast.info(`"${p.name}" đã có trong phiếu`); return
    }
    setRows([...rows, {
      productId: p.id, productName: p.name, productImage: p.primaryImage,
      currentStock: p.stock, quantity: 1,
    }])
  }
  const updateRow = (idx: number, patch: Partial<Row>) => {
    const next = [...rows]; next[idx] = { ...next[idx], ...patch }; setRows(next)
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!note.trim()) { toast.error('Vui lòng nhập lý do xuất kho'); return }
    if (rows.length === 0) { toast.error('Chưa có SP nào'); return }
    for (const r of rows) {
      if (r.quantity <= 0) { toast.error(`SP "${r.productName}" cần SL > 0`); return }
      if (r.quantity > r.currentStock) {
        toast.error(`SP "${r.productName}" chỉ còn ${r.currentStock} — không đủ để xuất ${r.quantity}`); return
      }
    }
    try {
      await create.mutateAsync({
        note,
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
      })
      toast.success('Đã tạo phiếu xuất — chờ kho duyệt')
      navigate('/admin/phieu-xuat')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/phieu-xuat"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <AdminPageHeader title="Tạo phiếu xuất thủ công" sprint="Sprint 9E" />
        <div className="ml-auto">
          <Button onClick={submit} disabled={create.isPending} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {create.isPending ? 'Đang lưu...' : 'Tạo phiếu (chờ duyệt)'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Products */}
          <AdminSection
            title={`Sản phẩm (${rows.length})`}
            description="Gõ tên để tìm — SL xuất không được vượt tồn kho"
            icon={Package}
          >
            <div className="space-y-3">
              <ProductCombobox
                placeholder="Tìm SP để xuất kho..."
                excludeIds={rows.map((r) => r.productId)}
                requireStock
                onPick={(p) => addRow(p)}
              />

              {rows.length === 0 ? (
                <div className="grid place-items-center rounded-md border border-dashed py-6 text-sm text-muted-foreground">
                  Dùng thanh tìm ở trên để chọn SP.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[1fr_100px_120px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Sản phẩm</span>
                    <span className="text-right">Tồn hiện tại</span>
                    <span className="text-right">SL xuất</span>
                    <span />
                  </div>
                  <div className="divide-y">
                    {rows.map((r, i) => {
                      const overStock = r.quantity > r.currentStock
                      return (
                        <div key={r.productId} className="grid grid-cols-[1fr_100px_120px_40px] items-center gap-2 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <img src={productImageSrc(r.productImage)} alt="" className="h-10 w-10 rounded object-cover" />
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-medium">{r.productName}</div>
                            </div>
                          </div>
                          <span className="text-right">
                            <Badge variant={r.currentStock > 0 ? 'default' : 'destructive'}>
                              {r.currentStock}
                            </Badge>
                          </span>
                          <Input type="number" min={1} max={r.currentStock} value={r.quantity}
                            onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className={cn('h-9 text-right', overStock && 'border-destructive')} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </AdminSection>

          {/* Reason */}
          <AdminSection
            title="Lý do xuất *"
            description="Bắt buộc — sẽ được lưu vào ghi chú phiếu"
            icon={FileText}
          >
            <textarea rows={3} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Chuyển sang chi nhánh 2, hỏng vỡ khi bảo trì, quà tặng KH VIP..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
          </AdminSection>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <AdminSection
            title="Tổng kết"
            icon={PackageMinus}
            compact
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số SP</span>
                <span className="font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng SL xuất</span>
                <span className="font-medium">{totalQty}</span>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title="Lưu ý"
            icon={AlertTriangle}
            compact
          >
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Phiếu tạo ra ở trạng thái <b>Chờ duyệt</b>.</p>
              <p>• Kho sẽ approve → FIFO chạy → trừ tồn theo lô cũ nhất.</p>
              <p>• Nếu reject → phiếu hủy, tồn kho <b>không đổi</b>.</p>
              <p>• Xuất manual <b>không</b> gắn với đơn hàng nào — dùng cho quà tặng, chuyển kho...</p>
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  )
}
