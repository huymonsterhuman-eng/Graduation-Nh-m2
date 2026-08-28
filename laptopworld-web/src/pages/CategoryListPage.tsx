import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '@/components/common/ProductGrid'
import { Pagination } from '@/components/common/Pagination'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCategoryBySlug, useBrandsByCategory, useSpecValues } from '@/hooks/api/useCategories'
import { useProducts } from '@/hooks/api/useProducts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

const PAGE_SIZE = 12

/** Chỉ nhận chữ số 0-9 (bỏ dấu chấm, dấu phẩy, chữ). */
function sanitizeDigits(v: string): string {
  return v.replace(/\D/g, '')
}

/** Format 12345678 → 12.345.678 (chỉ để hiển thị dưới ô input). */
function formatThousands(v: string): string {
  if (!v) return ''
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function CategoryListPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: category } = useCategoryBySlug(slug)
  // Chỉ hiện brand có SP thực sự trong cat này (bao gồm sub-cat)
  const { data: brands } = useBrandsByCategory(category?.id)
  // Aggregate distinct value cho từng key thông số kỹ thuật của cat
  const { data: specGroups } = useSpecValues(category?.id)

  // URL query params là source of truth cho brandId/minPrice/maxPrice/spec.*
  // → link từ MegaMenu (?brandId=X) hoạt động; back/forward giữ nguyên filter.
  const [searchParams, setSearchParams] = useSearchParams()
  const brandIdStr = searchParams.get('brandId')
  const brandId = brandIdStr ? Number(brandIdStr) : undefined
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''

  // Draft + error cho ô nhập giá — chỉ commit khi bấm "Áp dụng"
  const [minDraft, setMinDraft] = useState(minPrice)
  const [maxDraft, setMaxDraft] = useState(maxPrice)
  const [priceError, setPriceError] = useState<string | undefined>()
  useEffect(() => {
    setMinDraft(minPrice); setMaxDraft(maxPrice); setPriceError(undefined)
  }, [minPrice, maxPrice])

  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('createdAt,desc')

  // Parse specs từ URL — mỗi key có thể có nhiều value
  const specs = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const [k, v] of searchParams.entries()) {
      if (!k.startsWith('spec.') || !v) continue
      const key = k.slice('spec.'.length)
      if (!key) continue
      ;(result[key] ??= []).push(v)
    }
    return result
  }, [searchParams])

  // Signature ổn định cho dependency (Object không so được reference)
  const specsSig = useMemo(
    () => Object.entries(specs).map(([k, vs]) => `${k}:${[...vs].sort().join(',')}`).sort().join('|'),
    [specs]
  )

  // Reset page khi filter đổi
  useEffect(() => { setPage(0) }, [brandId, minPrice, maxPrice, specsSig])

  const { data, isLoading } = useProducts({
    categoryId: category?.id,
    brandId,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    specs: Object.keys(specs).length > 0 ? specs : undefined,
    sort,
    page,
    size: PAGE_SIZE,
  })

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete(key); else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const toggleSpec = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    const current = next.getAll(`spec.${key}`)
    if (current.includes(value)) {
      next.delete(`spec.${key}`)
      current.filter((v) => v !== value).forEach((v) => next.append(`spec.${key}`, v))
    } else {
      next.append(`spec.${key}`, value)
    }
    setSearchParams(next, { replace: true })
  }

  const clearSpecKey = (key: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete(`spec.${key}`)
    setSearchParams(next, { replace: true })
  }

  const applyPrice = () => {
    // Validate: chỉ số, không âm, min <= max, tối đa 12 chữ số (~999 tỷ)
    const minStr = sanitizeDigits(minDraft)
    const maxStr = sanitizeDigits(maxDraft)
    if (minStr.length > 12 || maxStr.length > 12) {
      setPriceError('Số quá lớn — tối đa 12 chữ số'); return
    }
    if (minStr && maxStr && Number(minStr) > Number(maxStr)) {
      setPriceError('Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa'); return
    }
    setPriceError(undefined)
    const next = new URLSearchParams(searchParams)
    if (minStr) next.set('minPrice', minStr); else next.delete('minPrice')
    if (maxStr) next.set('maxPrice', maxStr); else next.delete('maxPrice')
    setSearchParams(next, { replace: true })
  }

  const resetFilter = () => {
    setSearchParams({}, { replace: true })
  }

  const activeSpecCount = Object.values(specs).reduce((sum, arr) => sum + arr.length, 0)

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
                onClick={() => updateParam('brandId', undefined)}
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
                  onClick={() => updateParam('brandId', String(b.id))}
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
                <Input
                  value={formatThousands(minDraft)}
                  onChange={(e) => { setMinDraft(sanitizeDigits(e.target.value)); setPriceError(undefined) }}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!priceError}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Đến (VND)</Label>
                <Input
                  value={formatThousands(maxDraft)}
                  onChange={(e) => { setMaxDraft(sanitizeDigits(e.target.value)); setPriceError(undefined) }}
                  inputMode="numeric"
                  placeholder="Không giới hạn"
                  aria-invalid={!!priceError}
                />
              </div>
              {priceError && (
                <p className="text-xs text-destructive">{priceError}</p>
              )}
              {!priceError && (minDraft || maxDraft) && (
                <p className="text-[11px] text-muted-foreground">
                  {minDraft && `Từ ${formatPrice(Number(minDraft))}`}
                  {minDraft && maxDraft && ' — '}
                  {maxDraft && `Đến ${formatPrice(Number(maxDraft))}`}
                </p>
              )}
              <Button variant="outline" className="w-full" onClick={applyPrice}>Áp dụng</Button>
            </CardContent>
          </Card>

          {/* Filter theo thông số kỹ thuật — real, dùng specs JSONB backend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Thông số kỹ thuật</span>
                {activeSpecCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{activeSpecCount} đã chọn</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {!specGroups || specGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Chưa có thông số nào cho danh mục này
                </p>
              ) : (
                specGroups.map((g) => (
                  <SpecAccordion
                    key={g.key}
                    group={g}
                    selectedValues={specs[g.key] ?? []}
                    onToggle={(v) => toggleSpec(g.key, v)}
                    onClear={() => clearSpecKey(g.key)}
                  />
                ))
              )}
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

/**
 * Accordion 1 nhóm spec — checkbox multi-select với count và nút "Xoá" khi có value chọn.
 * Auto mở khi đã có value chọn.
 */
function SpecAccordion({
  group,
  selectedValues,
  onToggle,
  onClear,
}: {
  group: { key: string; label: string; values: { value: string; count: number }[] }
  selectedValues: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const hasSelected = selectedValues.length > 0
  const [open, setOpen] = useState(hasSelected)
  useEffect(() => { if (hasSelected) setOpen(true) }, [hasSelected])

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm hover:text-primary"
      >
        <span className="flex items-center gap-2">
          {group.label}
          {hasSelected && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {selectedValues.length}
            </Badge>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="pb-2 space-y-1.5 max-h-52 overflow-auto pr-1">
          {group.values.map((v) => {
            const checked = selectedValues.includes(v.value)
            return (
              <label
                key={v.value}
                className={cn(
                  'flex items-center gap-2 text-xs cursor-pointer hover:text-primary',
                  checked && 'text-primary font-medium'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(v.value)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="flex-1 truncate" title={v.value}>{v.value}</span>
                <span className="text-muted-foreground">({v.count})</span>
              </label>
            )
          })}
          {hasSelected && (
            <button
              onClick={onClear}
              className="text-[11px] text-muted-foreground hover:text-destructive underline pt-1"
            >
              Bỏ chọn tất cả
            </button>
          )}
        </div>
      )}
    </div>
  )
}
