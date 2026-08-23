import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesByCategory } from '@/hooks/api/useAdminDashboard'
import { PieChart as PieIcon } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316']

export function SalesByCategoryChart({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useSalesByCategory(limit)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <PieIcon className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold">Doanh số theo danh mục</h3>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu bán hàng.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="totalSold"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(e: { categoryName: string; percent?: number }) =>
                `${e.categoryName} ${((e.percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
              fontSize={11}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, _: string, p: { payload: { categoryName: string } }) =>
                [`${v} SP`, p.payload.categoryName]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
