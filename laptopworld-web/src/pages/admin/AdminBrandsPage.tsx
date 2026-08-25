import { useState } from 'react'
import { Tags, Plus, Pencil, Trash2, Search, Package, Lock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import { productImageSrc } from '@/lib/format'
import {
  useAdminBrands, useCreateBrand, useUpdateBrand, useDeleteBrand,
  type BrandInput,
} from '@/hooks/api/useAdminCatalog'
import type { Brand } from '@/types/api'

type FormState = BrandInput

function emptyForm(): FormState {
  return { name: '', slug: '', logo: null, description: '', isActive: true }
}

export function AdminBrandsPage() {
  const { data, isLoading } = useAdminBrands()
  const create = useCreateBrand()
  const update = useUpdateBrand()
  const remove = useDeleteBrand()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [keyword, setKeyword] = useState('')

  const filtered = (data ?? []).filter((b) =>
    !keyword || b.name.toLowerCase().includes(keyword.toLowerCase()) ||
    b.slug.toLowerCase().includes(keyword.toLowerCase())
  )

  const editingHasProducts = (editing?.productCount ?? 0) > 0

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (b: Brand) => {
    setEditing(b)
    setForm({
      name: b.name,
      slug: b.slug,
      logo: b.logo ?? null,
      description: b.description ?? '',
      isActive: b.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error('Vui lòng nhập tên thương hiệu')
      return
    }
    try {
      if (editing) {
        // FE guard: chặn đổi slug khi còn SP (khớp với BE SLUG_LOCKED_HAS_PRODUCTS)
        const payload = editingHasProducts
          ? { ...form, slug: editing.slug }
          : form
        await update.mutateAsync({ id: editing.id, body: payload })
        toast.success('Đã cập nhật thương hiệu')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã thêm thương hiệu')
      }
      setDialogOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDelete = async (b: Brand) => {
    try {
      await remove.mutateAsync(b.id)
      toast.success('Đã xóa thương hiệu')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const columns: AdminColumn<Brand>[] = [
    {
      key: 'logo', header: 'Logo', className: 'w-20', align: 'center',
      cell: (b) => (
        <img
          src={productImageSrc(b.logo)}
          alt={b.name}
          className="mx-auto h-10 w-10 rounded border object-contain bg-white"
        />
      ),
    },
    {
      key: 'name', header: 'Tên',
      cell: (b) => (
        <div>
          <div className="font-medium">{b.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{b.slug}</div>
        </div>
      ),
    },
    {
      key: 'desc', header: 'Mô tả', className: 'max-w-md',
      cell: (b) => <span className="line-clamp-2 text-sm text-muted-foreground">{b.description || '—'}</span>,
    },
    {
      key: 'productCount', header: 'Sản phẩm', align: 'center', className: 'w-28',
      cell: (b) => {
        const count = b.productCount ?? 0
        return count > 0 ? (
          <Badge variant="secondary" className="gap-1 font-mono">
            <Package className="h-3 w-3" />
            {count}
          </Badge>
        ) : (
          <Badge variant="outline" className="font-mono text-muted-foreground">0</Badge>
        )
      },
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center',
      cell: (b) => (
        <Badge variant={b.isActive ? 'default' : 'secondary'}>
          {b.isActive ? 'Hoạt động' : 'Ẩn'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-32',
      cell: (b) => {
        const count = b.productCount ?? 0
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Sửa">
              <Pencil className="h-4 w-4" />
            </Button>
            {count > 0 ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button variant="ghost" size="icon" disabled title="Không thể xóa">
                        <Trash2 className="h-4 w-4 text-muted-foreground/40" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Còn <b>{count}</b> sản phẩm — chuyển SP sang brand khác trước
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" title="Xóa">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Xóa thương hiệu?"
                description={<>Hành động này sẽ xóa <b>{b.name}</b>. Thương hiệu chưa có sản phẩm nào nên có thể xóa an toàn.</>}
                confirmLabel="Xóa"
                onConfirm={() => handleDelete(b)}
              />
            )}
          </div>
        )
      },
    },
  ]

  const showIsActiveWarning = editing && editingHasProducts && form.isActive === false

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Thương hiệu"
        icon={Tags}
        sprint="Sprint 9C"
        description="Danh sách brand các hãng — hiển thị trên user site và dùng để gán vào sản phẩm."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm thương hiệu
          </Button>
        }
      />

      <AdminTable<Brand>
        columns={columns}
        data={filtered}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy brand khớp "${keyword}"` : 'Chưa có thương hiệu nào'}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc slug..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Sửa thương hiệu: ${editing.name}` : 'Thêm thương hiệu'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tên thương hiệu *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="flex items-center gap-1.5">
              Slug (để trống sẽ tự sinh)
              {editingHasProducts && <Lock className="h-3.5 w-3.5 text-amber-600" />}
            </Label>
            <Input
              id="slug"
              value={form.slug ?? ''}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="apple"
              className="font-mono"
              disabled={editingHasProducts}
            />
            {editingHasProducts && (
              <p className="text-xs text-amber-600">
                Đã có {editing?.productCount} sản phẩm — không cho đổi slug để tránh gãy URL cũ.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Mô tả</Label>
          <textarea
            id="desc"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <MediaUploader
          label="Logo"
          folder="brands"
          value={form.logo}
          onChange={(path) => setForm({ ...form, logo: path })}
        />
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
          <Switch
            id="isActive"
            checked={form.isActive ?? true}
            onCheckedChange={(v) => setForm({ ...form, isActive: v })}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Hoạt động — hiển thị trên user site
          </Label>
        </div>
        {showIsActiveWarning && (
          <div className="flex gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Ẩn thương hiệu này sẽ khiến khách <b>không lọc được {editing?.productCount} sản phẩm</b> theo brand.
              Sản phẩm vẫn hiển thị trong danh mục nhưng bộ lọc thương hiệu sẽ mất — cân nhắc ẩn từng SP thay vì ẩn cả brand.
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
