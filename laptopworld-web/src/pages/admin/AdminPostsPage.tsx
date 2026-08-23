import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Newspaper, Plus, Pencil, Trash2, Search, Eye, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { Pagination } from '@/components/common/Pagination'
import {
  useAdminPosts, useDeletePost, useAdminPostCategories,
} from '@/hooks/api/useAdminBlog'
import type { PostListItem } from '@/types/api'
import { productImageSrc } from '@/lib/format'

export function AdminPostsPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('ALL')
  const [publishedFilter, setPublishedFilter] = useState<string>('ALL')
  const [page, setPage] = useState(0)
  const size = 20

  const publishedParam: boolean | null =
    publishedFilter === 'true' ? true : publishedFilter === 'false' ? false : null

  const { data, isLoading } = useAdminPosts({
    keyword: keyword || undefined,
    categoryId: categoryId === 'ALL' ? null : Number(categoryId),
    isPublished: publishedParam,
    page, size,
  })

  const { data: categories } = useAdminPostCategories()
  const remove = useDeletePost()

  const handleDelete = async (p: PostListItem) => {
    try {
      await remove.mutateAsync(p.id)
      toast.success('Đã xóa bài viết')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<PostListItem>[] = [
    {
      key: 'image', header: 'Ảnh', className: 'w-24',
      cell: (p) => (
        p.image ? (
          <img src={productImageSrc(p.image)} alt=""
               className="h-14 w-20 rounded border object-cover" />
        ) : (
          <div className="grid h-14 w-20 place-items-center rounded border bg-muted text-xs text-muted-foreground">
            Không ảnh
          </div>
        )
      ),
    },
    {
      key: 'title', header: 'Tiêu đề',
      cell: (p) => (
        <div className="space-y-1">
          <Link to={`/admin/bai-viet/${p.id}/sua`} className="line-clamp-2 font-medium hover:text-primary">
            {p.title}
          </Link>
          {p.excerpt && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{p.excerpt}</p>
          )}
          {p.isPublished && (
            <a
              href={`/tin-tuc/${p.slug}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Xem trên trang
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'category', header: 'Danh mục', className: 'w-40',
      cell: (p) => p.postCategoryName
        ? <Badge variant="outline">{p.postCategoryName}</Badge>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'author', header: 'Tác giả', className: 'w-32',
      cell: (p) => <span className="text-sm">{p.authorName || '—'}</span>,
    },
    {
      key: 'views', header: 'Lượt xem', align: 'center', className: 'w-24',
      cell: (p) => (
        <div className="flex items-center justify-center gap-1 text-sm">
          <Eye className="h-3 w-3 text-muted-foreground" />
          {p.views}
        </div>
      ),
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center', className: 'w-32',
      cell: (p) => (
        <div className="space-y-1">
          <Badge
            className={p.isPublished
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'}
          >
            {p.isPublished ? 'Đã xuất bản' : 'Nháp'}
          </Badge>
          {p.publishedAt && (
            <div className="text-[10px] text-muted-foreground">
              {new Date(p.publishedAt).toLocaleDateString('vi-VN')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-32',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa"
                  onClick={() => navigate(`/admin/bai-viet/${p.id}/sua`)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa bài viết?"
            description={<>Xóa <b>{p.title}</b>. Không thể hoàn tác.</>}
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
        title="Bài viết"
        icon={Newspaper}
        sprint="Sprint 9F"
        description="Quản lý bài blog. Bài chưa xuất bản chỉ admin thấy — publish để hiển thị trên trang tin tức."
        actions={
          <Button onClick={() => navigate('/admin/bai-viet/moi')}>
            <Plus className="mr-2 h-4 w-4" /> Thêm bài viết
          </Button>
        }
      />

      <AdminTable<PostListItem>
        columns={columns}
        data={data?.content}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy bài viết khớp "${keyword}"` : 'Chưa có bài viết nào'}
        toolbar={
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tiêu đề..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
                className="pl-9"
              />
            </div>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(0) }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Danh mục" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={publishedFilter} onValueChange={(v) => { setPublishedFilter(v); setPage(0) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="true">Đã xuất bản</SelectItem>
                <SelectItem value="false">Nháp</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
      )}
    </div>
  )
}
