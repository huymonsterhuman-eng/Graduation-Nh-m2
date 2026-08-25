import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Mail, Phone, Calendar, ShieldCheck, ShoppingBag,
  Star, Wallet, MapPin, Ticket, Pencil, Eye, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import {
  useAdminUserAddresses, useAdminUserDetail, useAdminUserOrders,
  useAdminUserReviews, useAdminUserVouchers,
} from '@/hooks/api/useAdminUsers'
import { formatDate, formatDateTime, formatPrice } from '@/lib/format'
import type {
  Address, AdminUserStatus, AdminUserVoucherItem, OrderListItem, Review,
} from '@/types/api'



const STATUS_META: Record<AdminUserStatus, { label: string; className: string }> = {
  active:     { label: 'Hoạt động',     className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  banned:     { label: 'Đã khóa',       className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  unverified: { label: 'Chưa xác thực', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN:    'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  STAFF:    'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  CUSTOMER: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
}
function roleColor(name: string) {
  return ROLE_COLOR[name.toUpperCase()] ?? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
}

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Chờ xử lý',    className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  confirmed: { label: 'Đã xác nhận',  className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  preparing: { label: 'Đang chuẩn bị', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  shipping:  { label: 'Đang giao',    className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  delivered: { label: 'Đã giao',      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Đã hủy',       className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
}
const PAY_STATUS_META: Record<string, { label: string; className: string }> = {
  paid:     { label: 'Đã TT',   className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  unpaid:   { label: 'Chưa TT', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  refunded: { label: 'Hoàn tiền', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
}

function initials(name: string | undefined, fallback: string) {
  const s = (name || fallback).trim()
  const parts = s.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const { data: user, isLoading } = useAdminUserDetail(userId)

  if (isLoading || !user) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/nguoi-dung')} title="Quay lại danh sách">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            Chi tiết khách hàng
          </span>
        }
        sprint="Sprint 9G"
        actions={
          <Button asChild>
            <Link to={`/admin/nguoi-dung/${user.id}/sua`}>
              <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
            </Link>
          </Button>
        }
      />

      {/* Info card + stats */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="h-20 w-20">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
            <AvatarFallback className="text-xl">{initials(user.fullName, user.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{user.fullName || user.username}</h2>
              <Badge className={STATUS_META[user.status].className}>{STATUS_META[user.status].label}</Badge>
              {user.emailVerified && (
                <Badge variant="outline" className="text-[10px]">✓ Email đã xác thực</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">@{user.username}</div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {user.phone || <span className="italic text-muted-foreground">Chưa có SĐT</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Tạo lúc: {formatDate(user.createdAt)}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                Giới tính: {user.gender || '—'}
                {user.birthday && <span> · Sinh: {formatDate(user.birthday)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-1">Vai trò:</span>
              {user.roles.length === 0
                ? <span className="text-xs italic text-muted-foreground">Chưa có</span>
                : user.roles.map((r) => (
                    <Badge key={r.id} className={roleColor(r.name)} title={r.description || ''}>{r.name}</Badge>
                  ))
              }
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" /> Đơn hàng
            </div>
            <div className="mt-1 text-2xl font-bold">{user.stats.orderCount}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Star className="h-3.5 w-3.5" /> Đánh giá
            </div>
            <div className="mt-1 text-2xl font-bold">{user.stats.reviewCount}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Tổng chi tiêu
            </div>
            <div className="mt-1 text-lg font-bold text-primary">{formatPrice(user.stats.totalSpent)}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Chỉ tính đơn đã giao</div>
          </div>
        </div>
      </Card>

      {/* 4 tabs */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-3.5 w-3.5" /> Lịch sử mua hàng
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-3.5 w-3.5" /> Sổ địa chỉ
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-3.5 w-3.5" /> Đánh giá
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Ticket className="h-3.5 w-3.5" /> Kho voucher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-3">
          <OrdersTab userId={userId!} />
        </TabsContent>
        <TabsContent value="addresses" className="mt-3">
          <AddressesTab userId={userId!} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-3">
          <ReviewsTab userId={userId!} />
        </TabsContent>
        <TabsContent value="vouchers" className="mt-3">
          <VouchersTab userId={userId!} />
        </TabsContent>
      </Tabs>

    </div>
  )
}

// ==================== Tab: Orders ====================
function OrdersTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(0)
  const { data: paged, isLoading } = useAdminUserOrders(userId, page, 20)

  const columns: AdminColumn<OrderListItem>[] = [
    {
      key: 'code', header: 'Mã đơn',
      cell: (o) => (
        <Link to={`/admin/don-hang/${o.id}`}
          className="font-mono text-sm font-medium hover:text-primary">{o.code}</Link>
      ),
    },
    {
      key: 'items', header: 'SP', align: 'center', className: 'w-16',
      cell: (o) => <Badge variant="outline">{o.itemCount}</Badge>,
    },
    {
      key: 'total', header: 'Tổng tiền', align: 'right',
      cell: (o) => <span className="font-semibold">{formatPrice(o.total)}</span>,
    },
    {
      key: 'status', header: 'Trạng thái',
      cell: (o) => {
        const m = ORDER_STATUS_META[o.status] ?? { label: o.status, className: '' }
        return <Badge className={m.className}>{m.label}</Badge>
      },
    },
    {
      key: 'payment', header: 'Thanh toán',
      cell: (o) => {
        const m = PAY_STATUS_META[o.paymentStatus]
        return <Badge className={m?.className ?? ''}>{m?.label ?? o.paymentStatus}</Badge>
      },
    },
    {
      key: 'time', header: 'Ngày đặt',
      cell: (o) => <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: 'action', header: '', align: 'right', className: 'w-24',
      cell: (o) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/don-hang/${o.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Xem</Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <AdminTable<OrderListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="Khách hàng chưa có đơn hàng nào"
      />
      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang <b>{page + 1}</b> / {paged.totalPages} · Tổng {paged.totalElements} đơn
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!paged.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>Trước</Button>
            <Button variant="outline" size="sm" disabled={!paged.hasNext}
              onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Tab: Addresses ====================
function AddressesTab({ userId }: { userId: number }) {
  const { data: addresses, isLoading } = useAdminUserAddresses(userId)

  const columns: AdminColumn<Address>[] = [
    {
      key: 'name', header: 'Người nhận',
      cell: (a) => (
        <div className="flex items-center gap-2 font-medium">
          {a.name}
          {a.isDefault && <Badge variant="secondary" className="text-[10px]">Mặc định</Badge>}
        </div>
      ),
    },
    { key: 'phone', header: 'SĐT', className: 'w-32', cell: (a) => a.phone },
    {
      key: 'address', header: 'Địa chỉ đầy đủ',
      cell: (a) => (
        <div className="text-sm">
          {a.address}
          <div className="text-xs text-muted-foreground">
            {[a.ward, a.district, a.province].filter(Boolean).join(', ')}
          </div>
        </div>
      ),
    },
    {
      key: 'created', header: 'Ngày tạo', className: 'w-28',
      cell: (a) => <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>,
    },
  ]

  return (
    <AdminTable<Address>
      columns={columns}
      data={addresses}
      rowKey={(a) => a.id}
      isLoading={isLoading}
      emptyMessage="Khách hàng chưa có địa chỉ nào trong sổ"
    />
  )
}

// ==================== Tab: Reviews ====================
function ReviewsTab({ userId }: { userId: number }) {
  const { data: reviews, isLoading } = useAdminUserReviews(userId)

  const columns: AdminColumn<Review>[] = [
    {
      key: 'product', header: 'Sản phẩm',
      cell: (r) => (
        <Link to={`/san-pham/${r.productId}`} target="_blank"
          className="text-sm hover:text-primary inline-flex items-center gap-1">
          {r.productName ?? `SP #${r.productId}`}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: 'rating', header: 'Sao', align: 'center', className: 'w-20',
      cell: (r) => (
        <div className="inline-flex items-center gap-0.5 text-amber-500">
          {'★'.repeat(r.rating)}<span className="text-muted-foreground">{'★'.repeat(5 - r.rating).replace(/★/g, '☆')}</span>
        </div>
      ),
    },
    {
      key: 'comment', header: 'Nội dung',
      cell: (r) => (
        <div className="max-w-xl space-y-1">
          <div className="text-sm line-clamp-2">{r.comment || <span className="italic text-muted-foreground">(không có nội dung)</span>}</div>
          {r.adminReply && (
            <div className="rounded border-l-2 border-primary/40 bg-muted/40 px-2 py-1 text-xs">
              <b>Phản hồi:</b> {r.adminReply}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Trạng thái', className: 'w-32',
      cell: (r) => r.isHidden
        ? <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300">Đã ẩn</Badge>
        : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Hiển thị</Badge>,
    },
    {
      key: 'time', header: 'Ngày đánh giá', className: 'w-32',
      cell: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
    },
  ]

  return (
    <AdminTable<Review>
      columns={columns}
      data={reviews}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyMessage="Khách hàng chưa viết đánh giá nào"
    />
  )
}

// ==================== Tab: Vouchers ====================
function VouchersTab({ userId }: { userId: number }) {
  const { data: vouchers, isLoading } = useAdminUserVouchers(userId)
  const now = useMemo(() => new Date(), [])

  const columns: AdminColumn<AdminUserVoucherItem>[] = [
    {
      key: 'code', header: 'Mã voucher',
      cell: (v) => (
        <div>
          <div className="font-mono text-sm font-semibold">{v.code}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{v.name}</div>
        </div>
      ),
    },
    {
      key: 'discount', header: 'Ưu đãi', className: 'w-40',
      cell: (v) => (
        <span className="font-medium">
          {v.type === 'percent'
            ? `${v.discountAmount}%${v.maxDiscount ? ` (tối đa ${formatPrice(v.maxDiscount)})` : ''}`
            : `−${formatPrice(v.discountAmount)}`}
        </span>
      ),
    },
    {
      key: 'min', header: 'Đơn tối thiểu', className: 'w-36',
      cell: (v) => <span className="text-sm text-muted-foreground">{formatPrice(v.minOrderValue)}</span>,
    },
    {
      key: 'expires', header: 'Hạn dùng', className: 'w-40',
      cell: (v) => {
        if (!v.expiresAt) return <span className="text-xs text-muted-foreground">Không hạn</span>
        const expired = new Date(v.expiresAt) < now
        return (
          <span className={`text-xs ${expired ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {formatDate(v.expiresAt)} {expired && '(hết hạn)'}
          </span>
        )
      },
    },
    {
      key: 'status', header: 'Trạng thái', className: 'w-40',
      cell: (v) => {
        if (v.isUsed) {
          return (
            <div className="space-y-0.5">
              <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300">Đã dùng</Badge>
              {v.orderId && (
                <Link to={`/admin/don-hang/${v.orderId}`}
                  className="block text-[10px] text-primary hover:underline">
                  Đơn #{v.orderId}
                </Link>
              )}
            </div>
          )
        }
        const expired = v.expiresAt && new Date(v.expiresAt) < now
        return expired
          ? <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300">Hết hạn</Badge>
          : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Còn dùng được</Badge>
      },
    },
    {
      key: 'saved', header: 'Lưu lúc', className: 'w-32',
      cell: (v) => <span className="text-xs text-muted-foreground">{formatDate(v.savedAt)}</span>,
    },
  ]

  return (
    <AdminTable<AdminUserVoucherItem>
      columns={columns}
      data={vouchers}
      rowKey={(v) => v.id}
      isLoading={isLoading}
      emptyMessage="Khách hàng chưa lưu voucher nào"
    />
  )
}
