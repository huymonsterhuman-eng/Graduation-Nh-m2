import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Save, Trash2, UserRound, MapPin, Package,
  CreditCard, FileText, Receipt, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import { ProductCombobox } from '@/components/admin/common/ProductCombobox'
import {
  useAdminUserSearch, useUserAddresses, useCreateAdminOrder,
  type UserPickResult, type AdminCreateOrderInput,
} from '@/hooks/api/useAdminOrders'
import { formatPrice, productImageSrc } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Row {
  productId: number
  productName: string
  productImage?: string
  quantity: number
  price: number
  stock: number
}

type AddressMode = 'book' | 'manual'

export function AdminCreateOrderPage() {
  const navigate = useNavigate()
  const create = useCreateAdminOrder()

  const [user, setUser] = useState<UserPickResult | null>(null)
  const [addressMode, setAddressMode] = useState<AddressMode>('book')
  const [addressId, setAddressId] = useState<string>('')
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo'>('cod')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Row[]>([])

  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userKw, setUserKw] = useState('')
  const { data: userResults } = useAdminUserSearch(userKw, userPickerOpen)
  const { data: addresses } = useUserAddresses(user?.id)

  const subtotal = rows.reduce((sum, r) => sum + r.price * r.quantity, 0)
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0)

  const pickUser = (u: UserPickResult) => {
    setUser(u); setAddressId(''); setUserPickerOpen(false); setUserKw('')
    setAddressMode('book')
  }

  const handleAddProduct = (p: {
    id: number; name: string; primaryImage?: string
    price: number; salePrice?: number; stock: number
  }) => {
    if (rows.some((r) => r.productId === p.id)) { toast.info(`"${p.name}" đã có trong đơn`); return }
    if (p.stock <= 0) { toast.error(`"${p.name}" hết hàng`); return }
    setRows([...rows, {
      productId: p.id, productName: p.name, productImage: p.primaryImage,
      quantity: 1, price: p.salePrice ?? p.price, stock: p.stock,
    }])
  }

  const updateRow = (i: number, patch: Partial<Row>) => {
    const next = [...rows]; next[i] = { ...next[i], ...patch }; setRows(next)
  }
  const removeRow = (i: number) => setRows(rows.filter((_, x) => x !== i))

  const submit = async () => {
    if (!user) { toast.error('Chưa chọn khách'); return }

    let addressPayload: Partial<AdminCreateOrderInput> = {}
    if (addressMode === 'book') {
      if (!addressId) { toast.error('Chưa chọn địa chỉ'); return }
      addressPayload.addressId = Number(addressId)
    } else {
      if (!manualName.trim() || !manualPhone.trim() || !manualAddress.trim()) {
        toast.error('Nhập đủ họ tên + SĐT + địa chỉ'); return
      }
      addressPayload = {
        manualName: manualName.trim(),
        manualPhone: manualPhone.trim(),
        manualAddress: manualAddress.trim(),
      }
    }

    if (rows.length === 0) { toast.error('Chưa có SP'); return }
    for (const r of rows) {
      if (r.quantity <= 0) { toast.error(`SP "${r.productName}" cần SL > 0`); return }
      if (r.quantity > r.stock) { toast.error(`SP "${r.productName}" chỉ còn ${r.stock}`); return }
    }

    const body: AdminCreateOrderInput = {
      userId: user.id,
      paymentMethod,
      items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
      adminNote: note || undefined,
      ...addressPayload,
    } as AdminCreateOrderInput

    try {
      const created = await create.mutateAsync(body)
      toast.success(`Đã tạo đơn ${created?.code}`)
      navigate(`/admin/don-hang/${created?.id}`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const hasNoAddress = user && addresses && addresses.length === 0

  return (
    <div className="space-y-4">
      {/* Sticky action bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/don-hang"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <AdminPageHeader title="Tạo đơn hàng thủ công" sprint="Sprint 9E" />
        <div className="ml-auto">
          <Button onClick={submit} disabled={create.isPending} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {create.isPending ? 'Đang lưu...' : 'Tạo đơn'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Products */}
          <AdminSection
            title={`Sản phẩm (${rows.length})`}
            description="Gõ tên để tìm nhanh — click là thêm vào đơn"
            icon={Package}
          >
            <div className="space-y-3">
              <ProductCombobox
                placeholder="Tìm SP theo tên..."
                excludeIds={rows.map((r) => r.productId)}
                requireStock
                onPick={(p) => handleAddProduct(p)}
              />

              {rows.length === 0 ? (
                <div className="grid place-items-center rounded-md border border-dashed py-6 text-sm text-muted-foreground">
                  Chưa có SP nào. Dùng thanh tìm ở trên để thêm.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Sản phẩm</span>
                    <span className="text-right">Tồn</span>
                    <span className="text-right">Số lượng</span>
                    <span className="text-right">Thành tiền</span>
                    <span />
                  </div>
                  <div className="divide-y">
                    {rows.map((r, i) => (
                      <div key={r.productId} className="grid grid-cols-[1fr_80px_120px_120px_40px] items-center gap-2 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <img src={productImageSrc(r.productImage)} alt="" className="h-10 w-10 rounded object-cover" />
                          <div className="min-w-0">
                            <div className="line-clamp-1 text-sm font-medium">{r.productName}</div>
                            <div className="text-xs text-muted-foreground">{formatPrice(r.price)}</div>
                          </div>
                        </div>
                        <span className="text-right text-sm">
                          <Badge variant={r.stock <= 0 ? 'destructive' : 'outline'}>{r.stock}</Badge>
                        </span>
                        <Input type="number" min={1} max={r.stock} value={r.quantity}
                          onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className={cn('h-8 text-right', r.quantity > r.stock && 'border-destructive')} />
                        <div className="text-right text-sm font-semibold">{formatPrice(r.price * r.quantity)}</div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AdminSection>

          {/* Shipping info */}
          {user && (
            <AdminSection
              title="Thông tin giao nhận"
              description={hasNoAddress
                ? 'Khách chưa có địa chỉ — buộc nhập thủ công'
                : 'Chọn từ sổ địa chỉ hoặc nhập thủ công'}
              icon={MapPin}
              actions={
                <div className="flex gap-1 rounded-md border p-0.5 text-xs">
                  <button type="button"
                    onClick={() => setAddressMode('book')}
                    className={cn(
                      'rounded px-3 py-1 transition',
                      addressMode === 'book' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                      hasNoAddress && 'cursor-not-allowed opacity-50'
                    )}
                    disabled={!!hasNoAddress}
                  >Từ sổ ({addresses?.length ?? 0})</button>
                  <button type="button"
                    onClick={() => setAddressMode('manual')}
                    className={cn(
                      'rounded px-3 py-1 transition',
                      addressMode === 'manual' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    )}
                  >Thủ công</button>
                </div>
              }
            >
              {addressMode === 'book' ? (
                hasNoAddress ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                    Khách chưa có địa chỉ trong sổ. Đổi sang <b>Thủ công</b> ở góc phải.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(addresses ?? []).map((a) => (
                      <label key={a.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition',
                          addressId === String(a.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        )}>
                        <input type="radio" name="address" className="mt-1 h-4 w-4 accent-primary"
                          checked={addressId === String(a.id)}
                          onChange={() => setAddressId(String(a.id))} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.name}</span>
                            {a.isDefault && <Badge variant="outline" className="text-[10px]">Mặc định</Badge>}
                            <span className="text-xs text-muted-foreground">{a.phone}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {a.address}
                            {a.ward && `, ${a.ward}`}{a.district && `, ${a.district}`}{a.province && `, ${a.province}`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="mname" className="text-xs">Họ tên người nhận *</Label>
                    <Input id="mname" value={manualName} onChange={(e) => setManualName(e.target.value)}
                      placeholder="Nguyễn Văn A" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mphone" className="text-xs">Số điện thoại *</Label>
                    <Input id="mphone" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="0912345678" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="maddr" className="text-xs">Địa chỉ đầy đủ *</Label>
                    <textarea id="maddr" rows={2} value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Số nhà, ngõ, đường, phường, quận, tỉnh..."
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              )}
            </AdminSection>
          )}

          {/* Note */}
          <AdminSection
            title="Ghi chú admin"
            description="Nội bộ — chỉ admin thấy"
            icon={FileText}
            compact
          >
            <textarea rows={3} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú nội bộ..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </AdminSection>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          {/* Customer */}
          <AdminSection
            title="Khách hàng"
            description="Chọn khách để tạo đơn"
            icon={UserRound}
          >
            {user ? (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="font-medium">{user.fullName || user.username}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">@{user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  {user.phone && (
                    <div className="text-xs text-muted-foreground">{user.phone}</div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full"
                  onClick={() => { setUser(null); setAddressId('') }}>
                  Đổi khách hàng
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setUserPickerOpen(true)}>
                <Search className="mr-2 h-4 w-4" /> Chọn khách hàng
              </Button>
            )}
          </AdminSection>

          {/* Payment */}
          <AdminSection
            title="Thanh toán"
            description="Đơn tạo tay được set 'Đã xác nhận'"
            icon={CreditCard}
          >
            <div className="space-y-2">
              <Label className="text-xs">Phương thức</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cod' | 'vnpay' | 'momo')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">COD — Trả khi nhận hàng</SelectItem>
                  <SelectItem value="vnpay">VNPay (đã thu)</SelectItem>
                  <SelectItem value="momo">MoMo (đã thu)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === 'cod'
                  ? <>Đơn tạo với <b>Chưa TT</b>. COD sẽ tự thành <b>Đã TT</b> khi giao xong.</>
                  : <>VNPay/MoMo: coi như đã thu tiền → đơn ở <b>Đã TT</b>.</>}
              </p>
            </div>
          </AdminSection>

          {/* Summary */}
          <AdminSection
            title="Tổng kết"
            icon={Receipt}
            compact
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số SP</span>
                <span className="font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng SL</span>
                <span className="font-medium">{totalQty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tiền hàng</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phí ship</span>
                <span className="text-muted-foreground">0₫</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Thanh toán</span>
                  <span className="text-primary">{formatPrice(subtotal)}</span>
                </div>
              </div>
            </div>
          </AdminSection>
        </div>
      </div>

      {/* User picker modal (giữ nguyên) */}
      <Dialog open={userPickerOpen} onOpenChange={setUserPickerOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader><DialogTitle>Chọn khách hàng</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={userKw} onChange={(e) => setUserKw(e.target.value)}
              placeholder="Username / email / họ tên..." className="pl-9" autoFocus />
          </div>
          <div className="max-h-96 overflow-y-auto rounded-md border">
            {userKw.trim().length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Nhập từ khóa để tìm.</div>
            ) : (userResults ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Không tìm thấy.</div>
            ) : (
              <ul className="divide-y">
                {userResults!.map((u) => (
                  <li key={u.id}
                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-accent"
                    onClick={() => pickUser(u)}>
                    <UserRound className="h-8 w-8 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-medium">{u.fullName || u.username}</div>
                      <div className="text-xs text-muted-foreground">
                        @{u.username} · {u.email}
                      </div>
                    </div>
                    <Button size="sm">Chọn</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserPickerOpen(false)}>
              <X className="mr-2 h-3 w-3" /> Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
