import { useState, useMemo } from 'react'
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react'
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
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import { SpecTemplateEditor } from '@/components/admin/common/SpecTemplateEditor'
import { productImageSrc } from '@/lib/format'
import {
  useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  type CategoryInput,
} from '@/hooks/api/useAdminCatalog'
import type { Category, SpecField } from '@/types/api'

interface FormState extends Omit<CategoryInput, 'specTemplate'> {
  specTemplate: SpecField[]
}

function emptyForm(): FormState {
  return {
    name: '', slug: '', parentId: null, description: '',
    image: null, specTemplate: [],
    isActive: true, sortOrder: 0,
  }
}

export function AdminCategoriesPage() {
  const { data, isLoading } = useAdminCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    if (!keyword) return data
    const kw = keyword.toLowerCase()
    return data.filter((c) =>
      c.name.toLowerCase().includes(kw) || c.slug.toLowerCase().includes(kw)
    )
  }, [data, keyword])

  const parentOptions = useMemo(
    () => (data ?? []).filter((c) => c.parentId == null),
    [data]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null,
      description: c.description ?? '',
      image: c.image ?? null,
      specTemplate: c.specTemplate ?? [],
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error('Vui lòng nhập tên danh mục')
      return
    }
    // Validate spec template: mỗi field phải có key + label
    for (let i = 0; i < form.specTemplate.length; i++) {
      const f = form.specTemplate[i]
      if (!f.key?.trim() || !f.label?.trim()) {
        toast.error(`Field #${i + 1} thiếu key hoặc nhãn hiển thị`)
        return
      }
    }
    const body: CategoryInput = {
      name: form.name,
      slug: form.slug,
      parentId: form.parentId ?? null,
      description: form.description,
      image: form.image,
      specTemplate: form.specTemplate.length > 0 ? form.specTemplate : null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body })
        toast.success('Đã cập nhật danh mục')
      } else {
        await create.mutateAsync(body)
        toast.success('Đã thêm danh mục')
      }
      setDialogOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDelete = async (c: Category) => {
    try {
      await remove.mutateAsync(c.id)
      toast.success('Đã xóa danh mục')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const columns: AdminColumn<Category>[] = [
    {
      key: 'image', header: '', className: 'w-14',
      cell: (c) => c.image ? (
        <img src={productImageSrc(c.image)} alt={c.name} className="h-10 w-10 rounded border object-cover" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded border text-lg">📁</div>
      ),
    },
    {
      key: 'name', header: 'Tên',
      cell: (c) => (
        <div>
          <div className="font-medium">
            {c.parentId && <span className="text-muted-foreground">↳ </span>}
            {c.name}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{c.slug}</div>
        </div>
      ),
    },
    {
      key: 'parent', header: 'Cha',
      cell: (c) => c.parentName ? (
        <span className="text-sm">{c.parentName}</span>
      ) : (
        <span className="text-xs text-muted-foreground">— (gốc)</span>
      ),
    },
    {
      key: 'specs', header: 'Spec', align: 'center',
      cell: (c) => (
        <Badge variant="outline" className="text-xs">
          {c.specTemplate?.length ?? 0} field
        </Badge>
      ),
    },
    {
      key: 'sort', header: 'Sort', align: 'center', className: 'w-16',
      cell: (c) => <span className="font-mono text-xs">{c.sortOrder}</span>,
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center',
      cell: (c) => (
        <Badge variant={c.isActive ? 'default' : 'secondary'}>
          {c.isActive ? 'Hoạt động' : 'Ẩn'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-32',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa danh mục?"
            description={<>Xóa <b>{c.name}</b>. Nếu còn danh mục con hoặc sản phẩm gắn với, thao tác sẽ thất bại.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(c)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Danh mục"
        icon={FolderTree}
        sprint="Sprint 9C"
        description="Cây danh mục 2 cấp (cha - con). Mỗi danh mục có spec template — định nghĩa các thông số kỹ thuật chuẩn cho sản phẩm thuộc nhóm."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm danh mục
          </Button>
        }
      />

      <AdminTable<Category>
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy danh mục khớp "${keyword}"` : 'Chưa có danh mục nào'}
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
        title={editing ? `Sửa danh mục: ${editing.name}` : 'Thêm danh mục'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tên danh mục *</Label>
            <Input
              id="name" value={form.name} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (để trống sẽ tự sinh)</Label>
            <Input
              id="slug" className="font-mono" placeholder="dien-thoai"
              value={form.slug ?? ''}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parent">Danh mục cha</Label>
            <Select
              value={form.parentId == null ? 'ROOT' : String(form.parentId)}
              onValueChange={(v) => setForm({
                ...form,
                parentId: v === 'ROOT' ? null : Number(v),
              })}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="— (danh mục gốc)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROOT">— (danh mục gốc)</SelectItem>
                {parentOptions
                  .filter((p) => p.id !== editing?.id)
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Thứ tự (sortOrder)</Label>
            <Input
              id="sortOrder" type="number" min={0}
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Mô tả</Label>
          <textarea
            id="desc" rows={2}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <MediaUploader
          label="Ảnh danh mục"
          folder="categories"
          value={form.image}
          onChange={(path) => setForm({ ...form, image: path })}
        />

        <div className="space-y-2">
          <Label>Thông số kỹ thuật (spec template)</Label>
          <SpecTemplateEditor
            value={form.specTemplate}
            onChange={(v) => setForm({ ...form, specTemplate: v })}
          />
        </div>

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
      </FormDialog>
    </div>
  )
}
