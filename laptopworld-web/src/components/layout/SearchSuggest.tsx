import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, TrendingUp, FileText, Sparkles } from 'lucide-react'
import { useProducts } from '@/hooks/api/useProducts'
import { usePosts } from '@/hooks/api/useBlog'
import { SmartImage } from '@/components/common/SmartImage'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Ô tìm kiếm ở Header với dropdown gợi ý — kiểu Tiki/TGDĐ.
 * - Gõ ≥ 2 ký tự sau 300ms → gọi 2 endpoint public:
 *   • /api/catalog/products?keyword — 5 SP top match.
 *   • /api/blog/posts?keyword — 3 bài blog.
 * - Suggestion từ khoá derived từ 4 tên SP đầu (cắt 4 từ đầu, dedupe).
 * - Enter → điều hướng /tim-kiem?q=X.
 * - Click ngoài / Esc → đóng.
 */
export function SearchSuggest() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword.trim()), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const enabled = debounced.length >= 2 && open

  const { data: prodPage, isLoading: prodLoading } = useProducts({
    keyword: enabled ? debounced : undefined,
    size: 5,
    sort: 'views,desc',
  })
  const { data: postPage } = usePosts({
    keyword: enabled ? debounced : undefined,
    size: 3,
  })

  const products = enabled ? prodPage?.content ?? [] : []
  const posts = enabled ? postPage?.content ?? [] : []

  // Derive keyword suggestions từ tên SP: lấy 4-5 SP đầu, cắt 4 từ đầu tên, dedupe
  const keywordSuggests = deriveKeywordSuggestions(products.map((p) => p.name), debounced)

  // Click ngoài → đóng
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const goSearch = (q?: string) => {
    const term = (q ?? keyword).trim()
    if (!term) return
    setOpen(false)
    navigate(`/tim-kiem?q=${encodeURIComponent(term)}`)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    goSearch()
  }

  const showDropdown =
    open &&
    debounced.length >= 2 &&
    (prodLoading || products.length > 0 || posts.length > 0 || keywordSuggests.length > 0)

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={onSubmit}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
            placeholder="Tìm laptop, điện thoại, phụ kiện..."
            className="h-10 w-full rounded-md border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => { setKeyword(''); setDebounced(''); setOpen(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Xoá"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[600px] overflow-y-auto rounded-lg border bg-popover shadow-2xl">
          {/* Keyword suggestions */}
          {keywordSuggests.length > 0 && (
            <div>
              <SectionHeader icon={<Sparkles className="h-4 w-4 text-primary" />}>
                Có phải bạn muốn tìm
              </SectionHeader>
              <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                {keywordSuggests.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => goSearch(s)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {(prodLoading || products.length > 0) && (
            <div className="border-t">
              <SectionHeader icon={<TrendingUp className="h-4 w-4 text-orange-500" />}>
                Sản phẩm gợi ý
              </SectionHeader>
              <div className="divide-y">
                {prodLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))
                ) : (
                  products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setOpen(false); navigate(`/san-pham/${p.slug}`) }}
                      className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                        <SmartImage
                          src={p.primaryImage}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          usePicsum
                          seed={`p-${p.id}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-primary">
                            {formatPrice(p.salePrice ?? p.price)}
                          </span>
                          {p.salePrice != null && p.salePrice < p.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(p.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Blog posts */}
          {posts.length > 0 && (
            <div className="border-t">
              <SectionHeader icon={<FileText className="h-4 w-4 text-sky-500" />}>
                Thông tin liên quan
              </SectionHeader>
              <div className="p-2 space-y-1">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => { setOpen(false); navigate(`/tin-tuc/${post.slug}`) }}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-1 text-sm">{post.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer: xem tất cả */}
          <div className={cn('border-t bg-muted/30 p-2 text-center', products.length === 0 && !prodLoading && 'py-3')}>
            {products.length === 0 && !prodLoading ? (
              <p className="text-xs text-muted-foreground">
                Không tìm thấy sản phẩm khớp với "<b>{debounced}</b>"
              </p>
            ) : (
              <button
                type="button"
                onClick={() => goSearch()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Xem tất cả kết quả cho "{debounced}" →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  )
}

/**
 * Derive gợi ý từ khoá từ tên SP: lấy 4-5 tên SP đầu, cắt 4-5 từ đầu, dedupe (case-insensitive).
 * VD: ["Laptop ASUS Vivobook 14 X1407", "Laptop ASUS Zenbook 14"] → ["Laptop ASUS Vivobook 14", "Laptop ASUS Zenbook 14"]
 */
function deriveKeywordSuggestions(names: string[], q: string): string[] {
  if (!q || names.length === 0) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names.slice(0, 6)) {
    const parts = name.trim().split(/\s+/).slice(0, 4).join(' ')
    const key = parts.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(parts)
      if (out.length >= 5) break
    }
  }
  return out
}
