import { useState, useMemo } from 'react'
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import {
  useAdminPostCategories, useCreatePostCategory, useUpdatePostCategory, useDeletePostCategory,
  type PostCategoryInput,
} from '@/hooks/api/useAdminBlog'
import type { PostCategory } from '@/types/api'

function emptyForm(): PostCategoryInput {
  return { name: '', slug: '', description: '' }
}

export function AdminPostCategoriesPage() {
  const { data, isLoading } = useAdminPostCategories()
  const create = useCreatePostCategory()
  const update = useUpdatePostCategory()
  const remove = useDeletePostCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PostCategory | null>(null)
  const [form, setForm] = useState<PostCategoryInput>(emptyForm())
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    const kw = keyword.trim().toLowerCase()
    return kw ? data.filter((c) => c.name.toLowerCase().includes(kw)) : data
  }, [data, keyword])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true) }
  const openEdit = (c: PostCategory) => {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '' })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên danh mục'); return }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật danh mục')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã tạo danh mục mới')
      }
      setDialogOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (c: PostCategory) => {
    try {
      await remove.mutateAsync(c.id)
      toast.success('Đã xóa danh mục')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<PostCategory>[] = [
    {
      key: 'name', header: 'Tên danh mục',
      cell: (c) => <div className="font-medium">{c.name}</div>,
    },
    {
      key: 'slug', header: 'Slug',
      cell: (c) => <Badge variant="outline" className="font-mono">{c.slug}</Badge>,
    },
    {
      key: 'description', header: 'Mô tả',
      cell: (c) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {c.description || '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-32',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa danh mục bài viết?"
            description={
              <>Xóa <b>{c.name}</b>. Chỉ xóa được nếu chưa có bài viết nào thuộc danh mục này.</>
            }
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
        title="Danh mục bài viết"
        icon={FolderTree}
        sprint="Sprint 9F"
        description="Phân loại các bài viết trong blog. Chỉ có thể xóa danh mục khi chưa có bài viết nào dùng."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm danh mục
          </Button>
        }
      />

      <AdminTable<PostCategory>
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy danh mục khớp "${keyword}"` : 'Chưa có danh mục nào'}
        toolbar={
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên..."
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
        title={editing ? `Sửa danh mục: ${editing.name}` : 'Thêm danh mục bài viết'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Tên danh mục *</Label>
          <Input
            id="name" autoFocus value={form.name} maxLength={150}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Tin công nghệ"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug" value={form.slug ?? ''} maxLength={160}
            className="font-mono"
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="Bỏ trống để tự sinh từ tên"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <textarea
            id="description" rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Mô tả ngắn về danh mục..."
          />
        </div>
      </FormDialog>
    </div>
  )
}
