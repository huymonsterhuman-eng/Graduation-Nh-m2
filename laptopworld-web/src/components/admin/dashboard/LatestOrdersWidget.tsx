import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ClipboardList } from 'lucide-react'
import { useLatestOrders, type DateRange } from '@/hooks/api/useAdminDashboard'
import { formatPrice, formatDateTime } from '@/lib/format'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
}
const STATUS_CLASS: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  confirmed: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  preparing: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  shipping:  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

export function LatestOrdersWidget({ range, limit = 8 }: { range: DateRange; limit?: number }) {
  const { data, isLoading } = useLatestOrders(range, limit)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold">Đơn mới nhất</h3>
        </div>
        <Link to="/admin/don-hang" className="text-xs text-primary hover:underline">
          Xem tất cả →
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Không có đơn nào trong khoảng này.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách</TableHead>
              <TableHead className="text-right">Tổng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell">Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">
                  <Link to={`/admin/don-hang/${o.code}`} className="hover:text-primary">
                    {o.code}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-sm">
                  {o.username || o.shippingName || 'Khách'}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatPrice(o.total)}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_CLASS[o.status] ?? 'bg-muted'}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {formatDateTime(o.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
