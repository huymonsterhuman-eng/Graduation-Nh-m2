import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatPriceCompact } from '@/lib/format'
import { useRevenueTimeseries, type DateRange } from '@/hooks/api/useAdminDashboard'
import { TrendingUp } from 'lucide-react'

export function RevenueChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useRevenueTimeseries(range)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold">Doanh thu theo thời gian</h3>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu doanh thu trong khoảng này.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatPriceCompact(Number(v))}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [formatPrice(v), 'Doanh thu']}
              labelClassName="font-semibold"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
