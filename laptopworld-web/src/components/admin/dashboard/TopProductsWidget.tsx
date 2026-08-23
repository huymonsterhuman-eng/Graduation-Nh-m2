import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Flame } from 'lucide-react'
import { useTopProducts } from '@/hooks/api/useAdminDashboard'
import { formatPrice, productImageSrc } from '@/lib/format'

export function TopProductsWidget({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useTopProducts(limit)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Sản phẩm bán chạy</h3>
      </div>
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Đã bán</TableHead>
              <TableHead className="text-right">Tồn</TableHead>
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
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                    {p.totalSold}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={p.currentStock <= 0 ? 'destructive' : p.currentStock <= 5 ? 'secondary' : 'outline'}>
                    {p.currentStock}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
