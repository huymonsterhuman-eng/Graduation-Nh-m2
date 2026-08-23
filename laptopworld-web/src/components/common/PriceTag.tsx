import { cn } from '@/lib/utils'
import { formatPrice, discountPercent } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

interface PriceTagProps {
  price: number
  salePrice?: number | null
  size?: 'sm' | 'md' | 'lg'
  showDiscount?: boolean
  className?: string
}

export function PriceTag({ price, salePrice, size = 'md', showDiscount = true, className }: PriceTagProps) {
  const onSale = salePrice != null && salePrice < price
  const priceCls =
    size === 'sm' ? 'text-sm font-semibold' :
    size === 'md' ? 'text-base font-semibold' :
    'text-2xl font-bold'
  const strikeCls = size === 'lg' ? 'text-base' : 'text-xs'

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn(priceCls, 'text-primary')}>
        {formatPrice(onSale ? salePrice! : price)}
      </span>
      {onSale && (
        <>
          <span className={cn(strikeCls, 'text-muted-foreground line-through')}>
            {formatPrice(price)}
          </span>
          {showDiscount && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              -{discountPercent(price, salePrice)}%
            </Badge>
          )}
        </>
      )}
    </div>
  )
}
