import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Package, ArchiveRestore, FileText,
  Handshake, Receipt, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import { ProductPickerDialog } from '@/components/admin/common/ProductPickerDialog'
import {
  usePartners, useCreateReceipt,
} from '@/hooks/api/useAdminInventory'
import { formatPrice, productImageSrc } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProductListItem } from '@/types/api'

interface RowState {
  productId: number
  productName: string
  productImage?: string
  currentStock?: number
  price: number      // giá bán để validate
  quantity: number
  importPrice: number
}

export function AdminCreateReceiptPage() {
  const navigate = useNavigate()
  const { data: partners } = usePartners('supplier')
  const create = useCreateReceipt()

  const [supplierId, setSupplierId] = useState<string>('')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<RowState[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const totalAmount = rows.reduce((sum, r) => sum + (r.quantity || 0) * (r.importPrice || 0), 0)
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0)

  const addProducts = (products: ProductListItem[]) => {
    const existingIds = new Set(rows.map((r) => r.productId))
    const newRows = products
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        productImage: p.primaryImage,
        currentStock: p.stock,
        price: p.price,
        quantity: 1,
        importPrice: Number((p.price * 0.85).toFixed(0)),  // gợi ý 85% giá bán
      }))
    if (newRows.length > 0) {
      setRows([...rows, ...newRows])
      toast.success(`Đã thêm ${newRows.length} sản phẩm`)
    }
  }

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    const next = [...rows]; next[idx] = { ...next[idx], ...patch }; setRows(next)
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!supplierId) { toast.error('Chưa chọn nhà cung cấp'); return }
    if (rows.length === 0) { toast.error('Chưa có sản phẩm nào'); return }
    for (const r of rows) {
      if (r.quantity <= 0) { toast.error(`SP "${r.productName}" cần số lượng > 0`); return }
      if (r.importPrice <= 0) { toast.error(`SP "${r.productName}" cần giá nhập > 0`); return }
      if (r.importPrice > r.price) {
        toast.error(`Giá nhập "${r.productName}" (${formatPrice(r.importPrice)}) > giá bán (${formatPrice(r.price)})`); return
      }
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
      toast.success('Đã tạo phiếu nhập — chờ duyệt để cộng kho')
      navigate('/admin/phieu-nhap')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/phieu-nhap"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <AdminPageHeader title="Tạo phiếu nhập kho" sprint="Sprint 9E" />
        <div className="ml-auto">
          <Button onClick={submit} disabled={create.isPending} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {create.isPending ? 'Đang lưu...' : 'Lưu phiếu nhập'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Products */}
          <AdminSection
            title={`Sản phẩm (${rows.length})`}
            description="Bấm 'Chọn sản phẩm' để mở danh sách có lọc theo danh mục / thương hiệu — chọn nhiều SP cùng lúc"
            icon={Package}
          >
            <div className="space-y-3">
              <Button variant="outline" onClick={() => setPickerOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Chọn sản phẩm
              </Button>

              {rows.length === 0 ? (
                <div className="grid place-items-center rounded-md border border-dashed py-6 text-sm text-muted-foreground">
                  Chưa có SP nào — bấm "Chọn sản phẩm" ở trên để thêm.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[1fr_90px_140px_120px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Sản phẩm</span>
                    <span className="text-right">Số lượng</span>
                    <span className="text-right">Giá nhập (đ)</span>
                    <span className="text-right">Thành tiền</span>
                    <span />
                  </div>
                  <div className="divide-y">
                    {rows.map((r, i) => {
                      const overPrice = r.importPrice > r.price
                      return (
                        <div key={r.productId} className="grid grid-cols-[1fr_90px_140px_120px_40px] items-center gap-2 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <img src={productImageSrc(r.productImage)} alt=""
                              className="h-10 w-10 shrink-0 rounded object-cover" />
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-medium">{r.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                Giá bán: {formatPrice(r.price)} · Tồn: {r.currentStock ?? '?'}
                              </div>
                            </div>
                          </div>
                          <Input type="number" min={1} value={r.quantity}
                            onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-9 text-right" />
                          <div>
                            <Input type="number" min={0} value={r.importPrice}
                              onChange={(e) => updateRow(i, { importPrice: Math.max(0, Number(e.target.value) || 0) })}
                              className={cn('h-9 text-right', overPrice && 'border-destructive')} />
                            {overPrice && (
                              <div className="mt-0.5 text-[10px] text-destructive">Vượt giá bán!</div>
                            )}
                          </div>
                          <div className="text-right text-sm font-semibold">
                            {formatPrice(r.quantity * r.importPrice)}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}
                            title="Xóa dòng">
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

          {/* Note */}
          <AdminSection title="Ghi chú" icon={FileText} compact
            description="Mô tả ngắn về lô hàng (không bắt buộc)">
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập hàng đầu tháng, promo mùa hè, v.v..." />
          </AdminSection>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <AdminSection
            title="Nhà cung cấp"
            description="Bắt buộc — mỗi phiếu 1 NCC"
            icon={Handshake}
          >
            <div className="space-y-2">
              <Label className="text-xs">NCC *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Chọn nhà cung cấp..." /></SelectTrigger>
                <SelectContent>
                  {(partners ?? []).filter((p) => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-mono text-xs mr-2 text-primary">{p.code}</span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AdminSection>

          <AdminSection
            title="Tổng kết"
            icon={Receipt}
            compact
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số SP</span>
                <span className="font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng SL nhập</span>
                <span className="font-medium">{totalQty}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Tổng tiền</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title="Ghi chú"
            icon={ArchiveRestore}
            compact
          >
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Sau khi lưu, phiếu ở trạng thái <b>chờ duyệt</b> — kho <b>chưa</b> cộng.</p>
              <p>• Admin vào chi tiết phiếu → <b>Duyệt</b> để cộng kho + đưa lô vào bán (theo thứ tự cũ nhất trước).</p>
              <p>• Nếu nhập nhầm khi chưa duyệt → bấm <b>Hủy phiếu</b>. Đã duyệt rồi thì tạo <b>Phiếu xuất thủ công</b> để cân đối.</p>
              <p>• <b>Giá nhập ≤ Giá bán</b> — chặn để tránh lỗ. Gợi ý giá: 85% giá bán.</p>
            </div>
          </AdminSection>
        </div>
      </div>

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={rows.map((r) => r.productId)}
        onConfirm={addProducts}
        title="Chọn sản phẩm để nhập kho"
        description="Chọn nhiều SP cùng lúc — số lượng + giá nhập chỉnh sau ở bảng bên dưới."
      />
    </div>
  )
}
