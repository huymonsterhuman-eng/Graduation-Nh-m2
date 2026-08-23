import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/common/Pagination'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { usePostCategories, usePosts } from '@/hooks/api/useBlog'
import { SmartImage } from '@/components/common/SmartImage'
import { Eye } from 'lucide-react'

export function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined
  const keyword = searchParams.get('q') || ''

  const [page, setPage] = useState(0)
  const { data: categories } = usePostCategories()
  const { data, isLoading } = usePosts({ categoryId, keyword, page, size: 12 })

  const setCategoryId = (id?: number) => {
    if (id) searchParams.set('categoryId', String(id))
    else searchParams.delete('categoryId')
    setSearchParams(searchParams)
    setPage(0)
  }

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb items={[{ label: 'Tin tức' }]} />

      <h1 className="text-2xl font-bold">Tin tức & Đánh giá</h1>

      {/* Category tabs */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryId(undefined)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              !categoryId ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                categoryId === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Post grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : !data || data.content.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Chưa có bài viết nào.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.content.map((post) => (
            <Link key={post.id} to={`/tin-tuc/${post.slug}`}>
              <Card className="group overflow-hidden transition hover:shadow-md h-full">
                <div className="aspect-video overflow-hidden bg-muted">
                  <SmartImage
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    usePicsum
                    seed={`post-${post.id}`}
                    fallbackSize="600x400"
                  />
                </div>
                <CardContent className="p-4 space-y-2">
                  {post.postCategoryName && (
                    <Badge variant="secondary" className="text-xs">{post.postCategoryName}</Badge>
                  )}
                  <h3 className="line-clamp-2 font-semibold leading-tight">{post.title}</h3>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {post.views}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  )
}
