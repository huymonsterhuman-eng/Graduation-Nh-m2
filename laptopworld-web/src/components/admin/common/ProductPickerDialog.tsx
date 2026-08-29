import { useEffect, useState, useMemo } from 'react'
import { Search, Plus, Package, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAdminProducts } from '@/hooks/api/useAdminProducts'
import { useCategoriesFlat, useBrands } from '@/hooks/api/useCategories'
import { productImageSrc, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProductListItem } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** SP đã có trong phiếu — sẽ được đánh dấu "Đã có" và không cho chọn lại. */
  excludeIds: number[]
  /** Callback khi bấm Confirm — trả nguyên object SP để caller khởi tạo dòng. */
  onConfirm: (products: ProductListItem[]) => void
  /** true = chỉ SP còn hàng mới chọn được (dùng cho phiếu xuất). */
  requireStock?: boolean
  title?: string
  description?: string
}

export function ProductPickerDialog({
  open, onOpenChange, excludeIds, onConfirm,
  requireStock = false,
  title = 'Chọn sản phẩm',
  description,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [debouncedKw, setDebouncedKw] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [brandId, setBrandId] = useState<number | undefined>()
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Map<number, ProductListItem>>(new Map())

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])

  // Reset khi mở dialog
  useEffect(() => {
    if (open) {
      setKeyword(''); setDebouncedKw(''); setCategoryId(undefined)
      setBrandId(undefined); setPage(0); setSelected(new Map())
    }
  }, [open])

  // Debounce search 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 250)
    return () => clearTimeout(t)
  }, [keyword])

  // Reset page khi filter đổi
  useEffect(() => { setPage(0) }, [debouncedKw, categoryId, brandId])

  const { data: categories } = useCategoriesFlat()
  const { data: brands } = useBrands()
  const { data: pageData, isFetching } = useAdminProducts({
    keyword: debouncedKw || undefined,
    categoryId,
    brandId,
    isActive: true,
    page,
    size: 12,
  })

  const products = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0

  const toggle = (p: ProductListItem) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(p.id)) next.delete(p.id); else next.set(p.id, p)
      return next
    })
  }

  const clearFilter = () => {
    setKeyword(''); setCategoryId(undefined); setBrandId(undefined); setPage(0)
  }

  const removeSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Map(prev); next.delete(id); return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Toolbar filter */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên sản phẩm..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
          <Select value={categoryId?.toString() ?? '__all__'}
            onValueChange={(v) => setCategoryId(v === '__all__' ? undefined : Number(v))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Danh mục" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Mọi danh mục</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandId?.toString() ?? '__all__'}
            onValueChange={(v) => setBrandId(v === '__all__' ? undefined : Number(v))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Thương hiệu" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Mọi thương hiệu</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-9">Xóa lọc</Button>
        </div>

        <div className="grid gap-3 overflow-hidden md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Product grid */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalElements} SP khớp lọc</span>
              <span>Trang {page + 1}/{Math.max(totalPages, 1)}</span>
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border" style={{ maxHeight: '48vh' }}>
              {isFetching && products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Đang tải...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Không có sản phẩm nào khớp lọc.
                </div>
              ) : (
                <ul className="divide-y">
                  {products.map((p) => {
                    const alreadyInForm = excludeSet.has(p.id)
                    const outOfStock = requireStock && p.stock <= 0
                    const disabled = alreadyInForm || outOfStock
                    const checked = selected.has(p.id)
                    const disabledReason = alreadyInForm ? 'Đã có trong phiếu'
                      : outOfStock ? 'Hết hàng' : ''
                    return (
                      <li key={p.id}
                        className={cn(
                          'flex items-center gap-3 p-2 transition',
                          disabled ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'
                        )}
                        onClick={() => !disabled && toggle(p)}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(p)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <img src={productImageSrc(p.primaryImage)} alt={p.name}
                          className="h-11 w-11 shrink-0 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(p.salePrice ?? p.price)}
                            {p.brandName && <> · {p.brandName}</>}
                            {' · '}
                            <span className={cn(
                              p.stock <= 0 && 'font-medium text-destructive',
                              p.stock > 0 && p.stock <= 5 && 'font-medium text-amber-600',
                            )}>
                              Tồn: {p.stock}
                            </span>
                          </div>
                        </div>
                        {disabledReason && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">{disabledReason}</Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2"
                  disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  ← Trước
                </Button>
                <span className="px-2 text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 px-2"
                  disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sau →
                </Button>
              </div>
            )}
          </div>

          {/* Selected panel */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold">Đã chọn</span>
              <Badge variant={selected.size > 0 ? 'default' : 'outline'}>{selected.size} SP</Badge>
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border bg-muted/20" style={{ maxHeight: '48vh' }}>
              {selected.size === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Chưa chọn SP nào.<br />
                  Tick vào ô vuông ở panel trái để thêm.
                </div>
              ) : (
                <ul className="divide-y">
                  {Array.from(selected.values()).map((p) => (
                    <li key={p.id} className="flex items-center gap-2 p-2">
                      <img src={productImageSrc(p.primaryImage)} alt={p.name}
                        className="h-8 w-8 shrink-0 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-xs font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">Tồn: {p.stock}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => removeSelected(p.id)} title="Bỏ chọn">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            <Plus className="mr-1 h-4 w-4" />
            Thêm {selected.size > 0 ? `${selected.size} ` : ''}sản phẩm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
