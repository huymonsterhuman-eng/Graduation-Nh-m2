import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/hooks/api/useCart'
import { checkVoucherApi } from '@/hooks/api/useVouchers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SmartImage } from '@/components/common/SmartImage'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { formatPrice } from '@/lib/format'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'
import type { VoucherCheckResult } from '@/types/api'

export function CartPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const clearCart = useClearCart()

  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState<VoucherCheckResult | null>(null)
  const [checkingVoucher, setCheckingVoucher] = useState(false)

  const applyVoucher = async () => {
    if (!voucherCode.trim() || !cart) return
    setCheckingVoucher(true)
    try {
      const result = await checkVoucherApi(voucherCode.trim(), cart.subtotal)
      setVoucherResult(result)
      if (result.valid) toast.success(result.message)
      else toast.error(result.message)
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không kiểm tra được voucher')
      setVoucherResult(null)
    } finally {
      setCheckingVoucher(false)
    }
  }

  const removeVoucher = () => {
    setVoucherResult(null)
    setVoucherCode('')
  }

  const handleCheckout = () => {
    const params = new URLSearchParams()
    if (voucherResult?.valid) params.set('voucher', voucherResult.code)
    navigate(`/dat-hang${params.toString() ? '?' + params : ''}`)
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Giỏ hàng trống</h1>
        <p className="text-muted-foreground">Chưa có sản phẩm nào trong giỏ.</p>
        <Button asChild>
          <Link to="/">Tiếp tục mua sắm</Link>
        </Button>
      </div>
    )
  }

  const discount = voucherResult?.valid ? voucherResult.discount : 0
  const totalAfterVoucher = cart.subtotal - discount

  return (
    <div className="container py-6">
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng ({cart.itemCount} sản phẩm)</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Items */}
        <div className="space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex gap-4">
                <Link to={`/san-pham/${item.productSlug}`} className="shrink-0">
                  <SmartImage
                    src={item.productImage}
                    alt={item.productName}
                    className="h-24 w-24 rounded object-cover"
                    usePicsum
                    seed={`p-${item.productId}`}
                  />
                </Link>
                <div className="flex-1 min-w-0 space-y-2">
                  <Link to={`/san-pham/${item.productSlug}`} className="line-clamp-2 font-medium hover:text-primary">
                    {item.productName}
                  </Link>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-primary">{formatPrice(item.currentPrice)}</span>
                    {item.priceChanged && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.priceSnapshot)}
                      </span>
                    )}
                  </div>
                  {!item.productActive && (
                    <p className="text-xs text-destructive">Sản phẩm đã ngừng bán</p>
                  )}
                  {item.stockAvailable < item.quantity && (
                    <p className="text-xs text-amber-600">
                      Chỉ còn {item.stockAvailable} sản phẩm
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem.mutate(item.id, {
                      onSuccess: () => toast.success('Đã xóa khỏi giỏ'),
                    })}
                    className="text-destructive hover:text-destructive"
                    aria-label="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: Math.min(item.stockAvailable, item.quantity + 1) })}
                      disabled={item.quantity >= item.stockAvailable}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(item.lineTotal)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('Xóa toàn bộ giỏ hàng?')) {
                  clearCart.mutate(undefined, { onSuccess: () => toast.success('Đã xóa giỏ') })
                }
              }}
              className="text-destructive"
            >
              Xóa toàn bộ giỏ
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Tóm tắt đơn hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tạm tính</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>

            {/* Voucher */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Mã voucher"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={!!voucherResult?.valid}
                />
                {voucherResult?.valid ? (
                  <Button variant="outline" onClick={removeVoucher}>Bỏ</Button>
                ) : (
                  <Button variant="outline" onClick={applyVoucher} disabled={checkingVoucher || !voucherCode.trim()}>
                    {checkingVoucher ? '...' : 'Áp'}
                  </Button>
                )}
              </div>
              {voucherResult && !voucherResult.valid && (
                <p className="text-xs text-destructive">{voucherResult.message}</p>
              )}
              {voucherResult?.valid && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Giảm giá ({voucherResult.code})</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Tổng</span>
              <span className="text-primary">{formatPrice(totalAfterVoucher)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Chưa gồm phí vận chuyển (chọn ở bước sau)</p>

            <Button size="lg" className="w-full" onClick={handleCheckout}>
              Tiến hành đặt hàng
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Tiếp tục mua sắm</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
