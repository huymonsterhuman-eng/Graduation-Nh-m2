import { useParams } from 'react-router-dom'
import { usePostBySlug } from '@/hooks/api/useBlog'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SmartImage } from '@/components/common/SmartImage'
import { Eye, Calendar } from 'lucide-react'

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: post, isLoading } = usePostBySlug(slug)

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Không tìm thấy bài viết.
      </div>
    )
  }

  return (
    <article className="container max-w-3xl py-6">
      <Breadcrumb
        items={[
          { label: 'Tin tức', to: '/tin-tuc' },
          ...(post.postCategoryName ? [{ label: post.postCategoryName, to: `/tin-tuc?categoryId=${post.postCategoryId}` }] : []),
          { label: post.title },
        ]}
      />

      <header className="space-y-3 mb-6">
        {post.postCategoryName && <Badge variant="secondary">{post.postCategoryName}</Badge>}
        <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {post.authorName && <span>{post.authorName}</span>}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN')}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {post.views}
          </span>
        </div>
      </header>

      <SmartImage
        src={post.image}
        alt={post.title}
        className="mb-6 w-full rounded-lg object-cover aspect-video"
        usePicsum
        seed={`post-${post.id}`}
        fallbackSize="1200x600"
      />

      {post.excerpt && (
        <p className="mb-6 border-l-4 border-primary pl-4 text-base italic text-muted-foreground">
          {post.excerpt}
        </p>
      )}

      {post.content && (
        <div
          className="prose max-w-none prose-headings:font-semibold prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      )}
    </article>
  )
}
