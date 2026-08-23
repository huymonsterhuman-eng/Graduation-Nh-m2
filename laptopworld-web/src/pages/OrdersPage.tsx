import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyOrders } from '@/hooks/api/useOrders'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/common/Pagination'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/api'

const STATUS_TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'preparing', label: 'Đang chuẩn bị' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

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

export function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined)
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyOrders(status, page, 10)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đơn hàng của tôi</h1>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => { setStatus(t.value); setPage(0) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition',
              status === t.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : !data || data.content.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Chưa có đơn hàng nào.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.content.map((o) => (
            <Link key={o.id} to={`/tai-khoan/don-hang/${o.code}`}>
              <Card className="transition hover:shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{o.code}</span>
                      <Badge className={cn('border-0', STATUS_COLOR[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(o.createdAt).toLocaleString('vi-VN')} · {o.itemCount} sản phẩm
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{formatPrice(o.total)}</div>
                    <div className="text-xs text-muted-foreground">{o.paymentMethod.toUpperCase()}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  )
}
