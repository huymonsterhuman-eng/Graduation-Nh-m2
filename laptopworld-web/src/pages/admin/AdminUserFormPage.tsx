import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Save, Eye, User as UserIcon, ShieldCheck, Lock,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import {
  useAdminUserDetail, useCreateAdminUser, useUpdateAdminUser,
  useSetUserRoles, useSetUserStatus,
} from '@/hooks/api/useAdminUsers'
import { useAdminRoles } from '@/hooks/api/useRoles'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminUserStatus } from '@/types/api'

const STATUS_OPTIONS: { value: AdminUserStatus; label: string; hint: string }[] = [
  { value: 'active',     label: '🟢 Hoạt động',     hint: 'Cho phép đăng nhập bình thường' },
  { value: 'banned',     label: '🔴 Đã khóa',       hint: 'Không cho đăng nhập' },
  { value: 'unverified', label: '⚪ Chưa xác thực', hint: 'Chưa xác thực email — chưa được login' },
]

const GENDER_OPTIONS = [
  { value: '',       label: '—' },
  { value: 'male',   label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other',  label: 'Khác' },
]

const ROLE_COLOR: Record<string, string> = {
  ADMIN:    'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  STAFF:    'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  CUSTOMER: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
}
function roleColor(name: string) {
  return ROLE_COLOR[name.toUpperCase()] ?? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
}
const HIDDEN_ROLES = new Set(['CUSTOMER'])   // giống AssignRolesDialog

interface FormState {
  username: string
  email: string
  password: string
  fullName: string
  phone: string
  gender: '' | 'male' | 'female' | 'other'
  birthday: string   // yyyy-MM-dd
  status: AdminUserStatus
  roleIds: Set<number>
}

function emptyForm(): FormState {
  return {
    username: '', email: '', password: '',
    fullName: '', phone: '', gender: '', birthday: '',
    status: 'active', roleIds: new Set(),
  }
}

export function AdminUserFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const userId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  const { data: detail, isLoading: detailLoading } = useAdminUserDetail(userId)
  const { data: allRoles, isLoading: rolesLoading } = useAdminRoles()
  const create = useCreateAdminUser()
  const update = useUpdateAdminUser()
  const setRoles = useSetUserRoles()
  const setStatus = useSetUserStatus()

  const [form, setForm] = useState<FormState>(emptyForm())
  const [passwordVisible, setPasswordVisible] = useState(false)

  // Load form khi edit
  useEffect(() => {
    if (!isEdit || !detail) return
    setForm({
      username: detail.username,
      email: detail.email,
      password: '',
      fullName: detail.fullName ?? '',
      phone: detail.phone ?? '',
      gender: (detail.gender as FormState['gender']) ?? '',
      birthday: detail.birthday ?? '',
      status: detail.status,
      roleIds: new Set(detail.roles.map((r) => r.id)),
    })
  }, [isEdit, detail])

  // Filter role hiển thị (ẩn CUSTOMER)
  const visibleRoles = useMemo(
    () => (allRoles ?? []).filter((r) => !HIDDEN_ROLES.has(r.name.toUpperCase())),
    [allRoles]
  )
  const hiddenRoleIds = useMemo(
    () => new Set((allRoles ?? [])
      .filter((r) => HIDDEN_ROLES.has(r.name.toUpperCase()))
      .map((r) => r.id)),
    [allRoles]
  )

  const toggleRole = (rid: number, on: boolean) => {
    setForm((f) => {
      const next = new Set(f.roleIds)
      if (on) next.add(rid); else next.delete(rid)
      return { ...f, roleIds: next }
    })
  }

  const isSelf = isEdit && currentUser?.id === detail?.id
  const originalRoleIds = useMemo(() => {
    if (!detail) return new Set<number>()
    return new Set(detail.roles.map((r) => r.id))
  }, [detail])
  const rolesChanged = useMemo(() => {
    if (!isEdit) return false
    if (form.roleIds.size !== originalRoleIds.size) return true
    for (const id of form.roleIds) if (!originalRoleIds.has(id)) return true
    return false
  }, [isEdit, form.roleIds, originalRoleIds])
  const statusChanged = isEdit && detail && form.status !== detail.status

  const validate = (): string | null => {
    if (!isEdit) {
      if (!form.username.trim()) return 'Vui lòng nhập tên đăng nhập'
      if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) return 'Tên đăng nhập chỉ chứa chữ, số, gạch dưới'
      if (form.username.trim().length < 3) return 'Tên đăng nhập tối thiểu 3 ký tự'
      if (!form.email.trim()) return 'Vui lòng nhập email'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email không hợp lệ'
      if (!form.password || form.password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự'
    }
    if (form.phone && !/^[0-9+()\-\s]{8,20}$/.test(form.phone)) {
      return 'Số điện thoại không hợp lệ'
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    try {
      if (isEdit && userId) {
        // 1) Update profile
        await update.mutateAsync({
          id: userId,
          body: {
            fullName: form.fullName || undefined,
            phone: form.phone || undefined,
            gender: form.gender || undefined,
            birthday: form.birthday || undefined,
          },
        })

        // 2) Nếu status đổi → gọi setStatus (có guardrails backend)
        if (statusChanged) {
          await setStatus.mutateAsync({ id: userId, status: form.status })
        }

        // 3) Nếu roles đổi → gọi setRoles (union hidden để giữ CUSTOMER)
        if (rolesChanged) {
          const userHiddenIds = (detail?.roles ?? [])
            .filter((r) => hiddenRoleIds.has(r.id))
            .map((r) => r.id)
          const finalRoleIds = Array.from(new Set([...form.roleIds, ...userHiddenIds]))
          await setRoles.mutateAsync({ id: userId, roleIds: finalRoleIds })
        }

        toast.success('Đã cập nhật người dùng')
        navigate(`/admin/nguoi-dung/${userId}`)
      } else {
        // Create — gộp cả roles + status vào 1 request
        // (backend create hỗ trợ status/roleIds trong body, không cần call phụ)
        const created = await create.mutateAsync({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName || undefined,
          phone: form.phone || undefined,
          gender: form.gender || undefined,
          birthday: form.birthday || undefined,
          status: form.status,
          roleIds: Array.from(form.roleIds),
        })
        toast.success(`Đã tạo tài khoản ${created?.username}`)
        if (created?.id) navigate(`/admin/nguoi-dung/${created.id}`)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (isEdit && detailLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const saving = create.isPending || update.isPending || setRoles.isPending || setStatus.isPending

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <Button variant="ghost" size="icon"
              onClick={() => navigate(isEdit ? `/admin/nguoi-dung/${userId}` : '/admin/nguoi-dung')}
              title="Quay lại">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {isEdit ? `Chỉnh sửa: ${detail?.username || ''}` : 'Thêm người dùng mới'}
          </span>
        }
        sprint="Sprint 9G"
        description={isEdit
          ? 'Cập nhật thông tin cá nhân, trạng thái và vai trò.'
          : 'Tạo tài khoản mới. Email sẽ được xem là đã xác thực (admin tạo).'}
        actions={
          <>
            {isEdit && (
              <Button variant="outline" asChild>
                <Link to={`/admin/nguoi-dung/${userId}`}>
                  <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                </Link>
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={saving}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                : <><Save className="mr-2 h-4 w-4" /> {isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}</>}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div className="space-y-4">
          <AdminSection title="Thông tin cơ bản" icon={UserIcon}>
            <div className="space-y-4">
              {!isEdit && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Tên đăng nhập *</Label>
                    <Input id="username" autoFocus maxLength={60}
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="vd: nguyen_van_a" />
                    <p className="text-xs text-muted-foreground">
                      Chỉ chứa chữ, số, dấu gạch dưới. Không đổi được sau khi tạo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" maxLength={150}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com" />
                    <p className="text-xs text-muted-foreground">Không đổi được sau khi tạo.</p>
                  </div>
                </div>
              )}

              {isEdit && detail && (
                <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">Tên đăng nhập</div>
                    <div className="mt-0.5 font-mono">{detail.username}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">Email</div>
                    <div className="mt-0.5">{detail.email}
                      {detail.emailVerified && (
                        <Badge variant="outline" className="ml-1 text-[9px]">✓ verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> Mật khẩu ban đầu *
                  </Label>
                  <div className="flex gap-2">
                    <Input id="password"
                      type={passwordVisible ? 'text' : 'password'}
                      minLength={8} maxLength={100}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Tối thiểu 8 ký tự" />
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setPasswordVisible((v) => !v)}>
                      {passwordVisible ? 'Ẩn' : 'Hiện'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Đưa mật khẩu này cho khách/nhân viên. Họ nên đổi lại sau khi đăng nhập lần đầu.
                    <b> Admin không thể xem lại mật khẩu này sau khi tạo.</b>
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input id="fullName" maxLength={150}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" maxLength={20}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0912345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Giới tính</Label>
                  <Select value={form.gender || '__none__'}
                    onValueChange={(v) => setForm({ ...form, gender: (v === '__none__' ? '' : v) as FormState['gender'] })}>
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {GENDER_OPTIONS.filter((g) => g.value !== '').map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Ngày sinh</Label>
                  <input id="birthday" type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Phân vai trò" icon={ShieldCheck}
            description={
              <>Tick các vai trò quản trị. Vai trò khách hàng mặc định không hiện ở đây (không có quyền admin).
                {isSelf && <span className="text-amber-600 dark:text-amber-400"> Không thể tự gỡ ADMIN của chính mình.</span>}
              </>
            }>
            {rolesLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleRoles.map((r) => {
                  const checked = form.roleIds.has(r.id)
                  return (
                    <label key={r.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition',
                        checked ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
                      )}>
                      <input type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                        checked={checked}
                        onChange={(e) => toggleRole(r.id, e.target.checked)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={roleColor(r.name)}>{r.name}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {r.permissionCount} quyền
                          </span>
                        </div>
                        {r.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </AdminSection>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <AdminSection title="Trạng thái tài khoản" icon={Lock}>
            <div className="space-y-3">
              <Select value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as AdminUserStatus })}
                disabled={isSelf && !isEdit /* create not self, chỉ disable ở edit */}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {STATUS_OPTIONS.find((s) => s.value === form.status)?.hint}
              </p>

              {isSelf && form.status !== 'active' && detail?.status === 'active' && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-800 dark:text-rose-300">
                  ⚠️ Bạn đang định tự khóa/tự chuyển bản thân sang trạng thái không active — hệ thống sẽ chặn khi lưu.
                </div>
              )}
              {statusChanged && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                  Trạng thái sẽ chuyển: <b>{detail?.status}</b> → <b>{form.status}</b>
                </div>
              )}
            </div>
          </AdminSection>

          {isEdit && detail && (
            <AdminSection title="Thông tin" icon={UserIcon} compact>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{detail.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạo lúc:</span>
                  <span>{formatDate(detail.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cập nhật:</span>
                  <span>{formatDate(detail.updatedAt)}</span>
                </div>
              </div>
            </AdminSection>
          )}

          {isEdit && (
            <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
              💡 <b>Đổi mật khẩu:</b> hệ thống không cho admin đổi mật khẩu của khách. Nếu quên,
              khách tự bấm "Quên mật khẩu" ở trang đăng nhập.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
