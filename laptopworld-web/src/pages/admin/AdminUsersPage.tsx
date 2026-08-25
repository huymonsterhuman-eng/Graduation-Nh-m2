import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Search, Eye, Pencil, Copy,
  UsersRound, UserCheck, UserX, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { KpiCard } from '@/components/admin/dashboard/KpiCard'
import {
  useAdminUsers, useAdminUserStats,
} from '@/hooks/api/useAdminUsers'
import { useAdminRoles } from '@/hooks/api/useRoles'
import { formatDate } from '@/lib/format'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import type { AdminUserListItem, AdminUserStatus } from '@/types/api'

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

function initials(name: string | undefined, fallback: string) {
  const s = (name || fallback).trim()
  const parts = s.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

const STATUS_ALL = '__all__'
const ROLE_ALL = '__all__'

export function AdminUsersPage() {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<AdminUserStatus | ''>('')
  const [roleId, setRoleId] = useState<number | ''>('')
  const [page, setPage] = useState(0)

  const filter = useMemo(() => ({
    keyword: keyword || undefined,
    status: status || undefined,
    roleId: roleId || undefined,
    page,
    size: 20,
  }), [keyword, status, roleId, page])

  const { data: paged, isLoading } = useAdminUsers(filter)
  const { data: stats, isLoading: statsLoading } = useAdminUserStats()
  const { data: roles } = useAdminRoles()
  const { copy } = useCopyToClipboard()

  const columns: AdminColumn<AdminUserListItem>[] = [
    {
      key: 'username', header: 'Tên đăng nhập',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            {u.avatar && <AvatarImage src={u.avatar} alt={u.username} />}
            <AvatarFallback className="text-xs">{initials(u.fullName, u.username)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 font-medium">
            {u.username}
            {u.emailVerified && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]" title="Email đã xác thực">✓</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'fullName', header: 'Họ tên',
      cell: (u) => (
        <span className="text-sm">
          {u.fullName || <span className="italic text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'email', header: 'Email',
      cell: (u) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{u.email}</span>
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5 opacity-40 hover:opacity-100"
            title="Sao chép email"
            onClick={(e) => { e.stopPropagation(); copy(u.email, 'Đã sao chép email') }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Số điện thoại', className: 'w-36',
      cell: (u) => (
        <span className="text-sm">
          {u.phone || <span className="italic text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'roles', header: 'Vai trò', className: 'w-52',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roleNames.length === 0 && (
            <span className="text-xs italic text-muted-foreground">Chưa có</span>
          )}
          {u.roleNames.map((r) => (
            <Badge key={r} className={roleColor(r)}>{r}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status', header: 'Trạng thái', align: 'center', className: 'w-36',
      cell: (u) => <Badge className={STATUS_META[u.status].className}>{STATUS_META[u.status].label}</Badge>,
    },
    {
      key: 'createdAt', header: 'Ngày tạo', className: 'w-28',
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-52',
      cell: (u) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/nguoi-dung/${u.id}`}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/nguoi-dung/${u.id}/sua`}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Chỉnh sửa
            </Link>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Người dùng"
        icon={Users}
        sprint="Sprint 9G"
        description={paged
          ? `${paged.totalElements} khách hàng khớp bộ lọc`
          : 'Quản lý khách hàng: khóa/mở tài khoản và gán vai trò.'}
        actions={
          <Button asChild>
            <Link to="/admin/nguoi-dung/moi">
              <UserPlus className="mr-2 h-4 w-4" /> Thêm người dùng
            </Link>
          </Button>
        }
      />

      {/* KPI cards — 4 số theo yêu cầu (total / active / banned / newThisWeek). unverified vẫn có nhưng đưa vào tooltip hint để giảm nhiễu. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tổng người dùng"
          icon={UsersRound}
          value={stats?.total.toLocaleString('vi-VN') ?? '—'}
          hint="Tất cả tài khoản trong hệ thống"
          loading={statsLoading}
        />
        <KpiCard
          label="Đang hoạt động"
          icon={UserCheck}
          color="success"
          value={stats?.active.toLocaleString('vi-VN') ?? '—'}
          hint="Tài khoản có thể đăng nhập"
          loading={statsLoading}
        />
        <KpiCard
          label="Đã khóa"
          icon={UserX}
          color="danger"
          value={stats?.banned.toLocaleString('vi-VN') ?? '—'}
          hint={stats
            ? `${stats.unverified.toLocaleString('vi-VN')} chưa xác thực email`
            : 'Tài khoản bị hạn chế truy cập'}
          loading={statsLoading}
        />
        <KpiCard
          label="Mới tuần này"
          icon={UserPlus}
          color="info"
          value={stats?.newThisWeek.toLocaleString('vi-VN') ?? '—'}
          hint="Đăng ký từ đầu tuần (thứ Hai)"
          loading={statsLoading}
        />
      </div>

      {/* Filter */}
      <Card className="grid items-end gap-3 p-3 md:grid-cols-[1fr_180px_200px]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Username / email / họ tên..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</label>
          <Select
            value={status || STATUS_ALL}
            onValueChange={(v) => { setStatus(v === STATUS_ALL ? '' : (v as AdminUserStatus)); setPage(0) }}
          >
            <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="banned">Đã khóa</SelectItem>
              <SelectItem value="unverified">Chưa xác thực</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vai trò</label>
          <Select
            value={roleId === '' ? ROLE_ALL : String(roleId)}
            onValueChange={(v) => { setRoleId(v === ROLE_ALL ? '' : Number(v)); setPage(0) }}
          >
            <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLE_ALL}>Tất cả vai trò</SelectItem>
              {(roles ?? []).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <AdminTable<AdminUserListItem>
        columns={columns}
        data={paged?.content}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="Không có khách hàng nào khớp bộ lọc"
      />

      {paged && paged.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang <b>{page + 1}</b> / {paged.totalPages} · Tổng {paged.totalElements} khách hàng
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

      <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
        💡 <b>Lưu ý:</b> Khóa tài khoản và gán vai trò nằm trong trang <b>Chỉnh sửa</b>.
        Không thể tự khóa/tự gỡ vai trò ADMIN của chính mình. Không thể khóa hoặc gỡ vai trò
        ADMIN của người ADMIN cuối cùng còn hoạt động.
      </div>
    </div>
  )
}
