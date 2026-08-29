import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, Search as SearchIcon, X, Info, ChevronDown, Filter, Loader2 } from 'lucide-react'
import { useHybridSearch } from '@/hooks/api/useSearch'
import { useCategoriesFlat, useBrands, useSpecValues } from '@/hooks/api/useCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PriceTag } from '@/components/common/PriceTag'
import { SmartImage } from '@/components/common/SmartImage'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

function sanitizeDigits(v: string): string {
  return v.replace(/\D/g, '')
}
function formatThousands(v: string): string {
  return v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

/**
 * Trang Tìm kiếm — Hybrid Search.
 *
 * Chia sức lao động:
 *   - Sidebar filter cứng: danh mục / thương hiệu / khoảng giá / thông số  → SQL, chính xác 100%
 *   - Ô "Mô tả nhu cầu" (semantic query)                                    → AI rerank
 *
 * UX guidelines:
 *   - Radio option có dot indicator + background primary/10 khi selected → user thấy rõ chọn cái nào
 *   - Chip row "Đang lọc" trên grid → tổng hợp mọi filter active, X remove riêng lẻ
 *   - Loading spinner cạnh nút Filter trong sidebar khi fetch → phản hồi visual ngay
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const q = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined
  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : undefined
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''

  const [qDraft, setQDraft] = useState(q)
  useEffect(() => { setQDraft(q) }, [q])

  const [minDraft, setMinDraft] = useState(minPrice)
  const [maxDraft, setMaxDraft] = useState(maxPrice)
  const [priceError, setPriceError] = useState<string | undefined>()
  useEffect(() => {
    setMinDraft(minPrice); setMaxDraft(maxPrice); setPriceError(undefined)
  }, [minPrice, maxPrice])

  const { data: categoriesFlat } = useCategoriesFlat()
  const { data: brands } = useBrands()
  const { data: specGroups } = useSpecValues(categoryId ?? null)

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

  const specsSig = useMemo(
    () => Object.entries(specs).map(([k, vs]) => `${k}:${[...vs].sort().join(',')}`).sort().join('|'),
    [specs]
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSpecs = useMemo(() => specs, [specsSig])

  const { data: results, isLoading, isFetching, isError } = useHybridSearch({
    q: q || undefined,
    categoryId,
    brandId,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    specs: Object.keys(stableSpecs).length > 0 ? stableSpecs : undefined,
    limit: 24,
  })

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete(key); else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const submitQuery = () => {
    const clean = qDraft.trim()
    updateParam('q', clean || undefined)
  }

  const clearQuery = () => {
    setQDraft('')
    updateParam('q', undefined)
  }

  const applyPrice = () => {
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

  const clearPrice = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('minPrice')
    next.delete('maxPrice')
    setSearchParams(next, { replace: true })
  }

  const resetFilter = () => {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
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

  const activeSpecCount = Object.values(specs).reduce((sum, arr) => sum + arr.length, 0)

  const hasAnyInput =
    !!q || categoryId != null || brandId != null || !!minPrice || !!maxPrice || activeSpecCount > 0

  const hasSemantic = !!q.trim()

  // Lookup helpers cho chip label
  const selectedCategory = categoriesFlat?.find((c) => c.id === categoryId)
  const selectedBrand = brands?.find((b) => b.id === brandId)
  const specLabelMap = useMemo(() => {
    const m: Record<string, string> = {}
    specGroups?.forEach((g) => { m[g.key] = g.label })
    return m
  }, [specGroups])

  return (
    <div className="container py-6">
      <div className="mb-6 space-y-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-primary" />
          Tìm kiếm thông minh
        </h1>

        {/* Ô mô tả nhu cầu (semantic input) */}
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitQuery() }}
            placeholder="Mô tả nhu cầu của bạn — VD: laptop cho lập trình web, điện thoại chụp ảnh đẹp..."
            className="pl-9 pr-24 h-11 text-base"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {qDraft && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearQuery} aria-label="Xóa">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={submitQuery} className="h-8">
              Tìm
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Kết hợp <b>bộ lọc cứng</b> (danh mục / thương hiệu / khoảng giá / thông số) với <b>AI hiểu nhu cầu</b> mô tả tự nhiên.
            Kết quả xếp theo mức khớp — số % càng cao càng phù hợp.
          </span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* ==================== SIDEBAR ==================== */}
        <aside className="space-y-3">
          {/* Sticky "Bộ lọc" header với nút reset + loading spinner */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-primary" />
              <span>Bộ lọc</span>
              {isFetching && !isLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {hasAnyInput && (
              <button
                onClick={resetFilter}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <X className="h-3 w-3" />
                Xoá tất cả
              </button>
            )}
          </div>

          {/* Danh mục */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Danh mục</span>
                {selectedCategory && (
                  <span className="text-xs font-normal text-primary">
                    {selectedCategory.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 max-h-72 overflow-auto p-2">
              <RadioOption
                checked={categoryId == null}
                onClick={() => updateParam('categoryId', undefined)}
                label="Tất cả danh mục"
              />
              {categoriesFlat?.map((c) => (
                <RadioOption
                  key={c.id}
                  checked={categoryId === c.id}
                  onClick={() => updateParam('categoryId', String(c.id))}
                  label={c.name}
                  indent={c.parentId != null}
                />
              ))}
            </CardContent>
          </Card>

          {/* Thương hiệu */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Thương hiệu</span>
                {selectedBrand && (
                  <span className="text-xs font-normal text-primary">
                    {selectedBrand.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 max-h-72 overflow-auto p-2">
              <RadioOption
                checked={brandId == null}
                onClick={() => updateParam('brandId', undefined)}
                label="Tất cả thương hiệu"
              />
              {brands?.map((b) => (
                <RadioOption
                  key={b.id}
                  checked={brandId === b.id}
                  onClick={() => updateParam('brandId', String(b.id))}
                  label={b.name}
                />
              ))}
            </CardContent>
          </Card>

          {/* Khoảng giá */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Khoảng giá</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Từ (VND)</Label>
                  <Input
                    value={formatThousands(minDraft)}
                    onChange={(e) => { setMinDraft(sanitizeDigits(e.target.value)); setPriceError(undefined) }}
                    inputMode="numeric"
                    placeholder="0"
                    aria-invalid={!!priceError}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Đến (VND)</Label>
                  <Input
                    value={formatThousands(maxDraft)}
                    onChange={(e) => { setMaxDraft(sanitizeDigits(e.target.value)); setPriceError(undefined) }}
                    inputMode="numeric"
                    placeholder="∞"
                    aria-invalid={!!priceError}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              {priceError && <p className="text-xs text-destructive">{priceError}</p>}
              {!priceError && (minDraft || maxDraft) && (
                <p className="text-[11px] text-muted-foreground">
                  {minDraft && `Từ ${formatPrice(Number(minDraft))}`}
                  {minDraft && maxDraft && ' — '}
                  {maxDraft && `Đến ${formatPrice(Number(maxDraft))}`}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={applyPrice}>Áp dụng</Button>
                {(minPrice || maxPrice) && (
                  <Button size="sm" variant="outline" onClick={clearPrice}>Xoá</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thông số kỹ thuật — chỉ khi có Danh mục */}
          {categoryId != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Thông số kỹ thuật</span>
                  {activeSpecCount > 0 && (
                    <Badge className="text-[10px] h-4 px-1.5">{activeSpecCount}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {!specGroups || specGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 px-1">
                    Danh mục này chưa có thông số để lọc.
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
          )}
        </aside>

        {/* ==================== RESULT AREA ==================== */}
        <div>
          {/* Chip row "Đang lọc" — hiển thị mọi filter active để user thấy state tổng */}
          {hasAnyInput && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Đang lọc:</span>
              {q && <FilterChip label={`"${q}"`} onRemove={clearQuery} tone="primary" />}
              {selectedCategory && (
                <FilterChip
                  label={`Danh mục: ${selectedCategory.name}`}
                  onRemove={() => updateParam('categoryId', undefined)}
                />
              )}
              {selectedBrand && (
                <FilterChip
                  label={`Thương hiệu: ${selectedBrand.name}`}
                  onRemove={() => updateParam('brandId', undefined)}
                />
              )}
              {(minPrice || maxPrice) && (
                <FilterChip
                  label={
                    'Giá: ' +
                    (minPrice ? formatPrice(Number(minPrice)) : '0') +
                    ' — ' +
                    (maxPrice ? formatPrice(Number(maxPrice)) : '∞')
                  }
                  onRemove={clearPrice}
                />
              )}
              {Object.entries(specs).flatMap(([k, vs]) =>
                vs.map((v) => (
                  <FilterChip
                    key={`${k}:${v}`}
                    label={`${specLabelMap[k] || k}: ${v}`}
                    onRemove={() => toggleSpec(k, v)}
                  />
                ))
              )}
            </div>
          )}

          {!hasAnyInput ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Sparkles className="h-10 w-10 mx-auto text-primary/50" />
                <p className="text-sm text-muted-foreground">
                  Nhập mô tả nhu cầu ở ô trên, hoặc chọn danh mục / thương hiệu / khoảng giá / thông số kỹ thuật từ sidebar để bắt đầu tìm.
                </p>
                <p className="text-xs text-muted-foreground">
                  Ví dụ: <i>"laptop cho lập trình dưới 20 triệu"</i> — kết hợp lọc giá và mô tả để có kết quả chính xác nhất.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {results?.length ?? 0} kết quả
                  {hasSemantic ? ' — xếp theo mức khớp AI' : ' — xếp theo lượt xem'}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-lg" />
                  ))}
                </div>
              ) : isError ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Có lỗi khi tìm kiếm. Vui lòng thử lại.
                </p>
              ) : !results || results.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Không tìm thấy sản phẩm nào khớp. Thử nới bộ lọc hoặc đổi cách mô tả.
                </p>
              ) : (
                <div className={cn(
                  'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 transition-opacity',
                  isFetching && 'opacity-70'
                )}>
                  {results.map((r) => {
                    const p = r.product
                    return (
                      <Link key={p.id} to={`/san-pham/${p.slug}`}>
                        <Card className="group h-full overflow-hidden transition hover:shadow-md">
                          <div className="relative aspect-square overflow-hidden bg-muted">
                            <SmartImage
                              src={p.primaryImage}
                              alt={p.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              usePicsum
                              seed={`p-${p.id}`}
                            />
                            {hasSemantic && r.similarity > 0 && (
                              <span className="absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur">
                                {(r.similarity * 100).toFixed(0)}% khớp
                              </span>
                            )}
                          </div>
                          <CardContent className="p-3 space-y-2">
                            {p.brandName && (
                              <div className="text-xs text-muted-foreground">{p.brandName}</div>
                            )}
                            <h3 className="line-clamp-2 h-10 text-sm font-medium leading-5">{p.name}</h3>
                            <PriceTag price={p.price} salePrice={p.salePrice} size="sm" showDiscount={false} />
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Radio option với dot indicator + background primary khi selected.
 * Dùng cho Danh mục và Thương hiệu — single-select rõ ràng.
 */
function RadioOption({
  checked,
  onClick,
  label,
  indent,
}: {
  checked: boolean
  onClick: () => void
  label: string
  indent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition',
        checked
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-foreground hover:bg-muted',
        indent && 'pl-6'
      )}
    >
      <span
        className={cn(
          'h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center transition',
          checked ? 'border-primary' : 'border-muted-foreground/40'
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

/**
 * Chip filter đang active — click X để xoá filter đó riêng lẻ.
 */
function FilterChip({
  label,
  onRemove,
  tone,
}: {
  label: string
  onRemove: () => void
  tone?: 'primary' | 'default'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-xs',
        tone === 'primary'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground'
      )}
    >
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Xoá ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/**
 * Accordion 1 nhóm spec — checkbox multi-select với count + auto mở khi có value chọn.
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
        className="flex w-full items-center justify-between py-2 px-1 text-sm hover:text-primary"
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
        <div className="pb-2 px-1 space-y-1.5 max-h-52 overflow-auto pr-1">
          {group.values.map((v) => {
            const checked = selectedValues.includes(v.value)
            return (
              <label
                key={v.value}
                className={cn(
                  'flex items-center gap-2 text-xs cursor-pointer hover:text-primary py-0.5',
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
