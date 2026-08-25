import { useState, useMemo } from 'react'
import { Ticket, Plus, Pencil, Trash2, Search, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import {
  useAdminVouchers, useCreateVoucher, useUpdateVoucher, useDeleteVoucher,
  type VoucherInput,
} from '@/hooks/api/useVouchers'
import type { Voucher, VoucherType } from '@/types/api'
import { formatPrice } from '@/lib/format'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

/** ISO string ↔ giá trị của <input type="datetime-local"> (không có TZ). */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Parse số nguyên không âm, tự strip leading zero, cap tối đa. */
function parseIntSafe(v: string, max?: number): number {
  const cleaned = v.replace(/^0+(\d)/, '$1').replace(/[^\d]/g, '')
  const n = cleaned === '' ? 0 : Number(cleaned)
  if (isNaN(n)) return 0
  if (max != null && n > max) return max
  return n
}

function emptyForm(): FormState {
  return {
    code: '', name: '', type: 'fixed',
    discountAmount: 0, minOrderValue: 0, maxDiscount: 0,
    startedAtLocal: '', expiresAtLocal: '',
    usageLimit: '', isActive: true,
  }
}

interface FormState {
  code: string
  name: string
  type: VoucherType
  discountAmount: number
  minOrderValue: number
  maxDiscount: number
  startedAtLocal: string
  expiresAtLocal: string
  usageLimit: string   // giữ string để cho phép trống
  isActive: boolean
}

function toPayload(f: FormState): VoucherInput {
  return {
    code: f.code.trim().toUpperCase(),
    name: f.name.trim(),
    type: f.type,
    discountAmount: f.discountAmount,
    minOrderValue: f.minOrderValue || 0,
    maxDiscount: f.type === 'percent' ? (f.maxDiscount || 0) : 0,
    startedAt: localInputToIso(f.startedAtLocal),
    expiresAt: localInputToIso(f.expiresAtLocal),
    usageLimit: f.usageLimit === '' ? null : Number(f.usageLimit),
    isActive: f.isActive,
  }
}

const TYPE_LABEL: Record<VoucherType, string> = {
  fixed: 'Giảm cố định',
  percent: 'Giảm %',
}

function formatDiscount(v: Voucher): string {
  return v.type === 'percent'
    ? `${v.discountAmount}%${v.maxDiscount ? ` (tối đa ${formatPrice(v.maxDiscount)})` : ''}`
    : formatPrice(v.discountAmount)
}

function voucherStatus(v: Voucher): { label: string; className: string } {
  const now = new Date()
  if (!v.isActive) return { label: 'Ngừng', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' }
  if (v.expiresAt && new Date(v.expiresAt) < now) return { label: 'Hết hạn', className: 'bg-red-500/15 text-red-700 dark:text-red-300' }
  if (v.startedAt && new Date(v.startedAt) > now) return { label: 'Chưa mở', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' }
  if (v.usageLimit && v.usedCount >= v.usageLimit) return { label: 'Hết lượt', className: 'bg-red-500/15 text-red-700 dark:text-red-300' }
  return { label: 'Đang chạy', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
}

export function AdminVouchersPage() {
  const { data, isLoading } = useAdminVouchers()
  const create = useCreateVoucher()
  const update = useUpdateVoucher()
  const remove = useDeleteVoucher()
  const { copy } = useCopyToClipboard()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((v) => {
      if (typeFilter !== 'ALL' && v.type !== typeFilter) return false
      if (statusFilter !== 'ALL') {
        const s = voucherStatus(v).label
        if (statusFilter === 'ACTIVE' && s !== 'Đang chạy') return false
        if (statusFilter === 'INACTIVE' && s === 'Đang chạy') return false
      }
      if (keyword) {
        const kw = keyword.toLowerCase()
        if (!v.code.toLowerCase().includes(kw) && !v.name.toLowerCase().includes(kw)) return false
      }
      return true
    })
  }, [data, keyword, typeFilter, statusFilter])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true) }
  const openEdit = (v: Voucher) => {
    setEditing(v)
    setForm({
      code: v.code,
      name: v.name,
      type: v.type,
      discountAmount: Number(v.discountAmount),
      minOrderValue: Number(v.minOrderValue ?? 0),
      maxDiscount: Number(v.maxDiscount ?? 0),
      startedAtLocal: isoToLocalInput(v.startedAt),
      expiresAtLocal: isoToLocalInput(v.expiresAt),
      usageLimit: v.usageLimit == null ? '' : String(v.usageLimit),
      isActive: v.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error('Vui lòng nhập mã voucher'); return }
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên voucher'); return }
    if (!form.discountAmount || form.discountAmount <= 0) { toast.error('Giá trị giảm phải > 0'); return }
    if (form.type === 'percent' && form.discountAmount > 100) { toast.error('% giảm không được vượt quá 100'); return }
    if (form.startedAtLocal && form.expiresAtLocal &&
        new Date(form.startedAtLocal) >= new Date(form.expiresAtLocal)) {
      toast.error('Thời gian bắt đầu phải trước thời gian kết thúc'); return
    }

    try {
      const payload = toPayload(form)
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: payload })
        toast.success('Đã cập nhật voucher')
      } else {
        await create.mutateAsync(payload)
        toast.success('Đã tạo voucher mới')
      }
      setDialogOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (v: Voucher) => {
    try {
      await remove.mutateAsync(v.id)
      toast.success('Đã xóa voucher')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<Voucher>[] = [
    {
      key: 'code', header: 'Mã', className: 'w-44',
      cell: (v) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="font-mono font-bold">{v.code}</Badge>
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5 opacity-60 hover:opacity-100"
              title="Sao chép mã voucher"
              onClick={() => copy(v.code, `Đã sao chép mã ${v.code}`)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">{v.name}</div>
        </div>
      ),
    },
    {
      key: 'type', header: 'Loại + giảm',
      cell: (v) => (
        <div className="space-y-0.5 text-sm">
          <div>{TYPE_LABEL[v.type]}</div>
          <div className="font-semibold text-primary">{formatDiscount(v)}</div>
        </div>
      ),
    },
    {
      key: 'minOrder', header: 'Đơn tối thiểu', align: 'right',
      cell: (v) => (
        <span className="text-sm">{v.minOrderValue ? formatPrice(v.minOrderValue) : '—'}</span>
      ),
    },
    {
      key: 'usage', header: 'Đã dùng', align: 'center',
      cell: (v) => (
        <span className="font-mono text-sm">
          {v.usedCount}<span className="text-muted-foreground"> / {v.usageLimit ?? '∞'}</span>
        </span>
      ),
    },
    {
      key: 'period', header: 'Hiệu lực',
      cell: (v) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {v.startedAt && <div>Từ: {new Date(v.startedAt).toLocaleString('vi-VN')}</div>}
          {v.expiresAt && <div>Đến: {new Date(v.expiresAt).toLocaleString('vi-VN')}</div>}
          {!v.startedAt && !v.expiresAt && <span>—</span>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center', className: 'w-28',
      cell: (v) => {
        const s = voucherStatus(v)
        return <Badge className={s.className}>{s.label}</Badge>
      },
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-32',
      cell: (v) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa voucher?"
            description={
              <>
                Xóa <b>{v.code}</b>. Chỉ xóa được nếu chưa có ai lưu/dùng voucher này —
                nếu có, hệ thống sẽ báo lỗi. Nếu muốn dừng, hãy tắt trạng thái.
              </>
            }
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(v)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Voucher"
        icon={Ticket}
        sprint="Sprint 9F"
        description="Mã giảm giá cho khách hàng — cố định (VNĐ) hoặc phần trăm (%). Có thể giới hạn thời gian và số lượt sử dụng."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm voucher
          </Button>
        }
      />

      <AdminTable<Voucher>
        columns={columns}
        data={filtered}
        rowKey={(v) => v.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy voucher khớp "${keyword}"` : 'Chưa có voucher nào'}
        toolbar={
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã hoặc tên..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Loại" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                <SelectItem value="fixed">Giảm cố định</SelectItem>
                <SelectItem value="percent">Giảm %</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang chạy</SelectItem>
                <SelectItem value="INACTIVE">Không chạy</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Sửa voucher: ${editing.code}` : 'Thêm voucher mới'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Mã voucher *</Label>
            <Input
              id="code" autoFocus className="font-mono uppercase"
              value={form.code} maxLength={50}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="VD: SUMMER2026"
              disabled={!!editing}
            />
            {editing && <p className="text-xs text-muted-foreground">Không thể đổi mã sau khi tạo.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Tên voucher *</Label>
            <Input
              id="name" value={form.name} maxLength={150}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Khuyến mãi hè 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Loại giảm *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as VoucherType })}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Giảm cố định (VNĐ)</SelectItem>
                <SelectItem value="percent">Giảm phần trăm (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountAmount">
              Giá trị giảm * {form.type === 'percent' ? '(%)' : '(VNĐ)'}
            </Label>
            <Input
              id="discountAmount" type="number" inputMode="numeric"
              min={form.type === 'percent' ? 1 : 1000}
              max={form.type === 'percent' ? 100 : undefined}
              step={form.type === 'percent' ? 1 : 1000}
              value={form.discountAmount === 0 ? '' : form.discountAmount}
              onChange={(e) => setForm({
                ...form,
                discountAmount: parseIntSafe(e.target.value, form.type === 'percent' ? 100 : undefined),
              })}
              placeholder={form.type === 'percent' ? 'VD: 10' : 'VD: 50000'}
            />
            {form.type === 'percent' && (
              <p className="text-xs text-muted-foreground">Nhập số nguyên từ 1 đến 100.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="minOrderValue">Đơn hàng tối thiểu (VNĐ)</Label>
            <Input
              id="minOrderValue" type="number" inputMode="numeric" min={0} step={1000}
              value={form.minOrderValue === 0 ? '' : form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: parseIntSafe(e.target.value) })}
              placeholder="Để trống hoặc 0 = không giới hạn"
            />
            <p className="text-xs text-muted-foreground">
              {form.minOrderValue > 0 ? `≈ ${formatPrice(form.minOrderValue)}` : 'Đơn có bất kỳ giá trị nào cũng áp được.'}
            </p>
          </div>
          {form.type === 'percent' && (
            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Giảm tối đa (VNĐ)</Label>
              <Input
                id="maxDiscount" type="number" inputMode="numeric" min={0} step={1000}
                value={form.maxDiscount === 0 ? '' : form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: parseIntSafe(e.target.value) })}
                placeholder="Để trống = không cap"
              />
              <p className="text-xs text-muted-foreground">
                {form.maxDiscount > 0
                  ? `Chặn giảm quá ${formatPrice(form.maxDiscount)} với đơn lớn.`
                  : 'Không cap — % giảm áp trên toàn bộ subtotal.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="startedAt">Bắt đầu</Label>
            <Input
              id="startedAt" type="datetime-local"
              className="[color-scheme:light] dark:[color-scheme:dark]"
              value={form.startedAtLocal}
              onChange={(e) => setForm({ ...form, startedAtLocal: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Để trống = mở ngay lập tức.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Kết thúc</Label>
            <Input
              id="expiresAt" type="datetime-local"
              className="[color-scheme:light] dark:[color-scheme:dark]"
              value={form.expiresAtLocal}
              onChange={(e) => setForm({ ...form, expiresAtLocal: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Để trống = không hết hạn.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Tổng số lượt được dùng</Label>
            <Input
              id="usageLimit" type="number" inputMode="numeric" min={1}
              value={form.usageLimit}
              onChange={(e) => {
                const v = e.target.value.replace(/^0+(\d)/, '$1').replace(/[^\d]/g, '')
                setForm({ ...form, usageLimit: v })
              }}
              placeholder="Để trống = không giới hạn"
            />
            <p className="text-xs text-muted-foreground">
              Đếm tổng lượt dùng trên toàn hệ thống. VD nhập <b>100</b> → khi 100 khách áp mã, mã tự khóa.
            </p>
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Voucher đang kích hoạt</Label>
            </div>
          </div>

          <div className="md:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <b>Lưu ý:</b> Mỗi đơn hàng chỉ được áp <b>một</b> voucher. Nếu khách chọn voucher này, các voucher khác sẽ tự bỏ chọn ở bước checkout.
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
