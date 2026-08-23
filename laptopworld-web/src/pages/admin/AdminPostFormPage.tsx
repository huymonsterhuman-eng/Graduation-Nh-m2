import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, FileText, Image as ImageIcon, Tag, Settings,
} from 'lucide-react'
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
import { AdminSection } from '@/components/admin/common/AdminSection'
import { TipTapEditor } from '@/components/admin/common/TipTapEditor'
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import {
  useAdminPostDetail, useCreatePost, useUpdatePost, useAdminPostCategories,
  type PostInput,
} from '@/hooks/api/useAdminBlog'

interface FormState {
  title: string
  slug: string
  postCategoryId: number | null
  image: string
  excerpt: string
  content: string
  isPublished: boolean
}

function emptyForm(): FormState {
  return {
    title: '', slug: '', postCategoryId: null,
    image: '', excerpt: '', content: '', isPublished: false,
  }
}

export function AdminPostFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const postId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const { data: detail, isLoading } = useAdminPostDetail(postId)
  const { data: categories } = useAdminPostCategories()
  const create = useCreatePost()
  const update = useUpdatePost()

  const [form, setForm] = useState<FormState>(emptyForm())

  useEffect(() => {
    if (!detail) return
    setForm({
      title: detail.title,
      slug: detail.slug,
      postCategoryId: detail.postCategoryId ?? null,
      image: detail.image ?? '',
      excerpt: detail.excerpt ?? '',
      content: detail.content ?? '',
      isPublished: detail.isPublished,
    })
  }, [detail])

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề bài viết'); return }
    if (form.excerpt && form.excerpt.length > 1000) {
      toast.error('Mô tả ngắn tối đa 1000 ký tự'); return
    }

    const payload: PostInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      postCategoryId: form.postCategoryId,
      image: form.image || null,
      excerpt: form.excerpt || undefined,
      content: form.content || undefined,
      isPublished: form.isPublished,
    }

    try {
      if (isEdit && postId) {
        await update.mutateAsync({ id: postId, body: payload })
        toast.success('Đã cập nhật bài viết')
      } else {
        const created = await create.mutateAsync(payload)
        toast.success('Đã tạo bài viết mới')
        if (created?.id) navigate(`/admin/bai-viet/${created.id}/sua`, { replace: true })
      }
    } catch (e) { toast.error((e as Error).message) }
  }

  if (isEdit && isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <Link to="/admin/bai-viet">
              <Button variant="ghost" size="icon" title="Quay lại danh sách">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            {isEdit ? 'Sửa bài viết' : 'Tạo bài viết mới'}
          </span>
        }
        sprint="Sprint 9F"
        description={isEdit && detail
          ? <>Đang sửa: <b>{detail.title}</b> — Lượt xem: {detail.views}</>
          : 'Nội dung bài blog. Có thể lưu nháp và xuất bản sau.'}
        actions={
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
              : <><Save className="mr-2 h-4 w-4" /> Lưu bài viết</>}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main content */}
        <div className="space-y-4">
          <AdminSection title="Nội dung chính" icon={FileText}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title" autoFocus maxLength={255}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Top 5 laptop gaming đáng mua nhất 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug" className="font-mono text-sm" maxLength={280}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="Bỏ trống để tự sinh từ tiêu đề"
                />
                {form.slug && (
                  <p className="text-xs text-muted-foreground">
                    URL: <code className="text-primary">/tin-tuc/{form.slug}</code>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Mô tả ngắn</Label>
                <textarea
                  id="excerpt" rows={3} maxLength={1000}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Đoạn giới thiệu ngắn hiển thị ngoài trang danh sách..."
                />
                <p className="text-xs text-muted-foreground">
                  {form.excerpt.length}/1000 ký tự
                </p>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Nội dung bài viết" icon={FileText}
                        description="Rich text — hỗ trợ heading, danh sách, link, in đậm/nghiêng.">
            <TipTapEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Viết nội dung bài blog..."
              minHeight={400}
            />
          </AdminSection>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <AdminSection title="Xuất bản" icon={Settings}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                <Switch
                  id="isPublished"
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                />
                <Label htmlFor="isPublished" className="cursor-pointer">
                  {form.isPublished ? 'Đang xuất bản' : 'Lưu nháp'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Bài nháp chỉ admin thấy. Khi xuất bản lần đầu, hệ thống tự đặt thời gian xuất bản
                = thời điểm hiện tại.
              </p>
              {isEdit && detail?.publishedAt && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs">
                  <div className="text-muted-foreground">Đã xuất bản lúc:</div>
                  <div className="font-medium">
                    {new Date(detail.publishedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              )}
            </div>
          </AdminSection>

          <AdminSection title="Danh mục" icon={Tag}>
            <div className="space-y-2">
              <Select
                value={form.postCategoryId == null ? 'NONE' : String(form.postCategoryId)}
                onValueChange={(v) => setForm({
                  ...form,
                  postCategoryId: v === 'NONE' ? null : Number(v),
                })}
              >
                <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Không danh mục —</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!categories || categories.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Chưa có danh mục nào. <Link to="/admin/danh-muc-bai" className="text-primary hover:underline">Tạo danh mục</Link>
                </p>
              )}
            </div>
          </AdminSection>

          <AdminSection title="Ảnh đại diện" icon={ImageIcon}
                        description="Hiển thị ngoài trang danh sách và ở đầu bài viết.">
            <MediaUploader
              value={form.image || null}
              onChange={(path) => setForm({ ...form, image: path ?? '' })}
              folder="posts"
              label=""
              maxSizeMB={5}
            />
          </AdminSection>

          {isEdit && detail && (
            <AdminSection title="Thông tin" icon={Settings} compact>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tác giả:</span>
                  <span className="font-medium">{detail.authorName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lượt xem:</span>
                  <Badge variant="outline" className="font-mono">{detail.views}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạo lúc:</span>
                  <span>{new Date(detail.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </AdminSection>
          )}
        </div>
      </div>
    </div>
  )
}
