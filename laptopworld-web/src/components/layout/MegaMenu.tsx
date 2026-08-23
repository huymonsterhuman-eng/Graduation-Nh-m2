import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Menu, Smartphone, Laptop, Tablet, Watch, Headphones, Package, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCategories, useBrands } from '@/hooks/api/useCategories'
import { useProducts } from '@/hooks/api/useProducts'
import { SmartImage } from '@/components/common/SmartImage'
import { formatPrice } from '@/lib/format'
import type { Category } from '@/types/api'

/** Map icon theo slug — không có thì fallback Package. */
const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  'dien-thoai': Smartphone,
  'laptop': Laptop,
  'tablet': Tablet,
  'smartwatch': Watch,
  'phu-kien': Headphones,
}

export function MegaMenu() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: categories } = useCategories()
  const { data: brands } = useBrands()
  const activeCategory = categories?.find((c) => c.id === activeId)

  // Preview SP theo category active
  const { data: featuredProducts } = useProducts({
    categoryId: activeId ?? undefined,
    size: 4,
    sort: 'isFeatured,desc',
  })

  // Auto chọn category đầu khi mở menu
  useEffect(() => {
    if (open && categories && categories.length > 0 && !activeId) {
      setActiveId(categories[0].id)
    }
  }, [open, categories, activeId])

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Đóng khi ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2 h-10"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        Danh mục
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[min(920px,calc(100vw-2rem))] rounded-lg border bg-background shadow-2xl overflow-hidden">
          <div className="grid grid-cols-[220px_1fr]">
            {/* Cột 1: danh mục cha */}
            <ul className="border-r bg-muted/30 max-h-[70vh] overflow-y-auto py-2">
              {categories?.map((c) => (
                <CategoryItem
                  key={c.id}
                  category={c}
                  active={activeId === c.id}
                  onEnter={() => setActiveId(c.id)}
                  onClickLink={() => setOpen(false)}
                />
              ))}
            </ul>

            {/* Cột 2: preview */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {activeCategory ? (
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                  {/* Sub-cat + brand */}
                  <div className="space-y-4">
                    {activeCategory.children && activeCategory.children.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Danh mục con
                        </h4>
                        <div className="grid grid-cols-2 gap-1">
                          {activeCategory.children.map((sub) => (
                            <Link
                              key={sub.id}
                              to={`/danh-muc/${sub.slug}`}
                              onClick={() => setOpen(false)}
                              className="rounded px-2 py-1.5 text-sm hover:bg-primary/10 hover:text-primary transition"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {brands && brands.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Thương hiệu
                        </h4>
                        <div className="grid grid-cols-3 gap-1">
                          {brands.slice(0, 9).map((b) => (
                            <Link
                              key={b.id}
                              to={`/danh-muc/${activeCategory.slug}?brandId=${b.id}`}
                              onClick={() => setOpen(false)}
                              className="rounded border px-2 py-1.5 text-xs text-center hover:border-primary hover:text-primary transition"
                            >
                              {b.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Khoảng giá
                      </h4>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { label: 'Dưới 5 triệu', max: 5_000_000 },
                          { label: '5 - 10 triệu', min: 5_000_000, max: 10_000_000 },
                          { label: '10 - 20 triệu', min: 10_000_000, max: 20_000_000 },
                          { label: 'Trên 20 triệu', min: 20_000_000 },
                        ].map((p) => {
                          const qs = new URLSearchParams()
                          if (p.min) qs.set('minPrice', String(p.min))
                          if (p.max) qs.set('maxPrice', String(p.max))
                          return (
                            <Link
                              key={p.label}
                              to={`/danh-muc/${activeCategory.slug}?${qs}`}
                              onClick={() => setOpen(false)}
                              className="rounded px-2 py-1.5 text-xs hover:bg-primary/10 hover:text-primary transition"
                            >
                              {p.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Featured products */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Nổi bật
                    </h4>
                    <div className="space-y-2">
                      {featuredProducts?.content?.slice(0, 4).map((p) => (
                        <Link
                          key={p.id}
                          to={`/san-pham/${p.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-2 rounded border p-2 hover:border-primary transition"
                        >
                          <SmartImage
                            src={p.primaryImage}
                            alt={p.name}
                            className="h-12 w-12 rounded object-cover shrink-0"
                            usePicsum
                            seed={`p-${p.id}`}
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
                            <p className="text-xs font-semibold text-primary">
                              {formatPrice(p.salePrice ?? p.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Chọn danh mục để xem chi tiết
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryItem({
  category,
  active,
  onEnter,
  onClickLink,
}: {
  category: Category
  active: boolean
  onEnter: () => void
  onClickLink: () => void
}) {
  const Icon = CATEGORY_ICONS[category.slug] || Package
  return (
    <li>
      <div
        onMouseEnter={onEnter}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition text-sm',
          active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <Link
          to={`/danh-muc/${category.slug}`}
          onClick={onClickLink}
          className="flex-1 truncate"
        >
          {category.name}
        </Link>
        {category.children && category.children.length > 0 && (
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        )}
      </div>
    </li>
  )
}
