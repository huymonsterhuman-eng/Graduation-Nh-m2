import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrderByCode, useCancelOrder } from '@/hooks/api/useOrders'
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
import { Star } from 'lucide-react'
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
  const [reviewTarget, setReviewTarget] = useState<{ productId: number; productName: string } | null>(null)

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
          <p className="text-xs text-muted-foreground">
            Thanh toán: {order.paymentMethod.toUpperCase()} — {order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'unpaid' ? 'Chưa thanh toán' : 'Đã hoàn tiền'}
          </p>
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
