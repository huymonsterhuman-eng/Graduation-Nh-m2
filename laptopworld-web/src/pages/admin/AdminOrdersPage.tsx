import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Search, Eye, Truck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { OrderStatusBadge, ORDER_STATUS_META } from '@/components/admin/common/OrderStatusBadge'
import { useAdminOrders, useOrderStatusCounts } from '@/hooks/api/useAdminOrders'
import { usePartners } from '@/hooks/api/useAdminInventory'
import { formatPrice, formatDateTime, lastNDaysRange } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderListItem, OrderStatus } from '@/types/api'

const PAY_METHOD: Record<string, string> = { cod: 'COD', vnpay: 'VNPay', momo: 'MoMo' }
const PAY_STATUS: Record<string, { label: string; className: string }> = {
  paid:     { label: 'Đã TT',     className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  unpaid:   { label: 'Chưa TT',   className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  refunded: { label: 'Hoàn tiền', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
}

/** Danh sách tab: All + 6 status. */
const TABS: Array<{ key: 'ALL' | OrderStatus; label: string }> = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'pending',   label: 'Chờ xử lý' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chuẩn bị' },
  { key: 'shipping',  label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã hủy' },
]

export function AdminOrdersPage() {
  const [keyword, setKeyword] = useState('')
  const [tab, setTab] = useState<'ALL' | OrderStatus>('ALL')
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [page, setPage] = useState(0)

  const filter = useMemo(() => ({
    keyword: keyword || undefined,
    status: tab === 'ALL' ? undefined : tab,
    from: range.from,
    to: range.to,
    page,
    size: 20,
  }), [keyword, tab, range, page])

  const { data: paged, isLoading } = useAdminOrders(filter)
  const { data: counts } = useOrderStatusCounts()
  const { data: partners } = usePartners('shipping_provider')

  const partnerMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of partners ?? []) m.set(p.id, p.name)
    return m
  }, [partners])

  const totalAll = useMemo(
    () => Object.values(counts ?? {}).reduce((a, b) => a + b, 0),
    [counts]
  )

  const columns: AdminColumn<OrderListItem>[] = [
    {
      key: 'code', header: 'Mã đơn',
      cell: (o) => (
        <Link to={`/admin/don-hang/${o.id}`}
          className="font-mono text-sm font-medium hover:text-primary">
          {o.code}
        </Link>
      ),
    },
    {
      key: 'items', header: 'SP', align: 'center', className: 'w-16',
      cell: (o) => <Badge variant="outline">{o.itemCount}</Badge>,
    },
    {
      key: 'total', header: 'Tổng', align: 'right',
      cell: (o) => <span className="font-semibold">{formatPrice(o.total)}</span>,
    },
    {
      key: 'status', header: 'Trạng thái',
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: 'payment', header: 'Thanh toán',
      cell: (o) => {
        const p = PAY_STATUS[o.paymentStatus]
        return (
          <div className="space-y-0.5">
            <Badge className={p?.className ?? ''}>{p?.label ?? o.paymentStatus}</Badge>
            <div className="text-xs text-muted-foreground">{PAY_METHOD[o.paymentMethod] ?? o.paymentMethod}</div>
          </div>
        )
      },
    },
    {
      key: 'shipping', header: 'Đơn vị vận chuyển',
      cell: (o) => {
        const partnerName = o.partnerId ? partnerMap.get(o.partnerId) : null
        if (!partnerName) return <span className="text-xs text-muted-foreground">Chưa bàn giao</span>
        return (
          <div className="flex items-center gap-1 text-sm">
            <Truck className="h-3 w-3 text-muted-foreground" /> {partnerName}
          </div>
        )
      },
    },
    {
      key: 'time', header: 'Thời gian',
      cell: (o) => <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right', className: 'w-16',
      cell: (o) => (
        <Button variant="ghost" size="icon" asChild title="Xem chi tiết">
          <Link to={`/admin/don-hang/${o.id}`}><Eye className="h-4 w-4" /></Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Đơn hàng"
        icon={ShoppingBag}
        sprint="Sprint 9E"
        description={`${paged?.totalElements ?? 0} đơn khớp bộ lọc · ${totalAll} tổng`}
        actions={
          <Button asChild>
            <Link to="/admin/don-hang/moi">
              <Plus className="mr-2 h-4 w-4" /> Tạo đơn
            </Link>
          </Button>
        }
      />

      {/* Tabs status */}
      <Card className="overflow-x-auto p-1">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const count = t.key === 'ALL' ? totalAll : (counts?.[t.key] ?? 0)
            const active = tab === t.key
            const color = t.key === 'ALL'
              ? 'text-foreground'
              : ORDER_STATUS_META[t.key as OrderStatus].className
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key); setPage(0) }}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span>{t.label}</span>
                <span className={cn(
                  'grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[10px] font-semibold',
                  active ? 'bg-primary-foreground text-primary' : color
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Filter row — items-end để label align */}
      <Card className="grid items-end gap-3 p-3 md:grid-cols-[1fr_160px_160px]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Mã đơn / tên khách / SĐT..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Từ ngày</label>
          <input type="date" value={range.from}
            max={range.to}
            onChange={(e) => { setRange({ ...range, from: e.target.value }); setPage(0) }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đến ngày</label>
          <input type="date" value={range.to}
            min={range.from}
            onChange={(e) => { setRange({ ...range, to: e.target.value }); setPage(0) }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </Card>

      <AdminTable<OrderListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="Không có đơn nào khớp bộ lọc"
      />

      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang <b>{page + 1}</b> / {paged.totalPages} · Tổng {paged.totalElements} đơn
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              disabled={!paged.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >Trước</Button>
            <Button variant="outline" size="sm"
              disabled={!paged.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >Sau</Button>
          </div>
        </div>
      )}
    </div>
  )
}
