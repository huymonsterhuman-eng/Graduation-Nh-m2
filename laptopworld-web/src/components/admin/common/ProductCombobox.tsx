import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { productImageSrc, formatPrice } from '@/lib/format'
import { useProductSearchLite } from '@/hooks/api/useAdminInventory'
import type { ProductListItem } from '@/types/api'
import { cn } from '@/lib/utils'

interface Props {
  onPick: (product: ProductListItem) => void
  excludeIds?: number[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /** Nếu true, chỉ cho phép chọn SP có stock > 0. */
  requireStock?: boolean
}

/**
 * Combobox tìm SP inline — không dùng modal. Style giống Shopee/TGDD admin:
 * gõ → dropdown suggestion → click → chọn.
 * Debounce 250ms để đỡ gọi API dồn dập.
 */
export function ProductCombobox({
  onPick, excludeIds = [], placeholder = 'Tìm SP theo tên...',
  autoFocus, className, requireStock = false,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword), 250)
    return () => clearTimeout(t)
  }, [keyword])

  const { data: results, isFetching } = useProductSearchLite(debounced, focused)

  // Click outside → đóng dropdown
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = (results ?? []).filter((p) => !excludeIds.includes(p.id))
  const showDropdown = focused && debounced.trim().length > 0

  const handlePick = (p: ProductListItem) => {
    onPick(p)
    setKeyword('')
    setDebounced('')
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 && !isFetching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Không tìm thấy sản phẩm khớp "{debounced}"
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => {
                const outOfStock = requireStock && p.stock <= 0
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => !outOfStock && handlePick(p)}
                      disabled={outOfStock}
                      className={cn(
                        'flex w-full items-center gap-3 p-2 text-left transition',
                        outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
                      )}
                    >
                      <img
                        src={productImageSrc(p.primaryImage)}
                        alt={p.name}
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(p.salePrice ?? p.price)}
                          {' · '}
                          <span className={cn(
                            p.stock <= 0 && 'text-destructive font-medium',
                            p.stock > 0 && p.stock <= 5 && 'text-amber-600 font-medium'
                          )}>
                            Tồn: {p.stock}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
