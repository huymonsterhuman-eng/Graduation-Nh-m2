import { useState, useMemo } from 'react'
import { Layers, Plus, Pencil, Trash2, Search, Package, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { FormDialog } from '@/components/admin/common/FormDialog'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { MediaUploader } from '@/components/admin/common/MediaUploader'
import { productImageSrc, formatPrice } from '@/lib/format'
import {
  useAdminCollections, useCreateCollection, useUpdateCollection, useDeleteCollection,
  useCollectionProducts, useAddProductsToCollection, useRemoveProductFromCollection,
  useProductSearch,
  type CollectionInput,
} from '@/hooks/api/useAdminCatalog'
import type { Collection } from '@/types/api'

type FormState = CollectionInput

function emptyForm(): FormState {
  return {
    name: '', slug: '', image: null, description: '',
    parentId: null, isActive: true, showOnHome: false, sortOrder: 0,
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
      isActive: c.isActive, showOnHome: c.showOnHome, sortOrder: c.sortOrder,
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
      key: 'home', header: 'Trang chủ', align: 'center',
      cell: (c) => c.showOnHome
        ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Có</Badge>
        : <Badge variant="outline">Không</Badge>,
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
        description="Nhóm SP để hiển thị theo chủ đề (Flash sale, SP nổi bật, Combo...). Bật 'Trang chủ' để show trên homepage."
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
        <MediaUploader
          label="Ảnh cover"
          folder="collections"
          value={form.image}
          onChange={(p) => setForm({ ...form, image: p })}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sort">Sort order</Label>
            <Input id="sort" type="number" min={0} value={form.sortOrder ?? 0}
              onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Switch id="isActive" checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label htmlFor="isActive" className="cursor-pointer">Hoạt động</Label>
            </div>
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Switch id="showOnHome" checked={form.showOnHome ?? false}
                onCheckedChange={(v) => setForm({ ...form, showOnHome: v })} />
              <Label htmlFor="showOnHome" className="cursor-pointer">Hiển thị trên trang chủ</Label>
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
    </div>
  )
}

// ==================== Product Manager Dialog ====================

function CollectionProductManager({
  collection, onClose,
}: { collection: Collection; onClose: () => void }) {
  const { data: currentProducts, isLoading: cpLoading } =
    useCollectionProducts(collection.id, true)

  const [searchKw, setSearchKw] = useState('')
  const { data: searchResults } = useProductSearch(searchKw, searchKw.trim().length > 0)

  const addProducts = useAddProductsToCollection()
  const removeProduct = useRemoveProductFromCollection()

  const currentIds = new Set((currentProducts ?? []).map((p) => p.id))

  const handleAdd = async (productId: number) => {
    try {
      await addProducts.mutateAsync({ id: collection.id, productIds: [productId] })
      toast.success('Đã thêm sản phẩm')
    } catch (e) { toast.error((e as Error).message) }
  }
  const handleRemove = async (productId: number) => {
    try {
      await removeProduct.mutateAsync({ id: collection.id, productId })
      toast.success('Đã xóa sản phẩm')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Quản lý sản phẩm — {collection.name}</DialogTitle>
          <DialogDescription>
            {(currentProducts?.length ?? 0)} sản phẩm trong bộ sưu tập.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-hidden md:grid-cols-2">
          {/* Current products */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 text-sm font-semibold">Đang có trong bộ sưu tập</div>
            <div className="flex-1 overflow-y-auto rounded-md border">
              {cpLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
              ) : (currentProducts ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Chưa có SP nào.
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

          {/* Search & add */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 text-sm font-semibold">Tìm để thêm</div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm sản phẩm theo tên..."
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border">
              {searchKw.trim().length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nhập từ khóa để tìm SP thêm vào.
                </div>
              ) : (searchResults ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Không tìm thấy SP nào khớp.
                </div>
              ) : (
                <ul className="divide-y">
                  {searchResults!.map((p) => {
                    const already = currentIds.has(p.id)
                    return (
                      <li key={p.id} className="flex items-center gap-3 p-2">
                        <img src={productImageSrc(p.primaryImage)} alt={p.name}
                          className="h-10 w-10 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{formatPrice(p.price)}</div>
                        </div>
                        <Button
                          variant={already ? 'ghost' : 'default'}
                          size="sm"
                          disabled={already}
                          onClick={() => handleAdd(p.id)}
                        >
                          {already ? 'Đã thêm' : <><Plus className="mr-1 h-3 w-3" />Thêm</>}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
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
