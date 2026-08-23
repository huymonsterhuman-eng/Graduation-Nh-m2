import { Link } from 'react-router-dom'
import type { ProductListItem } from '@/types/api'
import { PriceTag } from './PriceTag'
import { Rating } from './Rating'
import { SmartImage } from './SmartImage'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Scale } from 'lucide-react'
import { useWishlistStore } from '@/stores/wishlist'
import { useCompareStore } from '@/stores/compare'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  product: ProductListItem
}

export function ProductCard({ product }: Props) {
  const outOfStock = product.stock <= 0
  const inWishlist = useWishlistStore((s) => s.has(product.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const inCompare = useCompareStore((s) => s.has(product.id))
  const toggleCompare = useCompareStore((s) => s.toggle)
  const supportsInstallment = product.price >= 3_000_000

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWish(product.id)
    toast.success(inWishlist ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích')
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const res = toggleCompare({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.primaryImage,
      price: product.price,
      salePrice: product.salePrice,
    })
    if (res.overflow) toast.error('Chỉ so sánh được tối đa 3 sản phẩm')
    else if (res.added) toast.success('Đã thêm vào so sánh')
    else toast.success('Đã bỏ khỏi so sánh')
  }

  return (
    <Card className="group relative overflow-hidden transition hover:shadow-md">
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <button
          onClick={handleWishlist}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110',
            inWishlist ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          )}
          aria-label={inWishlist ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          <Heart className={cn('h-4 w-4', inWishlist && 'fill-current')} />
        </button>
        <button
          onClick={handleCompare}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110',
            inCompare ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
          aria-label={inCompare ? 'Bỏ so sánh' : 'Thêm so sánh'}
        >
          <Scale className="h-4 w-4" />
        </button>
      </div>

      <Link to={`/san-pham/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <SmartImage
            src={product.primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
            usePicsum
            seed={`p-${product.id}`}
          />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.isFeatured && <Badge variant="warning" className="text-[10px]">HOT</Badge>}
            {product.salePrice && product.salePrice < product.price && (
              <Badge variant="destructive" className="text-[10px]">
                -{Math.round((1 - product.salePrice / product.price) * 100)}%
              </Badge>
            )}
          </div>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Badge variant="secondary">Hết hàng</Badge>
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div className="text-xs text-muted-foreground">{product.brandName}</div>
          <h3 className="line-clamp-2 h-10 text-sm font-medium leading-5">{product.name}</h3>
          <PriceTag price={product.price} salePrice={product.salePrice} size="sm" />
          {supportsInstallment && (
            <p className="text-[10px] text-emerald-600 font-medium">Trả góp 0% qua thẻ</p>
          )}
          <div className="flex items-center justify-between">
            <Rating value={product.avgRating} showValue />
            <span className="text-xs text-muted-foreground">
              {product.reviewCount > 0 ? `${product.reviewCount} đánh giá` : 'Chưa có ĐG'}
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}
