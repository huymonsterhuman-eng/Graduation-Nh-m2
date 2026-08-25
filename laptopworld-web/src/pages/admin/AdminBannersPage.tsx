import { useState, useMemo } from 'react'
import { Images, Plus, Pencil, Trash2, Search, ExternalLink, Crop as CropIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import { ImageCropperDialog } from '@/components/admin/common/ImageCropperDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useAdminBanners, useCreateBanner, useUpdateBanner, useDeleteBanner,
  type BannerInput,
} from '@/hooks/api/useBanners'
import { BANNER_POSITIONS, type Banner } from '@/types/api'
import { productImageSrc } from '@/lib/format'

function emptyForm(): BannerInput {
  return { title: '', image: '', link: '', sortOrder: 0, isActive: true, position: 'hero_carousel' }
}

function positionLabel(value?: string | null): string {
  if (!value) return 'Carousel chính (đầu trang)'
  return BANNER_POSITIONS.find((p) => p.value === value)?.label ?? value
}

function positionBadgeClass(value?: string | null): string {
  switch (value) {
    case 'sidebar_phone':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    case 'sidebar_laptop':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-primary/15 text-primary'
  }
}

/** Tỷ lệ crop khuyến nghị theo slot (width / height). */
function aspectForPosition(position?: string | null): number {
  switch (position) {
    case 'sidebar_phone':
    case 'sidebar_laptop':
      // Khung sidebar stretch cao bằng grid SP 2 hàng → rất dọc.
      // 1:3 khớp thực tế ~240×720px trên desktop.
      return 1 / 3
    case 'hero_carousel':
    default:
      return 16 / 9     // khung ngang carousel
  }
}

function aspectLabel(position?: string | null): string {
  const a = aspectForPosition(position)
  if (Math.abs(a - 1 / 3) < 0.01) return '1:3 (dọc dài, khớp sidebar)'
  if (Math.abs(a - 16 / 9) < 0.01) return '16:9 (ngang)'
  return a.toFixed(2)
}

export function AdminBannersPage() {
  const { data, isLoading } = useAdminBanners()
  const create = useCreateBanner()
  const update = useUpdateBanner()
  const remove = useDeleteBanner()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerInput>(emptyForm())
  const [keyword, setKeyword] = useState('')

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('')

  const filtered = useMemo(() => {
    if (!data) return []
    const kw = keyword.trim().toLowerCase()
    const list = kw
      ? data.filter((b) => (b.title ?? '').toLowerCase().includes(kw))
      : data
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [data, keyword])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      title: b.title ?? '',
      image: b.image,
      link: b.link ?? '',
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      position: b.position ?? 'hero_carousel',
    })
    setDialogOpen(true)
  }

  const openCropper = (imagePath: string) => {
    if (!imagePath) return
    setCropperImageSrc(productImageSrc(imagePath))
    setCropperOpen(true)
  }

  const handleImageUploaded = (path: string | null) => {
    setForm({ ...form, image: path ?? '' })
    // Auto mở cropper ngay sau khi upload lần đầu — để admin cắt vừa khung.
    if (path) {
      // Delay chút cho state kịp update
      setTimeout(() => openCropper(path), 100)
    }
  }

  const handleSubmit = async () => {
    if (!form.image) {
      toast.error('Vui lòng tải ảnh banner lên')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật banner')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã tạo banner mới')
      }
      setDialogOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDelete = async (b: Banner) => {
    try {
      await remove.mutateAsync(b.id)
      toast.success('Đã xóa banner')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const columns: AdminColumn<Banner>[] = [
    {
      key: 'sortOrder', header: 'Thứ tự', align: 'center', className: 'w-20',
      cell: (b) => (
        <Badge variant="outline" className="font-mono text-base">
          {b.sortOrder}
        </Badge>
      ),
    },
    {
      key: 'image', header: 'Ảnh', className: 'w-40',
      cell: (b) => (
        <img
          src={productImageSrc(b.image)}
          alt={b.title ?? ''}
          className="h-16 w-32 rounded border object-cover"
        />
      ),
    },
    {
      key: 'title', header: 'Tiêu đề',
      cell: (b) => (
        <div className="space-y-1">
          <div className="font-medium">{b.title || <span className="text-muted-foreground italic">(không có)</span>}</div>
          {b.link && (
            <a
              href={b.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {b.link.length > 50 ? b.link.slice(0, 50) + '…' : b.link}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'position', header: 'Vị trí', align: 'center', className: 'w-48',
      cell: (b) => (
        <Badge className={positionBadgeClass(b.position)}>
          {positionLabel(b.position)}
        </Badge>
      ),
    },
    {
      key: 'active', header: 'Trạng thái', align: 'center', className: 'w-32',
      cell: (b) => (
        <Badge
          className={b.isActive
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'}
        >
          {b.isActive ? 'Hiển thị' : 'Ẩn'}
        </Badge>
      ),
    },
    {
      key: 'dates', header: 'Ngày tạo / cập nhật', className: 'w-40',
      cell: (b) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div>Tạo: {new Date(b.createdAt).toLocaleDateString('vi-VN')}</div>
          {b.updatedAt && b.updatedAt !== b.createdAt && (
            <div>Sửa: {new Date(b.updatedAt).toLocaleDateString('vi-VN')}</div>
          )}
          {b.authorName && <div>Bởi: {b.authorName}</div>}
        </div>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-44',
      cell: (b) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa
              </Button>
            }
            title="Xóa banner?"
            description={<>Xóa banner <b>{b.title || `#${b.id}`}</b>. Hành động không thể hoàn tác.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(b)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Banner trang chủ"
        icon={Images}
        sprint="Sprint 9F"
        description="Ảnh banner carousel trên trang chủ user site. Sắp xếp theo STT tăng dần, chỉ banner đang hiển thị mới xuất hiện."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm banner
          </Button>
        }
      />

      <AdminTable<Banner>
        columns={columns}
        data={filtered}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy banner khớp "${keyword}"` : 'Chưa có banner nào'}
        toolbar={
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tiêu đề..."
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
        title={editing ? `Sửa banner: ${editing.title || `#${editing.id}`}` : 'Thêm banner mới'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="space-y-2">
          <MediaUploader
            value={form.image || null}
            onChange={handleImageUploaded}
            folder="banners"
            label="Ảnh banner *"
            maxSizeMB={5}
          />
          {form.image && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2.5">
              <CropIcon className="h-4 w-4 text-primary" />
              <span className="flex-1 text-xs text-muted-foreground">
                Tỷ lệ khung slot này là <b>{aspectLabel(form.position)}</b>.
                Cắt ảnh để phần quan trọng nằm gọn trong khung.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openCropper(form.image)}
              >
                <CropIcon className="mr-1.5 h-3.5 w-3.5" />
                {form.image ? 'Cắt lại ảnh' : 'Cắt ảnh'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input
              id="title"
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Flash Sale cuối tuần"
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              Chỉ dùng để phân biệt trong trang admin, không hiển thị trên user site.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="link">Liên kết khi click</Label>
            <Input
              id="link"
              value={form.link ?? ''}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/danh-muc/laptop hoặc https://..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn nội bộ (bắt đầu bằng <code>/</code>) hoặc URL ngoài. Bỏ trống nếu chỉ là ảnh trang trí.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="position">Vị trí hiển thị *</Label>
            <Select
              value={form.position ?? 'hero_carousel'}
              onValueChange={(v) => setForm({ ...form, position: v })}
            >
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANNER_POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <b>Carousel chính (16:9):</b> nhiều banner được hiển thị theo thứ tự.
              <b> Sidebar Điện thoại / Laptop (1:3, dọc dài):</b> mỗi khu chỉ hiện 1 banner —
              nếu có nhiều banner cùng slot, banner có STT nhỏ nhất được chọn.
              Chọn ảnh gốc dọc/dài để crop không mất nhiều nội dung.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
            <Input
              id="sortOrder"
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-muted-foreground">Số nhỏ hiển thị trước.</p>
          </div>

          <div className="flex items-end">
            <div className="flex w-full items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Switch
                id="isActive"
                checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Đang hiển thị trên trang chủ
              </Label>
            </div>
          </div>
        </div>
      </FormDialog>

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        aspect={aspectForPosition(form.position)}
        folder="banners"
        onSaved={(newPath) => setForm((f) => ({ ...f, image: newPath }))}
      />
    </div>
  )
}
