import { Link, useSearchParams } from 'react-router-dom'
import { useSemanticSearch } from '@/hooks/api/useSearch'
import { useProducts } from '@/hooks/api/useProducts'
import { Card } from '@/components/ui/card'
import { PriceTag } from '@/components/common/PriceTag'
import { SmartImage } from '@/components/common/SmartImage'
import { ProductGrid } from '@/components/common/ProductGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles } from 'lucide-react'

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') || ''

  const { data: semanticResults, isLoading: semanticLoading, isError: semanticError } = useSemanticSearch(query, 10)
  // Fallback text search — luôn chạy song song
  const { data: textResults, isLoading: textLoading } = useProducts({ keyword: query, size: 20 })

  return (
    <div className="container py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Kết quả tìm kiếm cho: <span className="text-primary">"{query}"</span>
        </h1>
      </div>

      {/* Semantic — điểm nhấn AI */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Gợi ý bởi AI</h2>
          <span className="text-xs text-muted-foreground">(semantic search dùng embedding vector)</span>
        </div>

        {semanticLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : semanticError ? (
          <p className="text-sm text-muted-foreground">Semantic search tạm thời không khả dụng.</p>
        ) : semanticResults && semanticResults.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {semanticResults.map((r) => {
              const p = r.product
              return (
                <Link key={p.id} to={`/san-pham/${p.slug}`}>
                  <Card className="flex gap-3 p-3 transition hover:shadow-sm">
                    <SmartImage
                      src={p.primaryImage}
                      alt={p.name}
                      className="h-20 w-20 rounded object-cover"
                      usePicsum
                      seed={`p-${p.id}`}
                      fallbackSize="200x200"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="line-clamp-2 text-sm font-medium">{p.name}</h3>
                      <PriceTag price={p.price} salePrice={p.salePrice} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        Độ tương đồng: {(r.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">AI chưa tìm được sản phẩm nào phù hợp.</p>
        )}
      </section>

      {/* Text search — fallback */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Tất cả kết quả</h2>
        <ProductGrid
          products={textResults?.content}
          loading={textLoading}
          emptyMessage="Không tìm thấy sản phẩm nào khớp từ khóa."
        />
      </section>
    </div>
  )
}
