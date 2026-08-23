import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'
import { DashboardFilter, useDashboardRange } from '@/components/admin/dashboard/DashboardFilter'
import { KpiCard } from '@/components/admin/dashboard/KpiCard'
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart'
import { StockMovementChart } from '@/components/admin/dashboard/StockMovementChart'
import { SalesByCategoryChart } from '@/components/admin/dashboard/SalesByCategoryChart'
import { TopProductsWidget } from '@/components/admin/dashboard/TopProductsWidget'
import { LatestOrdersWidget } from '@/components/admin/dashboard/LatestOrdersWidget'
import { DeadStockWidget } from '@/components/admin/dashboard/DeadStockWidget'
import { LowRatedWidget } from '@/components/admin/dashboard/LowRatedWidget'
import { ChatbotSection } from '@/components/admin/dashboard/ChatbotSection'
import { useDashboardKpi } from '@/hooks/api/useAdminDashboard'
import { formatPrice, formatPriceCompact, formatDate } from '@/lib/format'
import {
  LayoutDashboard, Banknote, ShoppingBag, UserPlus, Clock,
  AlertTriangle, XCircle,
} from 'lucide-react'

export function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [range, setRange] = useDashboardRange()
  const { data: kpi, isLoading: kpiLoading } = useDashboardKpi(range)

  const rangeLabel = `${formatDate(range.from + 'T00:00:00Z')} → ${formatDate(range.to + 'T00:00:00Z')}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <LayoutDashboard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          {rangeLabel}
        </Badge>
        <span className="ml-auto text-sm text-muted-foreground">
          Xin chào, <b className="text-foreground">{user?.fullName || user?.username}</b> 👋
        </span>
      </div>

      {/* Range filter */}
      <DashboardFilter value={range} onChange={setRange} />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Doanh thu"
          icon={Banknote}
          color="success"
          value={kpi ? formatPriceCompact(kpi.revenue) : '—'}
          hint={kpi ? formatPrice(kpi.revenue) : undefined}
          loading={kpiLoading}
        />
        <KpiCard
          label="Tổng đơn"
          icon={ShoppingBag}
          color="info"
          value={kpi?.orders.toLocaleString('vi-VN') ?? '—'}
          hint="Trong khoảng"
          loading={kpiLoading}
          to="/admin/don-hang"
        />
        <KpiCard
          label="User mới"
          icon={UserPlus}
          value={kpi?.newUsers.toLocaleString('vi-VN') ?? '—'}
          loading={kpiLoading}
          to="/admin/nguoi-dung"
        />
        <KpiCard
          label="Đơn chưa giao"
          icon={Clock}
          color="warning"
          value={kpi?.ordersInRange.toLocaleString('vi-VN') ?? '—'}
          hint="pending / confirmed / preparing"
          loading={kpiLoading}
          to="/admin/don-hang"
        />
        <KpiCard
          label="Cảnh báo tồn (1-4)"
          icon={AlertTriangle}
          color={kpi && kpi.criticalStock > 0 ? 'warning' : 'success'}
          value={kpi?.criticalStock.toLocaleString('vi-VN') ?? '—'}
          hint="Realtime — nhắc nhập hàng"
          loading={kpiLoading}
          to="/admin/san-pham"
        />
        <KpiCard
          label="Hết hàng (=0)"
          icon={XCircle}
          color={kpi && kpi.outOfStock > 0 ? 'danger' : 'success'}
          value={kpi?.outOfStock.toLocaleString('vi-VN') ?? '—'}
          hint="Realtime — đang mất doanh thu"
          loading={kpiLoading}
          to="/admin/san-pham"
        />
      </div>

      {/* Charts row 1: Revenue (2 cols) + Sales-by-category (1 col) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart range={range} />
        </div>
        <SalesByCategoryChart limit={5} />
      </div>

      {/* Charts row 2: Stock movement full-width */}
      <StockMovementChart range={range} />

      {/* Widget tables — 2x2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopProductsWidget limit={5} />
        <LatestOrdersWidget range={range} limit={8} />
        <DeadStockWidget days={30} limit={5} />
        <LowRatedWidget limit={5} />
      </div>

      {/* AI section */}
      <Separator />
      <ChatbotSection range={range} />
    </div>
  )
}
