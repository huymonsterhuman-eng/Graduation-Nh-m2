import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { TipTapEditor } from '@/components/admin/common/TipTapEditor'
import { MultiImageUploader } from '@/components/admin/common/MultiImageUploader'
import { SpecFieldsInput } from '@/components/admin/common/SpecFieldsInput'
import {
  useAdminProductDetail, useCreateProduct, useUpdateProduct,
  type ProductInput, type ProductImageInput,
} from '@/hooks/api/useAdminProducts'
import { useAdminCategories, useAdminBrands } from '@/hooks/api/useAdminCatalog'
import { cn } from '@/lib/utils'
import { formatNumberInput, parseNumberInput } from '@/lib/format'

type FormState = Omit<ProductInput, 'specs'> & {
  specs: Record<string, unknown>
}

function emptyForm(): FormState {
  return {
    name: '', slug: '', sku: '', shortDescription: '', description: '',
    price: 0, salePrice: null, costPrice: null, brandId: null, categoryId: null,
    specs: {}, stock: 0, isFeatured: false, isActive: true, images: [],
  }
}

export function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const productId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const { data: detail, isLoading } = useAdminProductDetail(productId)
  const { data: categories } = useAdminCategories()
  const { data: brands } = useAdminBrands()

  const create = useCreateProduct()
  const update = useUpdateProduct()

  const [form, setForm] = useState<FormState>(emptyForm())

  // Load detail vào form khi edit
  useEffect(() => {
    if (!detail) return
    setForm({
      name: detail.name,
      slug: detail.slug,
      sku: detail.sku ?? '',
      shortDescription: detail.shortDescription ?? '',
      description: detail.description ?? '',
      price: Number(detail.price),
      salePrice: detail.salePrice != null ? Number(detail.salePrice) : null,
      costPrice: (detail as { costPrice?: number | null }).costPrice != null
        ? Number((detail as { costPrice?: number | null }).costPrice)
        : null,
      brandId: detail.brand?.id ?? null,
      categoryId: detail.category?.id ?? null,
      specs: (detail.specs as Record<string, unknown>) ?? {},
      stock: detail.stock,
      isFeatured: detail.isFeatured,
      isActive: detail.isActive,
      images: (detail.images ?? []).map((img) => ({
        path: img.path,
        alt: img.alt,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
    })
  }, [detail])

  const currentCategory = useMemo(
    () => (categories ?? []).find((c) => c.id === form.categoryId),
    [categories, form.categoryId]
  )
  const specTemplate = currentCategory?.specTemplate ?? []

  // Nhớ giá trị hợp lệ gần nhất — khi user gõ vượt Giá bán rồi blur, revert về đây.
  const lastValidSalePrice = useRef<number | null>(null)
  const lastValidCostPrice = useRef<number | null>(null)
  useEffect(() => {
    lastValidSalePrice.current = form.salePrice ?? null
    lastValidCostPrice.current = form.costPrice ?? null
  }, [detail?.id])

  const salePriceInvalid = form.salePrice != null && form.salePrice > form.price
  const costPriceInvalid = form.costPrice != null && form.costPrice > form.price

  const handlePriceChange = (raw: string) => {
    const n = parseNumberInput(raw) ?? 0
    setForm({ ...form, price: n })
  }

  const handleSalePriceChange = (raw: string) => {
    const n = parseNumberInput(raw)
    setForm({ ...form, salePrice: n })
    if (n == null || n <= form.price) lastValidSalePrice.current = n
  }

  const handleSalePriceBlur = () => {
    if (form.salePrice != null && form.salePrice > form.price) {
      toast.error('Giá khuyến mãi lớn hơn Giá bán — đã khôi phục giá trị trước.')
      setForm({ ...form, salePrice: lastValidSalePrice.current })
    }
  }

  const handleCostPriceChange = (raw: string) => {
    const n = parseNumberInput(raw)
    setForm({ ...form, costPrice: n })
    if (n == null || n <= form.price) lastValidCostPrice.current = n
  }

  const handleCostPriceBlur = () => {
    if (form.costPrice != null && form.costPrice > form.price) {
      toast.error('Giá vốn lớn hơn Giá bán — đã khôi phục giá trị trước.')
      setForm({ ...form, costPrice: lastValidCostPrice.current })
    }
  }

  const handleSubmit = async (afterSave: 'stay' | 'back') => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên sản phẩm'); return }
    if (form.price == null || Number(form.price) < 0) { toast.error('Giá không hợp lệ'); return }
    if (form.salePrice != null && Number(form.salePrice) > Number(form.price)) {
      toast.error('Giá khuyến mãi không được lớn hơn Giá bán'); return
    }
    if (form.costPrice != null && Number(form.costPrice) > Number(form.price)) {
      toast.error('Giá vốn không được lớn hơn Giá bán'); return
    }

    const body: ProductInput = {
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      price: Number(form.price),
      salePrice: form.salePrice != null && form.salePrice !== 0 ? Number(form.salePrice) : null,
      costPrice: form.costPrice != null && form.costPrice !== 0 ? Number(form.costPrice) : null,
      brandId: form.brandId ?? null,
      categoryId: form.categoryId ?? null,
      specs: Object.keys(form.specs).length > 0 ? form.specs : null,
      stock: form.stock ?? 0,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      images: form.images,
    }

    try {
      if (isEdit && productId) {
        await update.mutateAsync({ id: productId, body })
        toast.success('Đã cập nhật sản phẩm')
      } else {
        const created = await create.mutateAsync(body)
        toast.success('Đã tạo sản phẩm')
        if (afterSave === 'stay' && created?.id) {
          navigate(`/admin/san-pham/${created.id}/sua`, { replace: true })
          return
        }
      }
      if (afterSave === 'back') navigate('/admin/san-pham')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }


  if (isEdit && isLoading) {
    return <div className="grid place-items-center py-20 text-sm text-muted-foreground">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/san-pham"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <AdminPageHeader
          title={isEdit ? `Sửa: ${detail?.name || ''}` : 'Thêm sản phẩm mới'}
          sprint="Sprint 9D"
        />
        <div className="ml-auto flex items-center gap-2">
          {isEdit && (
            <span className="hidden items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary md:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              Chatbot AI tự cập nhật sau vài giây khi bấm Lưu
            </span>
          )}
          <Button variant="outline" onClick={() => handleSubmit('back')}
            disabled={create.isPending || update.isPending}>
            <Save className="mr-2 h-4 w-4" /> Lưu & quay lại
          </Button>
          <Button onClick={() => handleSubmit('stay')}
            disabled={create.isPending || update.isPending}>
            <Save className="mr-2 h-4 w-4" /> Lưu
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Tên sản phẩm *</Label>
                <Input id="name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (để trống sẽ tự sinh)</Label>
                <Input id="slug" className="font-mono text-sm" value={form.slug ?? ''}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" className="font-mono text-sm" value={form.sku ?? ''}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="short">Mô tả ngắn</Label>
                <textarea id="short" rows={2}
                  value={form.shortDescription ?? ''}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </Card>

          <Card className="space-y-2 p-4">
            <Label>Mô tả chi tiết</Label>
            <TipTapEditor
              value={form.description ?? ''}
              onChange={(html) => setForm({ ...form, description: html })}
              placeholder="Mô tả tính năng, ưu điểm, ai nên mua..."
              minHeight={220}
            />
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label>Thông số kỹ thuật</Label>
              {currentCategory ? (
                <Badge variant="outline">
                  Template: {currentCategory.name} ({specTemplate.length} field)
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Chưa chọn danh mục</Badge>
              )}
            </div>
            <SpecFieldsInput
              template={specTemplate}
              value={form.specs}
              onChange={(v) => setForm({ ...form, specs: v })}
            />
          </Card>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Giá & tồn kho</h3>
            <div className="space-y-2">
              <Label htmlFor="price">Giá bán (VND) *</Label>
              <Input id="price" type="text" inputMode="numeric"
                value={formatNumberInput(form.price)} required
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="VD: 1.000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">Giá khuyến mãi (VND)</Label>
              <Input id="sale" type="text" inputMode="numeric"
                value={formatNumberInput(form.salePrice ?? null)}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                onBlur={handleSalePriceBlur}
                placeholder="Để trống nếu không giảm"
                className={cn(salePriceInvalid && 'border-destructive focus-visible:ring-destructive')} />
              {salePriceInvalid && (
                <p className="text-xs text-destructive">
                  Vượt Giá bán — rời ô sẽ tự khôi phục giá trị hợp lệ trước đó.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Giá vốn cơ sở (VND)</Label>
              <Input id="cost" type="text" inputMode="numeric"
                value={formatNumberInput(form.costPrice ?? null)}
                onChange={(e) => handleCostPriceChange(e.target.value)}
                onBlur={handleCostPriceBlur}
                placeholder="Để trống nếu chưa xác định"
                className={cn(costPriceInvalid && 'border-destructive focus-visible:ring-destructive')} />
              {costPriceInvalid ? (
                <p className="text-xs text-destructive">
                  Vượt Giá bán — rời ô sẽ tự khôi phục giá trị hợp lệ trước đó.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ràng buộc: <b>Giá vốn ≤ Giá bán</b>. Mỗi lô nhập có giá riêng, phải ≤ giá bán.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock" className="flex items-center justify-between">
                Tồn kho hiện tại
                <Badge variant="outline" className="text-[10px]">Chỉ đọc</Badge>
              </Label>
              <Input id="stock" type="number"
                value={form.stock ?? 0}
                disabled readOnly
                className="cursor-not-allowed bg-muted/50" />
              <p className="text-xs text-muted-foreground">
                Tồn kho chỉ thay đổi qua <b>Phiếu nhập</b> / <b>Phiếu xuất</b> kho.
                SP mới tạo sẽ có tồn kho = 0.
              </p>
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Danh mục & Thương hiệu</h3>
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select
                value={form.categoryId == null ? 'NONE' : String(form.categoryId)}
                onValueChange={(v) => setForm({
                  ...form,
                  categoryId: v === 'NONE' ? null : Number(v),
                })}
              >
                <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="NONE">— Không chọn</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.parentId && '↳ '}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thương hiệu</Label>
              <Select
                value={form.brandId == null ? 'NONE' : String(form.brandId)}
                onValueChange={(v) => setForm({
                  ...form,
                  brandId: v === 'NONE' ? null : Number(v),
                })}
              >
                <SelectTrigger><SelectValue placeholder="Chọn brand" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="NONE">— Không chọn</SelectItem>
                  {(brands ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Trạng thái</h3>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <Label htmlFor="isActive" className="cursor-pointer">Đang bán</Label>
              <Switch id="isActive" checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <Label htmlFor="isFeatured" className="cursor-pointer">Sản phẩm nổi bật</Label>
              <Switch id="isFeatured" checked={form.isFeatured ?? false}
                onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
            </div>
          </Card>

          <Card className="p-4">
            <MultiImageUploader
              value={form.images ?? []}
              onChange={(imgs: ProductImageInput[]) => setForm({ ...form, images: imgs })}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
