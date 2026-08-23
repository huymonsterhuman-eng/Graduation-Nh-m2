import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStockMovement, type DateRange } from '@/hooks/api/useAdminDashboard'
import { PackageSearch } from 'lucide-react'

export function StockMovementChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useStockMovement(range)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <PackageSearch className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-semibold">Biến động Nhập / Bán</h3>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu kho trong khoảng này.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [`${v} SP`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="incoming" name="Hàng nhập" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outgoing" name="Hàng bán"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
