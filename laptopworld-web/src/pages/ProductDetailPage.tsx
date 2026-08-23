import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProductBySlug, useRelatedProducts } from '@/hooks/api/useProducts'
import { useProductReviews } from '@/hooks/api/useReviews'
import { useAddToCart } from '@/hooks/api/useCart'
import { useAuthStore } from '@/stores/auth'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { PriceTag } from '@/components/common/PriceTag'
import { Rating } from '@/components/common/Rating'
import { ProductGrid } from '@/components/common/ProductGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { SmartImage } from '@/components/common/SmartImage'
import { ShoppingCart, Package, Minus, Plus, Zap, Star, PenSquare } from 'lucide-react'
import { toast } from 'sonner'
import { ReviewDialog } from '@/components/ReviewDialog'
import { useQueryClient } from '@tanstack/react-query'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProductBySlug(slug)
  const { data: related } = useRelatedProducts(product?.id, 8)
  const { data: reviewPage } = useProductReviews(product?.id, 0, 10)
  const addToCart = useAddToCart()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [reviewOpen, setReviewOpen] = useState(false)

  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [showSticky, setShowSticky] = useState(false)
  const purchaseCardRef = useRef<HTMLDivElement>(null)

  // Hiện sticky bar khi cuộn qua vùng info chính
  useEffect(() => {
    const onScroll = () => {
      const el = purchaseCardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setShowSticky(rect.bottom < 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lưu SP xem gần nhất để AiRecommendSection ở HomePage dùng cho semantic search
  useEffect(() => {
    if (product) {
      try {
        localStorage.setItem('lw_last_product', JSON.stringify({ id: product.id, name: product.name, slug: product.slug }))
      } catch { /* ignore */ }
    }
  }, [product])

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Không tìm thấy sản phẩm.
      </div>
    )
  }

  const images = product.images.length > 0
    ? product.images
    : [{ id: 0, path: '/placeholder-product.svg', alt: product.name, sortOrder: 0, isPrimary: true }]

  // availableStock = stock - reservedStock (còn khả dụng khi đặt hàng)
  const displayStock = (product as { availableStock?: number }).availableStock ?? product.stock
  const outOfStock = displayStock <= 0
  const specsEntries = product.specs
    ? Object.entries(product.specs).filter(([, v]) => v != null && v !== '')
    : []

  const requireLogin = () => {
    if (!user) {
      toast.info('Vui lòng đăng nhập để tiếp tục')
      navigate('/dang-nhap', { state: { from: `/san-pham/${product.slug}` } })
      return false
    }
    return true
  }

  const handleAddToCart = async () => {
    if (!requireLogin()) return
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: qty })
      toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ`)
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Thêm giỏ thất bại')
    }
  }

  const handleBuyNow = async () => {
    if (!requireLogin()) return
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: qty })
      navigate('/dat-hang')
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không mua được')
    }
  }

  return (
    <div className="container py-6">
      <Breadcrumb items={[
        ...(product.category ? [{ label: product.category.name, to: `/danh-muc/${product.category.slug}` }] : []),
        { label: product.name },
      ]} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Gallery + info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
              <SmartImage
                src={images[activeImage]?.path}
                alt={images[activeImage]?.alt || product.name}
                className="h-full w-full object-cover"
                usePicsum
                seed={`p-${product.id}-${activeImage}`}
                fallbackSize="600x600"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square overflow-hidden rounded border-2 ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                  >
                    <SmartImage
                      src={img.path}
                      alt={img.alt || ''}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      usePicsum
                      seed={`p-${product.id}-${i}`}
                      fallbackSize="150x150"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              {product.brand && <div className="text-sm text-muted-foreground">{product.brand.name}</div>}
              <h1 className="text-2xl font-bold">{product.name}</h1>
            </div>

            <div className="flex items-center gap-4">
              <Rating value={product.avgRating} size="md" showValue />
              <span className="text-sm text-muted-foreground">
                {product.reviewCount} đánh giá
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">{product.views} lượt xem</span>
            </div>

            <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />

            {product.shortDescription && (
              <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              {outOfStock ? (
                <Badge variant="destructive">Hết hàng</Badge>
              ) : (
                <span className="text-emerald-600">Còn {displayStock} sản phẩm</span>
              )}
            </div>
          </div>
        </div>

        {/* Purchase card */}
        <Card ref={purchaseCardRef} className="h-fit md:sticky md:top-24">
          <CardContent className="p-6 space-y-4">
            <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={outOfStock}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQty(Math.min(displayStock, qty + 1))}
                disabled={outOfStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleBuyNow}
                disabled={outOfStock || addToCart.isPending}
              >
                <Zap className="mr-2 h-5 w-5" />
                Mua ngay
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleAddToCart}
                disabled={outOfStock || addToCart.isPending}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Thêm vào giỏ hàng
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Miễn phí vận chuyển đơn từ 5 triệu</p>
              <p>✓ Bảo hành chính hãng 12-24 tháng</p>
              <p>✓ Đổi trả trong 7 ngày</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Mô tả</TabsTrigger>
            <TabsTrigger value="specs">Thông số kỹ thuật</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá ({product.reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <Card>
              <CardContent className="pt-6 prose max-w-none text-sm">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p className="text-muted-foreground">Chưa có mô tả chi tiết.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specs">
            <Card>
              <CardContent className="pt-6">
                {specsEntries.length > 0 ? (
                  <div className="grid gap-2">
                    {specsEntries.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[200px_1fr] gap-4 border-b py-2 text-sm">
                        <span className="font-medium capitalize">{k}</span>
                        <span className="text-muted-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có thông số.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-600">
                      <Star className="h-5 w-5 fill-amber-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Bạn đã dùng sản phẩm này?</div>
                      <div className="text-xs text-muted-foreground">
                        Chia sẻ trải nghiệm để giúp khách khác đưa ra quyết định.
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!user) {
                        toast.info('Vui lòng đăng nhập để đánh giá')
                        navigate('/dang-nhap', { state: { from: window.location.pathname } })
                        return
                      }
                      setReviewOpen(true)
                    }}
                  >
                    <PenSquare className="mr-1.5 h-4 w-4" /> Viết đánh giá
                  </Button>
                </div>

                {reviewPage?.content?.length ? (
                  reviewPage.content.map((r) => (
                    <div key={r.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.userFullName || r.username}</span>
                        <Rating value={r.rating} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                      {r.image && (
                        <SmartImage
                          src={r.image}
                          alt="Ảnh review"
                          className="mt-2 h-24 w-24 rounded object-cover"
                          loading="lazy"
                          fallbackSize="150x150"
                        />
                      )}
                      {r.adminReply && (
                        <div className="mt-2 rounded bg-muted p-2 text-xs">
                          <span className="font-medium">Phản hồi từ shop: </span>{r.adminReply}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có đánh giá nào cho sản phẩm này.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Sản phẩm liên quan</h2>
          <ProductGrid products={related} />
        </section>
      )}

      {reviewOpen && product && (
        <ReviewDialog
          productId={product.id}
          productName={product.name}
          onClose={() => setReviewOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['product-reviews', product.id] })
            qc.invalidateQueries({ queryKey: ['product', slug] })
          }}
        />
      )}

      {/* Sticky purchase bar khi scroll qua fold */}
      {showSticky && !outOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur shadow-lg animate-in slide-in-from-bottom">
          <div className="container flex items-center gap-3 py-3">
            <SmartImage
              src={images[0]?.path}
              alt={product.name}
              className="h-12 w-12 rounded object-cover shrink-0"
              usePicsum
              seed={`p-${product.id}`}
              fallbackSize="80x80"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
              <PriceTag price={product.price} salePrice={product.salePrice} size="sm" showDiscount={false} />
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <Button variant="outline" size="icon" className="h-9 w-9"
                onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3 w-3" /></Button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <Button variant="outline" size="icon" className="h-9 w-9"
                onClick={() => setQty(Math.min(displayStock, qty + 1))}><Plus className="h-3 w-3" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddToCart} disabled={addToCart.isPending}>
              <ShoppingCart className="mr-1 h-4 w-4" /> Thêm giỏ
            </Button>
            <Button size="sm" onClick={handleBuyNow} disabled={addToCart.isPending}>
              <Zap className="mr-1 h-4 w-4" /> Mua ngay
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
