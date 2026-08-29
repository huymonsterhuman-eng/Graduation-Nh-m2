import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useRelatedProducts, useProducts } from '@/hooks/api/useProducts'
import { Card, CardContent } from '@/components/ui/card'
import { SmartImage } from './SmartImage'
import { PriceTag } from './PriceTag'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Section 'Có thể bạn quan tâm' trên HomePage.
 *
 * Logic (SQL thuần — không gọi Gemini để tiết kiệm token):
 * - Nếu user đã xem SP gần nhất (lưu trong localStorage.lw_last_product):
 *   → gọi /related của SP đó → cùng category + bracket giá ±30%.
 * - Nếu chưa xem SP nào:
 *   → fallback SP hot toàn shop (sort views desc).
 *
 * Trước đây (Sprint 5) dùng useSemanticSearch → mỗi pageload/user tốn 1 embed call
 * cho câu query = tên SP đã xem. Tokenology: 300 user × 5 pageview = 1500 embed/day.
 * Sau Phase 2: 0 token, đủ giá trị vì related đã có bracket giá (Phase 1).
 */
export function AiRecommendSection() {
  const lastId = getRecentProductId()

  const { data: related, isLoading: relatedLoading } = useRelatedProducts(lastId ?? undefined, 5)

  // Fallback: chưa xem SP nào → SP hot toàn shop
  const hotEnabled = lastId == null
  const { data: hotPage, isLoading: hotLoading } = useProducts(
    hotEnabled ? { size: 5, sort: 'views,desc' } : {}
  )
  const hot = hotEnabled ? hotPage?.content ?? [] : []

  const items = lastId != null ? related ?? [] : hot
  const isLoading = lastId != null ? relatedLoading : hotLoading

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Có thể bạn quan tâm</h2>
          <span className="text-xs text-muted-foreground hidden md:inline">
            {lastId != null ? '— dựa trên sản phẩm bạn vừa xem' : '— sản phẩm nổi bật'}
          </span>
        </div>
        <Link to="/tim-kiem" className="text-sm text-primary hover:underline flex items-center gap-1">
          Xem thêm <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Chưa có gợi ý. Hãy khám phá các danh mục để chúng tôi hiểu bạn hơn.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.slice(0, 5).map((p) => (
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
                </div>
                <CardContent className="p-2 space-y-1">
                  {p.brandName && (
                    <div className="text-[10px] text-muted-foreground">{p.brandName}</div>
                  )}
                  <h4 className="line-clamp-2 h-8 text-xs font-medium leading-4">{p.name}</h4>
                  <PriceTag price={p.price} salePrice={p.salePrice} size="sm" showDiscount={false} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

/** Lấy id SP xem gần nhất từ localStorage (do ProductDetailPage lưu). */
function getRecentProductId(): number | null {
  try {
    const raw = localStorage.getItem('lw_last_product')
    if (!raw) return null
    const p = JSON.parse(raw)
    return typeof p?.id === 'number' ? p.id : null
  } catch {
    return null
  }
}
