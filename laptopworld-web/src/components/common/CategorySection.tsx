import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductCard } from './ProductCard'
import { useProducts } from '@/hooks/api/useProducts'
import { useBrandsByCategory } from '@/hooks/api/useCategories'
import { useCollectionProductsBySlug } from '@/hooks/api/useCollections'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export interface ExtraChip {
  /** Nhãn hiển thị trên chip, VD "Gaming" */
  label: string
  /** Slug của Collection tương ứng — admin phải tạo trước ở /admin/bo-suu-tap */
  collectionSlug: string
}

interface Props {
  title: string
  categoryId: number
  categorySlug: string
  bannerImage?: string
  bannerLink?: string
  bannerTitle: string
  bannerDesc?: string
  /**
   * Chip filter theo use case — mỗi chip trỏ vào 1 Collection.
   * Click chip → gọi API `/catalog/collections/{slug}/products`.
   * Khi collection chip active thì brand chips bị ẩn (2 mode không combine được vì API tách biệt).
   */
  extraChips?: ExtraChip[]
}

/**
 * Section 2 cột: banner promo dọc bên trái + chips + grid 8 SP bên phải.
 * Dùng cho khu "Điện thoại", "Laptop"...
 */
export function CategorySection({
  title, categoryId, categorySlug, bannerImage, bannerLink, bannerTitle, bannerDesc, extraChips,
}: Props) {
  const [activeBrand, setActiveBrand] = useState<number | undefined>()
  const [activeCollectionSlug, setActiveCollectionSlug] = useState<string | undefined>()

  // Brand chips lọc theo cat (chỉ brand có SP thật trong cat này)
  const { data: brands } = useBrandsByCategory(categoryId)

  // Mode 1 — collection active: gọi collection API
  const { data: collectionProducts, isLoading: loadingCollection } =
    useCollectionProductsBySlug(activeCollectionSlug, 8)

  // Mode 2 — mặc định: gọi products theo cat + brand
  const { data: paged, isLoading: loadingPaged } = useProducts({
    categoryId,
    brandId: activeBrand,
    size: 8,
    sort: 'isFeatured,desc',
  })

  // Effective data theo mode
  const products = activeCollectionSlug ? collectionProducts : paged?.content
  const isLoading = activeCollectionSlug ? loadingCollection : loadingPaged

  const selectCollection = (slug: string | undefined) => {
    setActiveCollectionSlug(slug)
    if (slug) setActiveBrand(undefined) // clear brand khi chọn collection
  }
  const selectBrand = (id: number | undefined) => {
    setActiveBrand(id)
    if (id) setActiveCollectionSlug(undefined) // clear collection khi chọn brand
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link to={`/danh-muc/${categorySlug}`} className="text-sm text-primary hover:underline flex items-center gap-1">
          Xem tất cả <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Left banner promo — aspect 1:3 CỨNG khớp với cropper 1:3 ở admin.
            Không stretch theo grid SP để tránh ảnh bị cover-crop khi grid cao hơn. */}
        <Link to={bannerLink || `/danh-muc/${categorySlug}`} className="block self-start">
          <Card className="aspect-[1/3] overflow-hidden p-0 transition hover:shadow-md">
            {bannerImage ? (
              <img
                src={bannerImage}
                alt={bannerTitle}
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.opacity = '0.3' }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 text-center">
                <h3 className="text-base font-bold text-primary line-clamp-2">{bannerTitle}</h3>
                {bannerDesc && <p className="text-xs text-muted-foreground">{bannerDesc}</p>}
              </div>
            )}
          </Card>
        </Link>

        {/* Right: chips + grid */}
        <div className="space-y-3">
          {/* Extra chips (use case → collection) */}
          {extraChips && extraChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <ChipBtn active={!activeCollectionSlug} onClick={() => selectCollection(undefined)}>Tất cả</ChipBtn>
              {extraChips.map((c) => (
                <ChipBtn
                  key={c.collectionSlug}
                  active={activeCollectionSlug === c.collectionSlug}
                  onClick={() => selectCollection(c.collectionSlug)}
                >
                  {c.label}
                </ChipBtn>
              ))}
            </div>
          )}

          {/* Brand chips — ẩn khi đang lọc theo collection (2 mode loại trừ nhau) */}
          {!activeCollectionSlug && brands && brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <ChipBtn active={!activeBrand} onClick={() => selectBrand(undefined)} variant="brand">Tất cả</ChipBtn>
              {brands.slice(0, 8).map((b) => (
                <ChipBtn
                  key={b.id}
                  active={activeBrand === b.id}
                  onClick={() => selectBrand(b.id)}
                  variant="brand"
                >
                  {b.name}
                </ChipBtn>
              ))}
            </div>
          )}

          {/* Products grid — 4 cột */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-lg" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {activeCollectionSlug
                ? 'Bộ sưu tập này chưa có sản phẩm. Admin cần gán sản phẩm ở trang /admin/bo-suu-tap.'
                : 'Không có sản phẩm phù hợp'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ChipBtn({
  active, children, onClick, variant = 'default',
}: {
  active: boolean; children: React.ReactNode; onClick: () => void; variant?: 'default' | 'brand'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition',
        variant === 'brand' ? 'font-medium' : '',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background hover:border-primary hover:text-primary'
      )}
    >
      {children}
    </button>
  )
}
