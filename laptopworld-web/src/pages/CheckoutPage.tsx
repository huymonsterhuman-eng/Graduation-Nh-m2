import { useEffect, useState } from 'react'
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
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { formatPrice } from '@/lib/format'
import { toast } from 'sonner'
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

  const { data: cart, isLoading: loadingCart } = useCart()
  const { data: addresses, isLoading: loadingAddr } = useAddresses()
  const checkout = useCheckout()

  const [addressId, setAddressId] = useState<number | undefined>()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [note, setNote] = useState('')
  const [voucherCode, setVoucherCode] = useState(searchParams.get('voucher') || '')
  const [voucherResult, setVoucherResult] = useState<VoucherCheckResult | null>(null)

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
      toast.error(err.response?.data?.message || 'Đặt hàng thất bại')
    }
  }

  return (
    <div className="container py-6">
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]} />
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

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

            <Button size="lg" className="w-full" onClick={handleSubmit} disabled={checkout.isPending || !addressId}>
              {checkout.isPending ? 'Đang đặt hàng...' : 'Đặt hàng'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
