import type { ProductListItem } from '@/types/api'
import { ProductCard } from './ProductCard'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  products?: ProductListItem[]
  loading?: boolean
  skeletonCount?: number
  emptyMessage?: string
}

export function ProductGrid({ products, loading, skeletonCount = 8, emptyMessage = 'Chưa có sản phẩm' }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (!products || products.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
