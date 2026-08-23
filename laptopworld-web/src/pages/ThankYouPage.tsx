import { Link, useParams } from 'react-router-dom'
import { useOrderByCode } from '@/hooks/api/useOrders'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

export function ThankYouPage() {
  const { code } = useParams<{ code: string }>()
  const { data: order, isLoading } = useOrderByCode(code)

  return (
    <div className="container py-16 max-w-2xl">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold">Đặt hàng thành công!</h1>
          <p className="text-muted-foreground">
            Cảm ơn bạn đã mua sắm tại LaptopWorld. Đơn hàng đã được ghi nhận.
          </p>

          {isLoading ? (
            <Skeleton className="h-24" />
          ) : order ? (
            <div className="rounded-md bg-muted p-4 text-left text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã đơn:</span>
                <span className="font-mono font-semibold">{order.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng tiền:</span>
                <span className="font-semibold text-primary">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thanh toán:</span>
                <span>{order.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giao đến:</span>
                <span className="text-right">{order.shippingName}, {order.shippingPhone}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row justify-center pt-2">
            <Button asChild variant="outline">
              <Link to="/">Về trang chủ</Link>
            </Button>
            <Button asChild>
              <Link to={`/tai-khoan/don-hang/${code}`}>Xem chi tiết đơn</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
