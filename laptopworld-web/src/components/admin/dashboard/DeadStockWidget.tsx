import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PackageX } from 'lucide-react'
import { useDeadStock } from '@/hooks/api/useAdminDashboard'
import { formatPrice, productImageSrc, formatDate } from '@/lib/format'

export function DeadStockWidget({ days = 30, limit = 5 }: { days?: number; limit?: number }) {
  const { data, isLoading } = useDeadStock(days, limit)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageX className="h-4 w-4 text-rose-600" />
          <h3 className="text-sm font-semibold">Hàng tồn lâu (Dead stock)</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Không có đơn trong {days} ngày qua
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          🎉 Không có SP nào tồn đọng lâu.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Tồn</TableHead>
              <TableHead className="hidden md:table-cell">Tạo lúc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <img
                    src={productImageSrc(p.primaryImage)}
                    alt={p.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <Link to={`/san-pham/${p.slug}`} target="_blank"
                    className="line-clamp-1 text-sm font-medium hover:text-primary">
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{formatPrice(p.price)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">{p.stock}</Badge>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {formatDate(p.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
