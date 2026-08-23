import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Star } from 'lucide-react'
import { useLowRated } from '@/hooks/api/useAdminDashboard'
import { productImageSrc } from '@/lib/format'

export function LowRatedWidget({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useLowRated(limit)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">SP đánh giá thấp</h3>
        </div>
        <span className="text-xs text-muted-foreground">Rating ≤ 3</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          🎉 Không có SP nào bị đánh giá thấp.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
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
                  <Link to={`/admin/danh-gia?productId=${p.id}`}
                    className="line-clamp-1 text-sm font-medium hover:text-primary">
                    {p.name}
                  </Link>
                  {p.categoryName && (
                    <div className="text-xs text-muted-foreground">{p.categoryName}</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    ★ {Number(p.avgRating).toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {p.reviewCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
