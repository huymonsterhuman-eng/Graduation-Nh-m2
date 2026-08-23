import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { ProductDetail } from '@/types/api'
import { useCompareStore } from '@/stores/compare'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { SmartImage } from '@/components/common/SmartImage'
import { PriceTag } from '@/components/common/PriceTag'
import { Rating } from '@/components/common/Rating'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Scale } from 'lucide-react'
import { toast } from 'sonner'

export function ComparePage() {
  const items = useCompareStore((s) => s.items)
  const remove = useCompareStore((s) => s.remove)

  // Fetch full detail cho từng SP để có specs
  const queries = useQueries({
    queries: items.map((it) => ({
      queryKey: ['compare-product', it.id],
      queryFn: async () => {
        const { data } = await api.get<ApiResponse<ProductDetail>>(`/catalog/products/${it.slug}`)
        return data.data!
      },
      staleTime: 60_000,
    })),
  })

  const products = queries.map((q) => q.data).filter((p): p is ProductDetail => !!p)
  const isLoading = queries.some((q) => q.isLoading)

  // Tất cả keys specs xuất hiện — hiển thị union
  const specKeys = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.specs) Object.keys(p.specs).forEach((k) => set.add(k))
    })
    return Array.from(set)
  }, [products])

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <Scale className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Chưa có sản phẩm để so sánh</h1>
        <p className="text-muted-foreground">
          Nhấn nút so sánh trên các sản phẩm bạn quan tâm để thêm vào danh sách.
        </p>
        <Button asChild><Link to="/">Về trang chủ</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <Breadcrumb items={[{ label: 'So sánh sản phẩm' }]} />
      <h1 className="text-2xl font-bold mb-6">So sánh {items.length} sản phẩm</h1>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <tbody>
              {/* Row 1: ảnh + nút bỏ */}
              <tr>
                <td className="w-40 bg-muted/50 p-3"></td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3 align-top min-w-[220px]">
                    <div className="relative">
                      <button
                        onClick={() => { remove(p.id); toast.success('Đã bỏ khỏi so sánh') }}
                        className="absolute right-0 top-0 rounded-full bg-background border p-1 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Bỏ"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Link to={`/san-pham/${p.slug}`}>
                        <SmartImage
                          src={p.images?.[0]?.path}
                          alt={p.name}
                          className="h-32 w-full rounded object-cover"
                          usePicsum
                          seed={`p-${p.id}`}
                        />
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 2: tên */}
              <tr>
                <td className="bg-muted/50 p-3 text-sm font-medium">Sản phẩm</td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3 align-top">
                    <Link to={`/san-pham/${p.slug}`} className="font-medium text-sm hover:text-primary line-clamp-2">
                      {p.name}
                    </Link>
                    {p.brand && <p className="text-xs text-muted-foreground">{p.brand.name}</p>}
                  </td>
                ))}
              </tr>

              {/* Row 3: giá */}
              <tr>
                <td className="bg-muted/50 p-3 text-sm font-medium">Giá bán</td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3 align-top">
                    <PriceTag price={p.price} salePrice={p.salePrice} size="md" />
                  </td>
                ))}
              </tr>

              {/* Row 4: rating */}
              <tr>
                <td className="bg-muted/50 p-3 text-sm font-medium">Đánh giá</td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3 align-top">
                    <div className="flex items-center gap-2">
                      <Rating value={p.avgRating} showValue />
                      <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 5: stock */}
              <tr>
                <td className="bg-muted/50 p-3 text-sm font-medium">Tồn kho</td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3 align-top">
                    {p.stock > 0
                      ? <span className="text-sm text-emerald-600">Còn {p.stock}</span>
                      : <span className="text-sm text-destructive">Hết hàng</span>}
                  </td>
                ))}
              </tr>

              {/* Specs — union of all keys */}
              {specKeys.length > 0 && (
                <>
                  <tr>
                    <td colSpan={products.length + 1} className="bg-primary/10 p-3 text-sm font-semibold">
                      Thông số kỹ thuật
                    </td>
                  </tr>
                  {specKeys.map((key) => (
                    <tr key={key}>
                      <td className="bg-muted/50 p-3 text-sm font-medium capitalize">{key}</td>
                      {products.map((p) => (
                        <td key={p.id} className="border p-3 text-sm align-top">
                          {p.specs?.[key] != null ? String(p.specs[key]) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Row cuối: CTA mua */}
              <tr>
                <td className="bg-muted/50"></td>
                {products.map((p) => (
                  <td key={p.id} className="border p-3">
                    <Card>
                      <CardContent className="p-2">
                        <Button asChild size="sm" className="w-full">
                          <Link to={`/san-pham/${p.slug}`}>Xem chi tiết</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
