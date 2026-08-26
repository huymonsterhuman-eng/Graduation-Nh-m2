import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, Pencil, Trash2, Search, Package, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import { ImageCropperDialog } from '@/components/admin/common/ImageCropperDialog'
import { productImageSrc, formatPrice } from '@/lib/format'
import {
  useAdminCollections, useCreateCollection, useUpdateCollection, useDeleteCollection,
  useCollectionProducts, useAddProductsToCollection, useRemoveProductFromCollection,
  type CollectionInput,
} from '@/hooks/api/useAdminCatalog'
import { useAdminProducts } from '@/hooks/api/useAdminProducts'
import { useCategoriesFlat, useBrands } from '@/hooks/api/useCategories'
import type { Collection } from '@/types/api'

type FormState = CollectionInput

const HOME_POSITION_LABEL: Record<NonNullable<CollectionInput['homePosition']>, string> = {
  NONE: 'Không gán chip',
  PHONE_CHIP: 'Chip Điện thoại',
  LAPTOP_CHIP: 'Chip Laptop',
}

const HOME_POSITION_BADGE: Record<NonNullable<CollectionInput['homePosition']>, string> = {
  NONE: 'bg-muted text-muted-foreground',
  PHONE_CHIP: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  LAPTOP_CHIP: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

function emptyForm(): FormState {
  return {
    name: '', slug: '', image: null, description: '',
    parentId: null, isActive: true,
    homePosition: 'NONE', isFeatured: false,
    sortOrder: 0,
  }
}

export function AdminCollectionsPage() {
  const { data, isLoading } = useAdminCollections()
  const create = useCreateCollection()
  const update = useUpdateCollection()
  const remove = useDeleteCollection()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Collection | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [keyword, setKeyword] = useState('')

  const [productManager, setProductManager] = useState<Collection | null>(null)

  // Cropper — aspect 1:2 (portrait dài) khớp cột ảnh CollectionsSection stretched (~240×500px)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('')
  const openCropper = (imagePath: string) => {
    if (!imagePath) return
    setCropperImageSrc(productImageSrc(imagePath))
    setCropperOpen(true)
  }
  const handleImageUploaded = (path: string | null) => {
    setForm((f) => ({ ...f, image: path }))
    if (path) setTimeout(() => openCropper(path), 100)
  }

  const filtered = useMemo(() => {
    if (!data) return []
    if (!keyword) return data
    const kw = keyword.toLowerCase()
    return data.filter((c) =>
      c.name.toLowerCase().includes(kw) || c.slug.toLowerCase().includes(kw)
    )
  }, [data, keyword])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }
  const openEdit = (c: Collection) => {
    setEditing(c)
    setForm({
      name: c.name, slug: c.slug, image: c.image ?? null,
      description: c.description ?? '',
      parentId: c.parentId ?? null,
      isActive: c.isActive,
      homePosition: c.homePosition, isFeatured: c.isFeatured,
      sortOrder: c.sortOrder,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) { toast.error('Vui lòng nhập tên'); return }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật bộ sưu tập')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã thêm bộ sưu tập')
      }
      setDialogOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleDelete = async (c: Collection) => {
    try {
      await remove.mutateAsync(c.id)
      toast.success('Đã xóa bộ sưu tập')
    } catch (e) { toast.error((e as Error).message) }
  }

  const columns: AdminColumn<Collection>[] = [
    {
      key: 'image', header: '', className: 'w-14',
      cell: (c) => c.image ? (
        <img src={productImageSrc(c.image)} alt={c.name} className="h-10 w-10 rounded border object-cover" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded border text-lg">🗂</div>
      ),
    },
    {
      key: 'name', header: 'Tên',
      cell: (c) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{c.slug}</div>
        </div>
      ),
    },
    {
      key: 'products', header: 'SP', align: 'center',
      cell: (c) => (
        <Button
          variant="outline" size="sm" className="h-7 px-2 text-xs"
          onClick={() => setProductManager(c)}
        >
          <Package className="mr-1 h-3 w-3" /> {c.productCount ?? 0} SP
        </Button>
      ),
    },
    {
      key: 'home', header: 'Vị trí trên trang chủ', align: 'center',
      cell: (c) => (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Badge className={HOME_POSITION_BADGE[c.homePosition]}>
            {HOME_POSITION_LABEL[c.homePosition]}
          </Badge>
          {c.isFeatured && (
            <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 gap-1">
              <Sparkles className="h-3 w-3" /> Nổi bật
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'sort', header: 'Sort', align: 'center', className: 'w-16',
      cell: (c) => <span className="font-mono text-xs">{c.sortOrder}</span>,
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center',
      cell: (c) => (
        <Badge variant={c.isActive ? 'default' : 'secondary'}>
          {c.isActive ? 'Hoạt động' : 'Ẩn'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-32',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" title="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            title="Xóa bộ sưu tập?"
            description={<>Xóa <b>{c.name}</b>. Sản phẩm không bị ảnh hưởng, chỉ mất liên kết với bộ sưu tập.</>}
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(c)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Bộ sưu tập"
        icon={Layers}
        sprint="Sprint 9C"
        description="Nhóm SP để hiển thị theo chủ đề. Chọn 'Vị trí trên trang chủ' để show ở section tương ứng (Bộ sưu tập nổi bật / chip Điện thoại / chip Laptop)."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Thêm bộ sưu tập
          </Button>
        }
      />

      <AdminTable<Collection>
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={keyword ? `Không tìm thấy collection khớp "${keyword}"` : 'Chưa có bộ sưu tập nào'}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc slug..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      />

      {/* Create/Edit dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Sửa bộ sưu tập: ${editing.name}` : 'Thêm bộ sưu tập'}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tên *</Label>
            <Input id="name" autoFocus value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (để trống sẽ tự sinh)</Label>
            <Input id="slug" className="font-mono" placeholder="flash-sale"
              value={form.slug ?? ''}
              onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Mô tả</Label>
          <textarea id="desc" rows={2}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-2">
          <MediaUploader
            label="Ảnh cover (aspect 1:2)"
            folder="collections"
            value={form.image}
            onChange={handleImageUploaded}
          />
          {form.image && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => openCropper(form.image!)}>
              Cắt lại ảnh (1:2)
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            Ảnh sẽ được crop tỷ lệ 1:2 (portrait dài) để khớp khung cột ảnh
            trong section "Bộ sưu tập nổi bật" ~240×500px trên trang chủ.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sort">Thứ tự sắp xếp</Label>
            <Input id="sort" type="number" min={0} value={form.sortOrder ?? 0}
              onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Number(e.target.value) || 0) })} />
            <p className="text-[11px] text-muted-foreground">
              Số nhỏ hiện trước. Áp dụng trong cùng vị trí.
            </p>
          </div>
          <div className="col-span-2 space-y-3">
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Switch id="isActive" checked={form.isActive ?? true}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label htmlFor="isActive" className="cursor-pointer">Hoạt động</Label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-11">
                Công tắc tổng. Tắt → collection ẩn khỏi mọi nơi (menu, banner, link direct, homepage).
              </p>
            </div>
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
              <Label htmlFor="homePosition">Chip trên trang chủ</Label>
              <Select
                value={form.homePosition ?? 'NONE'}
                onValueChange={(v) => setForm({ ...form, homePosition: v as FormState['homePosition'] })}
              >
                <SelectTrigger id="homePosition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Không gán chip</SelectItem>
                  <SelectItem value="PHONE_CHIP">Chip trong section Điện thoại</SelectItem>
                  <SelectItem value="LAPTOP_CHIP">Chip trong section Laptop</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Xuất hiện thành chip filter trong section tương ứng.
                Nhiều collection cùng chip — sắp xếp bằng "Thứ tự".
              </p>
            </div>
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Switch id="isFeatured" checked={form.isFeatured ?? false}
                  onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
                <Label htmlFor="isFeatured" className="cursor-pointer flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                  Bộ sưu tập nổi bật
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-11">
                Bật → hiện trong section "Bộ sưu tập nổi bật" trên trang chủ.
                Độc lập với chip — 1 collection có thể vừa là chip Laptop vừa là nổi bật.
              </p>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Product manager dialog */}
      {productManager && (
        <CollectionProductManager
          collection={productManager}
          onClose={() => setProductManager(null)}
        />
      )}

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        aspect={1 / 2}
        folder="collections"
        onSaved={(newPath) => setForm((f) => ({ ...f, image: newPath }))}
      />
    </div>
  )
}

// ==================== Product Manager Dialog ====================

function CollectionProductManager({
  collection, onClose,
}: { collection: Collection; onClose: () => void }) {
  const { data: currentProducts, isLoading: cpLoading } =
    useCollectionProducts(collection.id, true)

  // Filter state cho panel bên phải
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [brandId, setBrandId] = useState<number | undefined>()
  const [page, setPage] = useState(0)

  // Reset trang khi filter đổi
  useEffect(() => { setPage(0) }, [keyword, categoryId, brandId])

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const clearSelected = () => setSelectedIds(new Set())

  const { data: categories } = useCategoriesFlat()
  const { data: brands } = useBrands()
  const { data: pageData, isFetching } = useAdminProducts({
    keyword: keyword || undefined,
    categoryId,
    brandId,
    isActive: true,
    page,
    size: 20,
  })

  const addProducts = useAddProductsToCollection()
  const removeProduct = useRemoveProductFromCollection()

  const currentIds = new Set((currentProducts ?? []).map((p) => p.id))

  const handleAddSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      await addProducts.mutateAsync({ id: collection.id, productIds: ids })
      toast.success(`Đã thêm ${ids.length} sản phẩm`)
      clearSelected()
    } catch (e) { toast.error((e as Error).message) }
  }
  const handleRemove = async (productId: number) => {
    try {
      await removeProduct.mutateAsync({ id: collection.id, productId })
      toast.success('Đã xóa sản phẩm')
    } catch (e) { toast.error((e as Error).message) }
  }
  const resetFilter = () => {
    setKeyword(''); setCategoryId(undefined); setBrandId(undefined); setPage(0)
  }

  const products = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Quản lý sản phẩm — {collection.name}</DialogTitle>
          <DialogDescription>
            {(currentProducts?.length ?? 0)} sản phẩm trong bộ sưu tập.
            Chọn nhiều SP ở panel bên phải rồi bấm "Thêm N sản phẩm đã chọn".
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Current products */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Đang có trong bộ sưu tập</div>
              <Badge variant="outline">{currentProducts?.length ?? 0} SP</Badge>
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border" style={{ maxHeight: '60vh' }}>
              {cpLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
              ) : (currentProducts ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Chưa có SP nào. Chọn SP ở panel bên phải để thêm.
                </div>
              ) : (
                <ul className="divide-y">
                  {currentProducts!.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 p-2">
                      <img src={productImageSrc(p.primaryImage)} alt={p.name}
                        className="h-10 w-10 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{formatPrice(p.price)}</div>
                      </div>
                      <Button variant="ghost" size="icon"
                        onClick={() => handleRemove(p.id)} title="Xóa khỏi bộ sưu tập">
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Filter + multi-select add */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Thêm sản phẩm vào bộ sưu tập</div>
              <div className="text-xs text-muted-foreground">
                {totalElements} SP khớp lọc • Trang {page + 1}/{Math.max(totalPages, 1)}
              </div>
            </div>

            {/* Filter row */}
            <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên SP..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={categoryId?.toString() ?? '__all__'}
                onValueChange={(v) => setCategoryId(v === '__all__' ? undefined : Number(v))}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Mọi danh mục</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={brandId?.toString() ?? '__all__'}
                onValueChange={(v) => setBrandId(v === '__all__' ? undefined : Number(v))}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Thương hiệu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Mọi thương hiệu</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={resetFilter} className="h-9">
                Xóa lọc
              </Button>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto rounded-md border" style={{ maxHeight: '48vh' }}>
              {isFetching && products.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Đang tải...</div>
              ) : products.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Không có SP nào khớp lọc.
                </div>
              ) : (
                <ul className="divide-y">
                  {products.map((p) => {
                    const already = currentIds.has(p.id)
                    const checked = selectedIds.has(p.id)
                    return (
                      <li key={p.id}
                        className={`flex items-center gap-3 p-2 transition ${already ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                          checked={checked && !already}
                          disabled={already}
                          onChange={() => toggleSelect(p.id)}
                        />
                        <img src={productImageSrc(p.primaryImage)} alt={p.name}
                          className="h-10 w-10 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(p.price)}
                            {p.brandName && <> • {p.brandName}</>}
                          </div>
                        </div>
                        {already && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">Đã có</Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Pagination + add bar */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2"
                  disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  ← Trước
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2"
                  disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sau →
                </Button>
              </div>
              <Button
                onClick={handleAddSelected}
                disabled={selectedIds.size === 0 || addProducts.isPending}
                className="h-8"
              >
                <Plus className="mr-1 h-4 w-4" />
                Thêm {selectedIds.size} sản phẩm đã chọn
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
