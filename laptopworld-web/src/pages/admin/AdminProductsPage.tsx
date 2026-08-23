import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package, Plus, Pencil, Trash2, Search, Sparkles, Undo2, Filter as FilterIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { productImageSrc, formatPrice } from '@/lib/format'
import { useAdminCategories, useAdminBrands } from '@/hooks/api/useAdminCatalog'
import {
  useAdminProducts, useDeletedProducts, useDeleteProduct,
  useRestoreProduct, useReembedProduct, useToggleProductActive,
  type StockStatus,
} from '@/hooks/api/useAdminProducts'
import { Switch } from '@/components/ui/switch'
import type { ProductListItem } from '@/types/api'

const STOCK_LABEL: Record<StockStatus, string> = {
  ALL: 'Tất cả',
  IN_STOCK: 'Còn hàng (>0)',
  LOW_STOCK: 'Thấp (5-10)',
  CRITICAL_STOCK: 'Cảnh báo (1-4)',
  OUT_OF_STOCK: 'Hết hàng (=0)',
}

function stockBadge(stock: number) {
  if (stock <= 0) return { label: 'Hết hàng', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' }
  if (stock <= 4) return { label: `${stock}`,   className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' }
  if (stock <= 10) return { label: `${stock}`,  className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' }
  return { label: `${stock}`, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
}

export function AdminProductsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'deleted'>('active')

  // Filters
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('ALL')
  const [brandId, setBrandId] = useState<string>('ALL')
  const [active, setActive] = useState<string>('ALL')  // ALL / true / false
  const [stockStatus, setStockStatus] = useState<StockStatus>('ALL')
  const [page, setPage] = useState(0)

  const filter = useMemo(() => ({
    keyword: keyword || undefined,
    categoryId: categoryId === 'ALL' ? null : Number(categoryId),
    brandId: brandId === 'ALL' ? null : Number(brandId),
    isActive: active === 'ALL' ? null : active === 'true',
    stockStatus,
    page,
    size: 20,
  }), [keyword, categoryId, brandId, active, stockStatus, page])

  const { data: paged, isLoading } = useAdminProducts(filter)
  const { data: deleted, isLoading: dLoading } = useDeletedProducts(tab === 'deleted')
  const { data: categories } = useAdminCategories()
  const { data: brands } = useAdminBrands()

  const deleteProduct = useDeleteProduct()
  const restoreProduct = useRestoreProduct()
  const reembed = useReembedProduct()
  const toggleActive = useToggleProductActive()

  const handleToggleActive = async (p: ProductListItem, next: boolean) => {
    try {
      await toggleActive.mutateAsync({ id: p.id, isActive: next })
      toast.success(next ? `Đã bật kinh doanh "${p.name}"` : `Đã ngừng bán "${p.name}"`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (p: ProductListItem) => {
    try {
      await deleteProduct.mutateAsync(p.id)
      toast.success('Đã xóa sản phẩm')
    } catch (e) { toast.error((e as Error).message) }
  }
  const handleRestore = async (p: ProductListItem) => {
    try {
      await restoreProduct.mutateAsync(p.id)
      toast.success('Đã khôi phục sản phẩm')
    } catch (e) { toast.error((e as Error).message) }
  }
  const handleReembed = async (p: ProductListItem) => {
    try {
      const r = await reembed.mutateAsync(p.id)
      toast.success(`Đã re-embed "${r?.productName}" (${r?.durationMs}ms)`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const activeCols: AdminColumn<ProductListItem>[] = [
    {
      key: 'image', header: '', className: 'w-14',
      cell: (p) => (
        <img src={productImageSrc(p.primaryImage)} alt={p.name}
          className="h-10 w-10 rounded border object-cover" />
      ),
    },
    {
      key: 'name', header: 'Tên sản phẩm',
      cell: (p) => (
        <div className="min-w-0">
          <Link to={`/admin/san-pham/${p.id}/sua`} className="line-clamp-1 font-medium hover:text-primary">
            {p.name}
          </Link>
          <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
        </div>
      ),
    },
    {
      key: 'category', header: 'Danh mục / Brand',
      cell: (p) => (
        <div className="space-y-0.5 text-sm">
          <div>{p.categoryName || '—'}</div>
          <div className="text-xs text-muted-foreground">{p.brandName || '—'}</div>
        </div>
      ),
    },
    {
      key: 'price', header: 'Giá', align: 'right',
      cell: (p) => (
        <div>
          {p.salePrice != null && p.salePrice < p.price ? (
            <>
              <div className="text-sm font-semibold text-rose-600">{formatPrice(p.salePrice)}</div>
              <div className="text-xs text-muted-foreground line-through">{formatPrice(p.price)}</div>
            </>
          ) : (
            <div className="text-sm font-semibold">{formatPrice(p.price)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'stock', header: 'Kho', align: 'center', className: 'w-20',
      cell: (p) => {
        const b = stockBadge(p.stock)
        return <Badge className={b.className}>{b.label}</Badge>
      },
    },
    {
      key: 'rating', header: 'Rating', align: 'center', className: 'w-24',
      cell: (p) => p.reviewCount > 0
        ? <span className="text-xs">★ {Number(p.avgRating).toFixed(1)} ({p.reviewCount})</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'active', header: 'Kinh doanh', align: 'center', className: 'w-28',
      cell: (p) => (
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={p.isActive}
            disabled={toggleActive.isPending}
            onCheckedChange={(v) => handleToggleActive(p, v)}
            aria-label={p.isActive ? 'Đang bán — bấm để ngừng' : 'Ngừng bán — bấm để bật lại'}
          />
          <span className={`text-[10px] font-medium ${
            p.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          }`}>
            {p.isActive ? 'Đang bán' : 'Ngừng bán'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-40',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleReembed(p)}
            disabled={reembed.isPending} title="Re-embed AI">
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" asChild title="Sửa">
            <Link to={`/admin/san-pham/${p.id}/sua`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa sản phẩm?"
            description={<>Xóa mềm <b>{p.name}</b>. Có thể khôi phục ở tab "Đã xóa". Nếu SP còn tồn kho hoặc đã có trong đơn/phiếu, thao tác sẽ bị chặn.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(p)}
          />
        </div>
      ),
    },
  ]

  const deletedCols: AdminColumn<ProductListItem>[] = [
    {
      key: 'image', header: '', className: 'w-14',
      cell: (p) => (
        <img src={productImageSrc(p.primaryImage)} alt={p.name}
          className="h-10 w-10 rounded border object-cover opacity-60" />
      ),
    },
    {
      key: 'name', header: 'Tên sản phẩm',
      cell: (p) => (
        <div className="min-w-0">
          <div className="line-clamp-1 font-medium text-muted-foreground line-through">{p.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
        </div>
      ),
    },
    { key: 'category', header: 'Danh mục',
      cell: (p) => <span className="text-sm text-muted-foreground">{p.categoryName || '—'}</span>,
    },
    { key: 'brand', header: 'Brand',
      cell: (p) => <span className="text-sm text-muted-foreground">{p.brandName || '—'}</span>,
    },
    { key: 'price', header: 'Giá', align: 'right',
      cell: (p) => <span className="text-sm text-muted-foreground">{formatPrice(p.price)}</span>,
    },
    { key: 'actions', header: 'Thao tác', align: 'right', className: 'w-32',
      cell: (p) => (
        <Button variant="outline" size="sm" onClick={() => handleRestore(p)}
          disabled={restoreProduct.isPending}>
          <Undo2 className="mr-2 h-3 w-3" /> Khôi phục
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Sản phẩm"
        icon={Package}
        sprint="Sprint 9D"
        description={`${paged?.totalElements ?? 0} SP đang bán · ${deleted?.length ?? 0} đã xóa`}
        actions={
          <Button onClick={() => navigate('/admin/san-pham/moi')}>
            <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'deleted')}>
        <TabsList>
          <TabsTrigger value="active">Đang bán ({paged?.totalElements ?? 0})</TabsTrigger>
          <TabsTrigger value="deleted">Đã xóa ({deleted?.length ?? 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'active' && (
        <>
          <Card className="grid gap-3 p-3 md:grid-cols-[1fr_180px_180px_140px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên / SKU / mô tả..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
                className="pl-9"
              />
            </div>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="Danh mục" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.parentId && '↳ '}{c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandId} onValueChange={(v) => { setBrandId(v); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="ALL">Tất cả brand</SelectItem>
                {(brands ?? []).map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={active} onValueChange={(v) => { setActive(v); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Cả bán + ngừng</SelectItem>
                <SelectItem value="true">Đang bán</SelectItem>
                <SelectItem value="false">Ngừng bán</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockStatus} onValueChange={(v) => { setStockStatus(v as StockStatus); setPage(0) }}>
              <SelectTrigger><SelectValue placeholder="Tồn kho" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STOCK_LABEL) as StockStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STOCK_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          <AdminTable<ProductListItem>
            columns={activeCols}
            data={paged?.content}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            emptyMessage="Không có sản phẩm nào khớp bộ lọc"
          />

          {/* Pagination */}
          {paged && paged.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Trang <b>{page + 1}</b> / {paged.totalPages} · Tổng {paged.totalElements} SP
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"
                  disabled={!paged.hasPrevious}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >Trước</Button>
                <Button variant="outline" size="sm"
                  disabled={!paged.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >Sau</Button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'deleted' && (
        <AdminTable<ProductListItem>
          columns={deletedCols}
          data={deleted}
          rowKey={(p) => p.id}
          isLoading={dLoading}
          emptyMessage="Không có sản phẩm đã xóa nào"
          toolbar={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FilterIcon className="h-4 w-4" />
              Danh sách SP soft-delete. Khôi phục để đưa về trạng thái Ngừng bán.
            </div>
          }
        />
      )}
    </div>
  )
}
