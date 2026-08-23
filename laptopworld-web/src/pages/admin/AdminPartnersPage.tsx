import { useState, useMemo } from 'react'
import { Handshake, Plus, Pencil, Trash2, Search, Mail, Phone } from 'lucide-react'
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
  usePartners, useCreatePartner, useUpdatePartner, useDeletePartner,
  type PartnerInput,
} from '@/hooks/api/useAdminInventory'
import type { Partner, PartnerType } from '@/types/api'

const TYPE_LABEL: Record<PartnerType, { label: string; className: string }> = {
  supplier:          { label: 'Nhà cung cấp',       className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  shipping_provider: { label: 'Đơn vị vận chuyển',  className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
}

function emptyForm(): PartnerInput {
  return { name: '', code: '', type: 'supplier', phone: '', email: '', address: '', isActive: true }
}

export function AdminPartnersPage() {
  const { data, isLoading } = usePartners()
  const create = useCreatePartner()
  const update = useUpdatePartner()
  const remove = useDeletePartner()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState<PartnerInput>(emptyForm())
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((p) => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
      if (keyword && !p.name.toLowerCase().includes(keyword.toLowerCase())) return false
      return true
    })
  }, [data, keyword, typeFilter])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true) }
  const openEdit = (p: Partner) => {
    setEditing(p)
    setForm({
      name: p.name, code: p.code, type: p.type, phone: p.phone ?? '',
      email: p.email ?? '', address: p.address ?? '', isActive: p.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) { toast.error('Vui lòng nhập tên đối tác'); return }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật đối tác')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã thêm đối tác')
      }
      setDialogOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (p: Partner) => {
    try {
      await remove.mutateAsync(p.id)
      toast.success('Đã xóa đối tác')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<Partner>[] = [
    {
      key: 'code', header: 'Mã', className: 'w-24',
      cell: (p) => (
        <Badge variant="outline" className="font-mono">{p.code}</Badge>
      ),
    },
    {
      key: 'name', header: 'Tên',
      cell: (p) => <div className="font-medium">{p.name}</div>,
    },
    {
      key: 'type', header: 'Loại',
      cell: (p) => {
        const t = TYPE_LABEL[p.type]
        return <Badge className={t.className}>{t.label}</Badge>
      },
    },
    {
      key: 'contact', header: 'Liên hệ',
      cell: (p) => (
        <div className="space-y-0.5 text-sm">
          {p.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</div>}
          {p.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {p.email}</div>}
          {!p.phone && !p.email && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: 'address', header: 'Địa chỉ', className: 'max-w-xs',
      cell: (p) => <span className="line-clamp-2 text-sm text-muted-foreground">{p.address || '—'}</span>,
    },
    {
      key: 'active', header: 'Trạng thái', align: 'center',
      cell: (p) => (
        <Badge variant={p.isActive ? 'default' : 'secondary'}>
          {p.isActive ? 'Hoạt động' : 'Ngừng'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-32',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa đối tác?"
            description={<>Xóa <b>{p.name}</b>. Nếu đối tác đã có phiếu nhập/đơn giao, thao tác có thể bị chặn.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(p)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Đối tác"
        icon={Handshake}
        sprint="Sprint 9E"
        description="Nhà cung cấp (dùng cho phiếu nhập) và đơn vị vận chuyển (gán cho đơn hàng)."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm đối tác
          </Button>
        }
      />

      <AdminTable<Partner>
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy đối tác khớp "${keyword}"` : 'Chưa có đối tác nào'}
        toolbar={
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Loại" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                <SelectItem value="supplier">Nhà cung cấp</SelectItem>
                <SelectItem value="shipping_provider">Đơn vị vận chuyển</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Sửa đối tác: ${editing.name}` : 'Thêm đối tác'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tên đối tác *</Label>
            <Input id="name" value={form.name} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Loại *</Label>
            <Select value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as PartnerType })}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Nhà cung cấp</SelectItem>
                <SelectItem value="shipping_provider">Đơn vị vận chuyển</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="code">
              Mã đối tác {form.type === 'shipping_provider' && '(dùng làm prefix tracking number)'}
            </Label>
            <Input id="code" className="font-mono uppercase" maxLength={10}
              placeholder="Để trống sẽ tự sinh từ tên (VD: GHN)"
              value={form.code ?? ''}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <p className="text-xs text-muted-foreground">
              2-5 ký tự in hoa. VD: "Giao Hàng Nhanh" → auto sinh <b>GHN</b>. Sẽ dùng để sinh mã vận đơn khi kho bàn giao.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Địa chỉ</Label>
          <textarea id="address" rows={2} value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
          <Switch id="isActive" checked={form.isActive ?? true}
            onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <Label htmlFor="isActive" className="cursor-pointer">Đối tác đang hoạt động</Label>
        </div>
      </FormDialog>
    </div>
  )
}
