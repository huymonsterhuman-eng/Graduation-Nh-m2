import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '@/hooks/api/useCart'
import { useAddresses } from '@/hooks/api/useAddresses'
import { useCheckout } from '@/hooks/api/useOrders'
import { checkVoucherApi } from '@/hooks/api/useVouchers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { formatPrice } from '@/lib/format'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'
import type { PaymentMethod, VoucherCheckResult } from '@/types/api'

const SHIPPING_METHODS: { value: string; label: string; fee: number }[] = [
  { value: 'standard', label: 'Tiêu chuẩn (3-5 ngày)', fee: 30000 },
  { value: 'express', label: 'Nhanh (1-2 ngày)', fee: 50000 },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Poll cart mỗi 8s — catch case khách khác vừa đặt SP giữa lúc mình điền form.
  // stockAvailable đã trừ reserved ở BE (CartService.toItemDto), nên phản ánh thực tế.
  const { data: cart, isLoading: loadingCart, refetch: refetchCart } = useCart({ refetchInterval: 8000 })
  const { data: addresses, isLoading: loadingAddr } = useAddresses()
  const checkout = useCheckout()

  const [addressId, setAddressId] = useState<number | undefined>()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [note, setNote] = useState('')
  const [voucherCode, setVoucherCode] = useState(searchParams.get('voucher') || '')
  const [voucherResult, setVoucherResult] = useState<VoucherCheckResult | null>(null)
  const [stockDialogMsg, setStockDialogMsg] = useState<string | null>(null)

  // Detect SP có vấn đề: thiếu tồn hoặc đã ngừng bán.
  const stockIssues = useMemo(() => {
    if (!cart) return []
    return cart.items.filter((i) => i.stockAvailable < i.quantity || !i.productActive)
  }, [cart])
  const hasStockIssue = stockIssues.length > 0

  // Auto-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !addressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0]
      setAddressId(def.id)
    }
  }, [addresses, addressId])

  // Auto-apply voucher từ query
  useEffect(() => {
    if (voucherCode && cart && !voucherResult) {
      checkVoucherApi(voucherCode, cart.subtotal)
        .then((r) => setVoucherResult(r))
        .catch(() => {})
    }
  }, [voucherCode, cart, voucherResult])

  if (loadingCart || loadingAddr) {
    return <div className="container py-12 text-center text-muted-foreground">Đang tải...</div>
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-muted-foreground">Giỏ hàng trống, không thể đặt hàng.</p>
        <Button asChild><Link to="/">Về trang chủ</Link></Button>
      </div>
    )
  }

  const shipping = SHIPPING_METHODS.find((s) => s.value === shippingMethod)!
  const discount = voucherResult?.valid ? voucherResult.discount : 0
  const total = cart.subtotal - discount + shipping.fee

  const handleSubmit = async () => {
    if (!addressId) {
      toast.error('Vui lòng chọn địa chỉ giao hàng')
      return
    }
    try {
      const result = await checkout.mutateAsync({
        addressId,
        paymentMethod,
        shippingMethod,
        shippingFee: shipping.fee,
        voucherCode: voucherResult?.valid ? voucherResult.code : undefined,
        customerNote: note || undefined,
      })
      // VNPay: redirect sang cổng thanh toán, chờ IPN + user quay về /thanh-toan/vnpay/ket-qua.
      // COD/khác: qua thẳng trang cảm ơn.
      if (result.paymentUrl) {
        toast.success('Đang chuyển sang cổng VNPay...')
        window.location.href = result.paymentUrl
        return
      }
      navigate(`/dat-hang/thanh-cong/${result.order.code}`, { replace: true })
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      const beMsg = err.response?.data?.message || ''
      // Race lúc cuối: BE reject INSUFFICIENT_STOCK vì SP vừa hết ngay trước khi mình đặt.
      // Không hiện toast đỏ ngắn ngủi — mở dialog xin lỗi lịch sự + refetch giỏ để banner update.
      if (/tồn kho|hết hàng|ngừng bán|không đủ/i.test(beMsg)) {
        setStockDialogMsg(beMsg)
        refetchCart()
      } else {
        toast.error(beMsg || 'Đặt hàng thất bại')
      }
    }
  }

  return (
    <div className="container py-6">
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]} />
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

      {hasStockIssue && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-1 text-sm">
              <p className="font-semibold text-destructive">
                Tồn kho vừa thay đổi — không thể đặt đơn với giỏ hàng hiện tại
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                {stockIssues.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium text-foreground">{i.productName}</span>{' '}
                    {!i.productActive ? (
                      <span className="text-destructive">— đã ngừng bán</span>
                    ) : i.stockAvailable === 0 ? (
                      <span className="text-destructive">— vừa hết hàng</span>
                    ) : (
                      <span>— bạn đặt <b>{i.quantity}</b>, hiện chỉ còn <b>{i.stockAvailable}</b></span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-xs">
                <Link to="/gio-hang" className="font-medium text-primary hover:underline">
                  → Về giỏ hàng để chỉnh số lượng hoặc xoá sản phẩm
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Địa chỉ giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              {!addresses || addresses.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Chưa có địa chỉ nào.</p>
                  <Button variant="outline" asChild>
                    <Link to="/tai-khoan/dia-chi">Thêm địa chỉ mới</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer gap-3 rounded-md border p-3 transition ${
                        addressId === a.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={addressId === a.id}
                        onChange={() => setAddressId(a.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-sm text-muted-foreground">{a.phone}</span>
                          {a.isDefault && (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[a.address, a.ward, a.district, a.province].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </label>
                  ))}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/tai-khoan/dia-chi">Quản lý địa chỉ</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Phương thức giao hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SHIPPING_METHODS.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
                    shippingMethod === s.value ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === s.value}
                    onChange={() => setShippingMethod(s.value)}
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm">{s.label}</span>
                    <span className="font-medium">{formatPrice(s.fee)}</span>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}>
                <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                <div>
                  <div className="text-sm font-medium">Thanh toán khi nhận hàng (COD)</div>
                  <div className="text-xs text-muted-foreground">Trả tiền mặt cho shipper khi nhận hàng</div>
                </div>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${paymentMethod === 'vnpay' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}>
                <input type="radio" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                <div className="flex-1">
                  <div className="text-sm font-medium">VNPay — Thẻ ATM/QR/Visa</div>
                  <div className="text-xs text-muted-foreground">
                    Chuyển sang cổng VNPay sandbox. Thẻ test NCB <span className="font-mono">9704198526191432198</span>, OTP <span className="font-mono">123456</span>.
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Mới</span>
              </label>
            </CardContent>
          </Card>

          {/* Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Ghi chú (tuỳ chọn)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: giao giờ hành chính, gọi trước khi giao..."
                className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Đơn hàng ({cart.itemCount} SP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-64 overflow-auto space-y-2">
              {cart.items.map((i) => (
                <div key={i.id} className="flex gap-2 text-sm">
                  <span className="flex-1 line-clamp-2">{i.productName}</span>
                  <span className="text-muted-foreground shrink-0">×{i.quantity}</span>
                  <span className="font-medium shrink-0">{formatPrice(i.lineTotal)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Voucher input */}
            <div className="space-y-2">
              <Label className="text-xs">Voucher</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Mã voucher"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={!!voucherResult?.valid}
                />
                {voucherResult?.valid ? (
                  <Button variant="outline" size="sm" onClick={() => { setVoucherResult(null); setVoucherCode('') }}>Bỏ</Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const r = await checkVoucherApi(voucherCode.trim(), cart.subtotal)
                        setVoucherResult(r)
                        if (r.valid) toast.success(r.message)
                        else toast.error(r.message)
                      } catch { toast.error('Không kiểm tra được voucher') }
                    }}
                    disabled={!voucherCode.trim()}
                  >
                    Áp
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              {voucherResult?.valid && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span>{formatPrice(shipping.fee)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={checkout.isPending || !addressId || hasStockIssue}
              title={hasStockIssue ? 'Hãy chỉnh giỏ hàng trước — có sản phẩm không còn đủ' : undefined}
            >
              {checkout.isPending
                ? 'Đang đặt hàng...'
                : hasStockIssue
                  ? 'Cần chỉnh giỏ hàng'
                  : 'Đặt hàng'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!stockDialogMsg} onOpenChange={(o) => !o && setStockDialogMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Đơn hàng chưa thể tạo
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{stockDialogMsg}</span>
              <span className="block text-sm">
                Một khách khác vừa đặt trước bạn vài giây. Địa chỉ và voucher bạn đã chọn vẫn giữ nguyên —
                bạn chỉ cần về giỏ hàng chỉnh lại số lượng hoặc xoá sản phẩm đã hết, rồi quay lại đặt tiếp.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStockDialogMsg(null)}>Đóng, xem lại</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setStockDialogMsg(null); navigate('/gio-hang') }}>
              Về giỏ hàng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
