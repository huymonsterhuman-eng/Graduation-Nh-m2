import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
  value?: number | null   // 0-5
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

/** Hiển thị 5 star, đầy theo value (0-5, decimal OK). */
export function Rating({ value, size = 'sm', showValue = false, className }: RatingProps) {
  const v = value ?? 0
  const px = size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = v >= i
          const half = !filled && v >= i - 0.5
          return (
            <Star
              key={i}
              className={cn(px, filled || half ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')}
            />
          )
        })}
      </div>
      {showValue && v > 0 && (
        <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm', 'text-muted-foreground')}>
          {v.toFixed(1)}
        </span>
      )}
    </div>
  )
}
