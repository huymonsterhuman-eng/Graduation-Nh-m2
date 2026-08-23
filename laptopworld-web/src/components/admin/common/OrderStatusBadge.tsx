import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderStatus, GoodsIssueStatus, GoodsIssueType } from '@/types/api'

const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Chờ xử lý',        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  confirmed: { label: 'Đã xác nhận',       className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  preparing: { label: 'Đang chuẩn bị',     className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  shipping:  { label: 'Đang giao hàng',    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  delivered: { label: 'Đã giao thành công', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Đã hủy',            className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
}

const ISSUE_STATUS: Record<GoodsIssueStatus, { label: string; className: string }> = {
  pending:   { label: 'Chờ duyệt',   className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  completed: { label: 'Hoàn thành',  className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Đã hủy',      className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
}

const ISSUE_TYPE: Record<GoodsIssueType, { label: string; className: string }> = {
  auto:   { label: 'Tự động (từ đơn)', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  manual: { label: 'Thủ công',         className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status]
  return <Badge className={cn(s.className, className)}>{s.label}</Badge>
}
export const ORDER_STATUS_META = ORDER_STATUS

export function IssueStatusBadge({ status }: { status: GoodsIssueStatus }) {
  const s = ISSUE_STATUS[status]
  return <Badge className={s.className}>{s.label}</Badge>
}

export function IssueTypeBadge({ type }: { type: GoodsIssueType }) {
  const s = ISSUE_TYPE[type]
  return <Badge className={s.className}>{s.label}</Badge>
}
