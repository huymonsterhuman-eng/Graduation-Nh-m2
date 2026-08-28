import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrderByCode, useCancelOrder, useRepayVnpay } from '@/hooks/api/useOrders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SmartImage } from '@/components/common/SmartImage'
import { ReviewDialog } from '@/components/ReviewDialog'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Star, Clock, CreditCard } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@/types/api'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  shipping: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
}
const TIMELINE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered']

export function OrderDetailPage() {
  const { code } = useParams<{ code: string }>()
  const { data: order, isLoading } = useOrderByCode(code)
  const cancel = useCancelOrder()
  const repay = useRepayVnpay()
  const qc = useQueryClient()
  const [reviewTarget, setReviewTarget] = useState<{ productId: number; productName: string } | null>(null)
  const [now, setNow] = useState(Date.now())

  // Đơn VNPay unpaid pending có countdown → tick mỗi giây
  const isVnpayWaitingPayment =
    order?.paymentMethod === 'vnpay' &&
    order?.paymentStatus === 'unpaid' &&
    order?.status === 'pending' &&
    !!order?.paymentExpiresAt
  useEffect(() => {
    if (!isVnpayWaitingPayment) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [isVnpayWaitingPayment])

  const expiresMs = order?.paymentExpiresAt ? new Date(order.paymentExpiresAt).getTime() : 0
  const remainMs = Math.max(0, expiresMs - now)
  const remainMin = Math.floor(remainMs / 60_000)
  const remainSec = Math.floor((remainMs % 60_000) / 1000)
  const expired = isVnpayWaitingPayment && remainMs === 0

  // Khi countdown vừa về 0 → refetch order để nhận status=cancelled (job cancel sau đó vài giây)
  useEffect(() => {
    if (!expired) return
    const t = setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['order', code] })
    }, 3000)
    return () => clearTimeout(t)
  }, [expired, code, qc])

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>
  }

  if (!order) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">Không tìm thấy đơn hàng.</CardContent></Card>
    )
  }

  const canCancel = order.status === 'pending'
  const currentStep = TIMELINE.indexOf(order.status)

  const handleCancel = async () => {
    if (!confirm(`Xác nhận hủy đơn ${order.code}?`)) return
    try {
      await cancel.mutateAsync(order.code)
      toast.success('Đã hủy đơn hàng')
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không hủy được đơn')
    }
  }

  const handleRepay = async () => {
    try {
      const url = await repay.mutateAsync(order.code)
      toast.success('Đang chuyển sang cổng VNPay...')
      window.location.href = url
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không sinh được liên kết thanh toán')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/tai-khoan/don-hang" className="text-sm text-muted-foreground hover:text-foreground">← Quay lại</Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold font-mono">{order.code}</h1>
        <Badge className={cn('border-0', STATUS_COLOR[order.status])}>
          {STATUS_LABEL[order.status]}
        </Badge>
      </div>

      {/* VNPay countdown / expired banner */}
      {isVnpayWaitingPayment && !expired && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Còn {String(remainMin).padStart(2, '0')}:{String(remainSec).padStart(2, '0')} để thanh toán
              </p>
              <p className="text-sm text-muted-foreground">
                Đơn sẽ tự huỷ nếu bạn không hoàn tất thanh toán VNPay trong thời gian trên. Reserved kho sẽ được trả lại cho khách khác.
              </p>
            </div>
            <Button size="sm" onClick={handleRepay} disabled={repay.isPending}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              {repay.isPending ? 'Đang xử lý...' : 'Thanh toán lại'}
            </Button>
          </div>
        </div>
      )}

      {isVnpayWaitingPayment && expired && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-semibold text-destructive">Đã hết hạn thanh toán</p>
          <p className="text-sm text-muted-foreground">
            Hệ thống sẽ tự huỷ đơn này trong vài giây. Nếu bạn vẫn muốn mua, vui lòng đặt lại đơn mới.
          </p>
        </div>
      )}

      {/* Timeline */}
      {order.status !== 'cancelled' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {TIMELINE.map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-1 text-center flex-1">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                    i <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn('text-xs', i <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {STATUS_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin nhận hàng</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Người nhận: </span>{order.shippingName}</p>
          <p><span className="text-muted-foreground">Điện thoại: </span>{order.shippingPhone}</p>
          <p><span className="text-muted-foreground">Địa chỉ: </span>{order.shippingAddress}</p>
          <p><span className="text-muted-foreground">Vận chuyển: </span>{order.shippingMethod}</p>
          {order.trackingNumber && (
            <p><span className="text-muted-foreground">Mã vận đơn: </span>{order.trackingNumber}</p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sản phẩm ({order.items.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((i) => (
            <div key={i.id} className="flex gap-3">
              <SmartImage
                src={i.productImage}
                alt={i.productName}
                className="h-16 w-16 rounded object-cover"
                usePicsum
                seed={`p-${i.productId}`}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{i.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(i.priceAtPurchase)} × {i.quantity}
                </p>
                {order.status === 'delivered' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5 h-8 border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                    onClick={() => setReviewTarget({ productId: i.productId, productName: i.productName })}
                  >
                    <Star className="mr-1.5 h-3.5 w-3.5 fill-amber-500" /> Viết đánh giá
                  </Button>
                )}
              </div>
              <div className="font-medium">{formatPrice(i.lineTotal)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {reviewTarget && (
        <ReviewDialog
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          onClose={() => setReviewTarget(null)}
        />
      )}

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tổng tiền</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tạm tính</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phí vận chuyển</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatPrice(order.total)}</span>
          </div>
          <div className="space-y-1 border-t pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phương thức</span>
              <span className="font-medium">{order.paymentMethod.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trạng thái TT</span>
              <span className={
                order.paymentStatus === 'paid' ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                : order.paymentStatus === 'refunded' ? 'font-semibold text-sky-600 dark:text-sky-400'
                : 'font-semibold text-amber-600 dark:text-amber-400'
              }>
                {order.paymentStatus === 'paid' ? '✓ Đã thanh toán'
                 : order.paymentStatus === 'refunded' ? 'Đã hoàn tiền'
                 : 'Chưa thanh toán'}
              </span>
            </div>
            {order.paymentTransactionRef && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã GD VNPay</span>
                <span className="font-mono text-[11px]">{order.paymentTransactionRef}</span>
              </div>
            )}
            {order.paidAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày thanh toán</span>
                <span>{new Date(order.paidAt).toLocaleString('vi-VN')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canCancel && (
        <div className="flex justify-end">
          <Button variant="destructive" onClick={handleCancel} disabled={cancel.isPending}>
            {cancel.isPending ? 'Đang hủy...' : 'Hủy đơn hàng'}
          </Button>
        </div>
      )}
    </div>
  )
}
