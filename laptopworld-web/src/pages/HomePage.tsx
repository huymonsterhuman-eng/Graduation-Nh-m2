import { Link } from 'react-router-dom'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { SmartImage } from '@/components/common/SmartImage'
import { FlashSaleBlock } from '@/components/common/FlashSaleBlock'
import { CategorySection } from '@/components/common/CategorySection'
import { AccessoriesSection } from '@/components/common/AccessoriesSection'
import { AiRecommendSection } from '@/components/common/AiRecommendSection'
import { PromoGrid } from '@/components/common/PromoGrid'
import { CollectionsSection } from '@/components/common/CollectionsSection'
import { TestimonialSection } from '@/components/common/TestimonialSection'
import { useBanners, useBannerBySlot } from '@/hooks/api/useBanners'
import { productImageSrc } from '@/lib/format'
import { useCategories } from '@/hooks/api/useCategories'
import { useCollectionsByPosition } from '@/hooks/api/useCollections'
import { usePosts } from '@/hooks/api/useBlog'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, ArrowRight } from 'lucide-react'

export function HomePage() {
  const { data: banners } = useBanners()
  const { data: tree } = useCategories()
  const { data: posts } = usePosts({ size: 3 })
  const { data: phoneSidebar } = useBannerBySlot('sidebar_phone')
  const { data: laptopSidebar } = useBannerBySlot('sidebar_laptop')
  const { data: phoneChips } = useCollectionsByPosition('PHONE_CHIP')
  const { data: laptopChips } = useCollectionsByPosition('LAPTOP_CHIP')

  const findCat = (slug: string) => tree?.find((c) => c.slug === slug)
  const dienThoai = findCat('dien-thoai')
  const laptop = findCat('laptop')

  const toExtraChips = (cs: typeof laptopChips) =>
    (cs ?? []).map((c) => ({ label: c.name, collectionSlug: c.slug }))

  return (
    <div className="container py-6 space-y-10">
      {/* Banner slider */}
      <section>
        {banners && banners.length > 0 ? (
          <Carousel opts={{ loop: true, align: 'start' }} className="w-full">
            <CarouselContent>
              {banners.map((b) => (
                <CarouselItem key={b.id}>
                  <a href={b.link || '#'} className="block overflow-hidden rounded-lg bg-muted">
                    {/* Aspect 3:1 cố định 2 device — khớp chính xác cropper hero để không cover-crop */}
                    <SmartImage
                      src={b.image}
                      alt={b.title || 'Banner'}
                      className="w-full aspect-[3/1] object-cover"
                      usePicsum
                      seed={`banner-${b.id}`}
                      fallbackSize="1200x400"
                    />
                  </a>
                </CarouselItem>
              ))}
            </CarouselContent>
            {banners.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        ) : (
          <Skeleton className="w-full aspect-[3/1] rounded-lg" />
        )}
      </section>

      {/* Flash sale v2 */}
      <FlashSaleBlock />

      {/* Điện thoại — 2 cột. Chip use case lấy từ collection homePosition=PHONE_CHIP (admin gán). */}
      {dienThoai && (
        <CategorySection
          title="Điện thoại nổi bật"
          categoryId={dienThoai.id}
          categorySlug={dienThoai.slug}
          bannerTitle={phoneSidebar?.title || 'iPhone 15 Pro Max'}
          bannerDesc={phoneSidebar ? undefined : 'Trả góp 0% - Bảo hành 12 tháng'}
          bannerImage={phoneSidebar?.image ? productImageSrc(phoneSidebar.image) : `https://picsum.photos/seed/lw-promo-phone/300/400`}
          bannerLink={phoneSidebar?.link || undefined}
          extraChips={toExtraChips(phoneChips)}
        />
      )}

      {/* Laptop — 2 cột. Chip use case lấy từ collection homePosition=LAPTOP_CHIP (admin gán). */}
      {laptop && (
        <CategorySection
          title="Laptop văn phòng - Gaming"
          categoryId={laptop.id}
          categorySlug={laptop.slug}
          bannerTitle={laptopSidebar?.title || 'MacBook Air M3'}
          bannerDesc={laptopSidebar ? undefined : 'Chỉ từ 22.99 triệu - Trả góp 0%'}
          bannerImage={laptopSidebar?.image ? productImageSrc(laptopSidebar.image) : `https://picsum.photos/seed/lw-promo-laptop/300/400`}
          bannerLink={laptopSidebar?.link || undefined}
          extraChips={toExtraChips(laptopChips)}
        />
      )}

      {/* Bộ sưu tập nổi bật (admin bật showOnHome) */}
      <CollectionsSection />

      {/* Phụ kiện — grid 6 danh mục con */}
      <AccessoriesSection />

      {/* Gợi ý AI */}
      <AiRecommendSection />

      {/* Promo grid 2x2 */}
      <PromoGrid />

      {/* Blog + Testimonial */}
      {posts && posts.content.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Tin công nghệ mới nhất</h2>
            <Link to="/tin-tuc" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {posts.content.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/tin-tuc/${p.slug}`}>
                <Card className="group overflow-hidden transition hover:shadow-md h-full">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <SmartImage
                      src={p.image}
                      alt={p.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      usePicsum
                      seed={`post-${p.id}`}
                      fallbackSize="600x400"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    {p.postCategoryName && (
                      <Badge variant="secondary" className="text-xs">{p.postCategoryName}</Badge>
                    )}
                    <h3 className="line-clamp-2 font-semibold leading-tight text-sm">{p.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(p.publishedAt || p.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TestimonialSection />
    </div>
  )
}
