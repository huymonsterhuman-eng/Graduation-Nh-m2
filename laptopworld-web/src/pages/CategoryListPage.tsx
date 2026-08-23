import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProductGrid } from '@/components/common/ProductGrid'
import { Pagination } from '@/components/common/Pagination'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCategoryBySlug, useBrands } from '@/hooks/api/useCategories'
import { useProducts } from '@/hooks/api/useProducts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12
const SPEC_LABELS: Record<string, string> = {
  chip: 'Chip / CPU',
  ram: 'RAM',
  ssd: 'Ổ cứng SSD',
  screen: 'Màn hình',
  camera: 'Camera',
  battery: 'Pin',
  os: 'Hệ điều hành',
}

export function CategoryListPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: category } = useCategoryBySlug(slug)
  const { data: brands } = useBrands()

  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('createdAt,desc')
  const [brandId, setBrandId] = useState<number | undefined>()
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const { data, isLoading } = useProducts({
    categoryId: category?.id,
    brandId,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort,
    page,
    size: PAGE_SIZE,
  })

  // Danh sách các spec key có trong category (từ SPEC_LABELS)
  const specKeys = useMemo(() => Object.keys(SPEC_LABELS), [])

  const resetFilter = () => {
    setBrandId(undefined)
    setMinPrice('')
    setMaxPrice('')
    setPage(0)
  }

  return (
    <div className="container py-6">
      <Breadcrumb items={[{ label: 'Danh mục', to: '/danh-muc' }, { label: category?.name || slug || '' }]} />

      <h1 className="text-2xl font-bold mb-6">{category?.name || 'Sản phẩm'}</h1>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Filter panel */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thương hiệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-auto">
              <button
                onClick={() => { setBrandId(undefined); setPage(0) }}
                className={cn(
                  'block w-full text-left text-sm hover:text-primary',
                  !brandId && 'text-primary font-medium'
                )}
              >
                Tất cả
              </button>
              {brands?.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setBrandId(b.id); setPage(0) }}
                  className={cn(
                    'block w-full text-left text-sm hover:text-primary',
                    brandId === b.id && 'text-primary font-medium'
                  )}
                >
                  {b.name}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Khoảng giá</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Từ (VND)</Label>
                <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Đến (VND)</Label>
                <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="numeric" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => setPage(0)}>Áp dụng</Button>
            </CardContent>
          </Card>

          {/* Filter theo specs — accordion (chỉ label, chưa filter thật vì list API không trả specs) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông số kỹ thuật</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {specKeys.map((k) => (
                <SpecAccordion key={k} label={SPEC_LABELS[k]} />
              ))}
              <p className="text-[10px] text-muted-foreground pt-2 italic">
                Lọc chi tiết theo thông số sẽ có ở phiên bản sau
              </p>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full" onClick={resetFilter}>Xóa bộ lọc</Button>
        </aside>

        {/* Product list */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {data?.totalElements ?? 0} sản phẩm
            </span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(0) }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="createdAt,desc">Mới nhất</option>
              <option value="price,asc">Giá tăng dần</option>
              <option value="price,desc">Giá giảm dần</option>
              <option value="views,desc">Xem nhiều</option>
            </select>
          </div>

          <ProductGrid products={data?.content} loading={isLoading} skeletonCount={12} />

          {data && (
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}

function SpecAccordion({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm hover:text-primary"
      >
        <span>{label}</span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="pb-2 text-xs text-muted-foreground">
          Chưa có tùy chọn (backend filter chưa hỗ trợ)
        </div>
      )}
    </div>
  )
}
