import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SmartImage } from './SmartImage'
import { ProductCard } from './ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useHomeCollections, useCollectionProductsBySlug } from '@/hooks/api/useCollections'

/**
 * Section "Bộ sưu tập nổi bật" trên HomePage.
 * Layout tabs: mỗi collection = 1 tab, chọn tab nào hiện SP tab đó.
 * Tránh dài trang khi có nhiều collection.
 */
export function CollectionsSection() {
  const { data: collections, isLoading } = useHomeCollections()
  const [activeIdx, setActiveIdx] = useState(0)

  if (isLoading) {
    return (
      <section>
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-72 w-full" />
      </section>
    )
  }

  if (!collections || collections.length === 0) return null

  const active = collections[Math.min(activeIdx, collections.length - 1)]

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Bộ sưu tập nổi bật</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          ({collections.length} bộ sưu tập)
        </span>
      </div>

      {/* Tab list — cuộn ngang khi nhiều */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {collections.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition',
              i === activeIdx
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Active collection panel */}
      <CollectionPanel key={active.slug} slug={active.slug} image={active.image}
        name={active.name} description={active.description} />
    </section>
  )
}

interface PanelProps {
  slug: string
  image?: string
  name: string
  description?: string
}

function CollectionPanel({ slug, image, name, description }: PanelProps) {
  const { data: products, isLoading } = useCollectionProductsBySlug(slug, 8)

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Cover — aspect 1:2 (portrait dài) khớp cropper admin, giảm cover-crop tối đa.
            Mobile 375×750, desktop cột 240×480 min-h. */}
        <div className="relative overflow-hidden bg-muted aspect-[1/2] md:aspect-auto md:h-full md:min-h-[480px]">
          <SmartImage
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            usePicsum
            seed={`collection-${slug}`}
            fallbackSize="480x960"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
            <div className="font-bold">{name}</div>
            {description && (
              <div className="mt-1 line-clamp-2 text-xs opacity-90">{description}</div>
            )}
            <Button
              asChild variant="secondary" size="sm"
              className="mt-3 h-7 px-3 text-xs"
            >
              <Link to={`/tim-kiem?collection=${encodeURIComponent(slug)}`}>
                Xem tất cả <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Products grid */}
        <div className="p-3">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="grid h-full min-h-[220px] place-items-center text-sm text-muted-foreground">
              Bộ sưu tập này chưa có sản phẩm.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
