import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useSemanticSearch } from '@/hooks/api/useSearch'
import { Card } from '@/components/ui/card'
import { SmartImage } from './SmartImage'
import { PriceTag } from './PriceTag'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_QUERY = 'laptop văn phòng nhẹ pin trâu cho sinh viên'

/**
 * Section 'Gợi ý riêng cho bạn' dùng semantic search AI.
 * Query lấy từ SP xem gần nhất trong localStorage; fallback DEFAULT_QUERY nếu chưa xem gì.
 */
export function AiRecommendSection() {
  const query = getRecentQuery() || DEFAULT_QUERY
  const { data, isLoading } = useSemanticSearch(query, 5)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Gợi ý riêng cho bạn</h2>
          <span className="text-xs text-muted-foreground hidden md:inline">— chọn bởi AI</span>
        </div>
        <Link to="/tim-kiem" className="text-sm text-primary hover:underline flex items-center gap-1">
          Tìm thêm <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Chưa có gợi ý. Hãy chat với AI để nhận tư vấn cá nhân hoá.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.slice(0, 5).map((r) => {
            const p = r.product
            return (
              <Link key={p.id} to={`/san-pham/${p.slug}`}>
                <Card className="h-full overflow-hidden transition hover:shadow-md">
                  <div className="relative aspect-square bg-muted">
                    <SmartImage
                      src={p.primaryImage}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      usePicsum
                      seed={`p-${p.id}`}
                    />
                    <span className="absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur">
                      {(r.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <div className="p-2 space-y-1">
                    <h4 className="line-clamp-2 h-8 text-xs font-medium leading-4">{p.name}</h4>
                    <PriceTag price={p.price} salePrice={p.salePrice} size="sm" showDiscount={false} />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Lấy query từ SP xem gần nhất trong localStorage (do ProductDetailPage lưu). */
function getRecentQuery(): string | null {
  try {
    const raw = localStorage.getItem('lw_last_product')
    if (!raw) return null
    const p = JSON.parse(raw)
    return typeof p?.name === 'string' ? p.name : null
  } catch {
    return null
  }
}
