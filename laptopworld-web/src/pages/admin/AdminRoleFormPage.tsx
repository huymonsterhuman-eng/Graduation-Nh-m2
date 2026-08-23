import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, ShieldCheck, ListChecks, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import {
  useRoleDetail, useAllPermissions, useCreateRole, useUpdateRole,
  type RoleInput,
} from '@/hooks/api/useRoles'
import type { PermissionMeta } from '@/types/api'
import { cn } from '@/lib/utils'

const ADMIN_ROLE_NAMES = ['ADMIN']
function isProtected(name: string) {
  return ADMIN_ROLE_NAMES.includes(name.toUpperCase())
}

/** Màu badge cho 4 nhóm — cùng bảng màu TGDĐ (xanh dương / vàng / xanh lá / đỏ). */
const GROUP_COLORS: Record<string, string> = {
  '🔐 Hệ thống':               'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  '📦 Sản phẩm & Nội dung':    'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  '🏭 Kho & Vận chuyển':       'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  '🛒 Bán hàng & Khách hàng':  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
}

interface FormState {
  name: string
  description: string
  permissions: Set<string>
}

function emptyForm(): FormState {
  return { name: '', description: '', permissions: new Set() }
}

export function AdminRoleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const roleId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const { data: detail, isLoading } = useRoleDetail(roleId)
  const { data: allPerms } = useAllPermissions()
  const create = useCreateRole()
  const update = useUpdateRole()

  const [form, setForm] = useState<FormState>(emptyForm())

  useEffect(() => {
    if (!detail) return
    setForm({
      name: detail.name,
      description: detail.description ?? '',
      permissions: new Set(detail.permissions ?? []),
    })
  }, [detail])

  // Nhóm permission theo groupName (giữ thứ tự backend trả về)
  const groups = useMemo(() => {
    if (!allPerms) return []
    const map = new Map<string, PermissionMeta[]>()
    for (const p of allPerms) {
      if (!map.has(p.groupName)) map.set(p.groupName, [])
      map.get(p.groupName)!.push(p)
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  }, [allPerms])

  const adminLocked = isProtected(form.name) && isEdit

  const togglePerm = (code: string, on: boolean) => {
    setForm((f) => {
      const next = new Set(f.permissions)
      if (on) next.add(code)
      else next.delete(code)
      return { ...f, permissions: next }
    })
  }

  const toggleGroupAll = (groupItems: PermissionMeta[], on: boolean) => {
    setForm((f) => {
      const next = new Set(f.permissions)
      for (const p of groupItems) {
        if (on) next.add(p.code)
        else next.delete(p.code)
      }
      return { ...f, permissions: next }
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên vai trò'); return }
    const body: RoleInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      permissions: Array.from(form.permissions),
    }
    try {
      if (isEdit && roleId) {
        await update.mutateAsync({ id: roleId, body })
        toast.success('Đã cập nhật vai trò')
      } else {
        const created = await create.mutateAsync(body)
        toast.success('Đã tạo vai trò mới')
        if (created?.id) navigate(`/admin/vai-tro/${created.id}/sua`, { replace: true })
      }
    } catch (e) { toast.error((e as Error).message) }
  }

  if (isEdit && isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const saving = create.isPending || update.isPending
  const totalSelected = form.permissions.size

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <Link to="/admin/vai-tro">
              <Button variant="ghost" size="icon" title="Quay lại danh sách">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            {isEdit ? `Sửa vai trò: ${detail?.name || ''}` : 'Tạo vai trò mới'}
          </span>
        }
        sprint="Sprint 9G-perm"
        description={isEdit && detail
          ? <>Đang sửa: <b>{detail.name}</b> — {detail.userCount} người đang mang, {detail.permissions.length} quyền</>
          : 'Đặt tên vai trò và tick các quyền tương ứng. Người có vai trò sẽ chỉ thấy các menu và gọi được các API tương ứng.'}
        actions={
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
              : <><Save className="mr-2 h-4 w-4" /> Lưu vai trò</>}
          </Button>
        }
      />

      {adminLocked && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <b>⚠️ Vai trò ADMIN được bảo vệ:</b> không đổi được tên và luôn có tất cả quyền.
          Bạn chỉ có thể sửa mô tả.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div className="space-y-4">
          <AdminSection title="Thông tin vai trò" icon={ShieldCheck}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên vai trò *</Label>
                <Input
                  id="name" autoFocus maxLength={50}
                  disabled={adminLocked}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Nhân viên bán hàng, Thủ kho, Người viết bài"
                />
                <p className="text-xs text-muted-foreground">
                  Đặt tên dễ hiểu — sẽ hiển thị khi gán cho user.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea
                  id="description" rows={2} maxLength={255}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Giải thích ngắn gọn phạm vi công việc..."
                />
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title="Phân quyền chi tiết"
            icon={ListChecks}
            description={
              <>Tick những quyền vai trò này được phép. Hệ thống sẽ tổng hợp tất cả tab.
                {adminLocked && <span className="text-amber-600 dark:text-amber-400"> (ADMIN có sẵn tất cả, không cần chọn.)</span>}
              </>
            }
          >
            {groups.length > 0 ? (
              <Tabs defaultValue={groups[0].name} className="w-full">
                <TabsList className="mb-3 h-auto flex-wrap justify-start gap-1">
                  {groups.map((g) => {
                    const selectedInGroup = g.items.filter((p) => form.permissions.has(p.code)).length
                    return (
                      <TabsTrigger key={g.name} value={g.name} className="gap-2">
                        <span>{g.name}</span>
                        {selectedInGroup > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-[10px]">
                            {selectedInGroup}/{g.items.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {groups.map((g) => {
                  const allChecked = g.items.every((p) => form.permissions.has(p.code))
                  const someChecked = g.items.some((p) => form.permissions.has(p.code))
                  return (
                    <TabsContent key={g.name} value={g.name}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              disabled={adminLocked}
                              checked={allChecked}
                              ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                              onChange={(e) => toggleGroupAll(g.items, e.target.checked)}
                            />
                            Chọn tất cả trong nhóm
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {g.items.filter((p) => form.permissions.has(p.code)).length} / {g.items.length} đã chọn
                          </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {g.items.map((p) => {
                            const checked = form.permissions.has(p.code)
                            return (
                              <label
                                key={p.code}
                                className={cn(
                                  'flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition',
                                  checked
                                    ? 'border-primary/50 bg-primary/5'
                                    : 'hover:bg-muted/50',
                                  adminLocked && 'cursor-not-allowed opacity-70'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                                  disabled={adminLocked}
                                  checked={checked}
                                  onChange={(e) => togglePerm(p.code, e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="leading-tight">{p.label}</div>
                                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                    {p.code}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Đang tải danh sách quyền...
              </div>
            )}
          </AdminSection>
        </div>

        {/* Aside — panel tóm tắt quyền hạn */}
        <div className="space-y-4">
          <AdminSection
            title="📋 Tóm tắt quyền hạn"
            icon={ListChecks}
            description="Danh sách quyền đang được chọn"
          >
            {totalSelected === 0 ? (
              <div className="py-6 text-center text-sm italic text-muted-foreground">
                Chưa có quyền nào được chọn
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => {
                  const inGroup = g.items.filter((p) => form.permissions.has(p.code))
                  if (inGroup.length === 0) return null
                  const color = GROUP_COLORS[g.name] ?? 'bg-slate-500/15 text-slate-700'
                  return (
                    <div key={g.name}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>{g.name}</span>
                        <span className="text-primary">{inGroup.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {inGroup.map((p) => (
                          <span key={p.code}
                                className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', color)}>
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div className="mt-2 flex items-center justify-between border-t pt-3 text-xs font-bold uppercase">
                  <span className="text-muted-foreground">Tổng cộng:</span>
                  <span className="text-lg text-primary">{totalSelected}</span>
                </div>
              </div>
            )}
          </AdminSection>

          <AdminSection title="Thông tin" icon={Info} compact>
            <div className="space-y-1.5 text-xs">
              {isEdit && detail ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Người đang mang:</span>
                    <Badge variant="secondary" className="font-mono">{detail.userCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày tạo:</span>
                    <span>{new Date(detail.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cập nhật:</span>
                    <span>{new Date(detail.updatedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Sau khi lưu, bạn có thể gán vai trò cho từng khách hàng ở trang <b>Người dùng</b>.
                </p>
              )}
            </div>
          </AdminSection>

          {isEdit && (
            <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
              💡 <b>Lưu ý:</b> Người dùng đang online sẽ giữ quyền cũ đến khi đăng nhập lại
              — vì quyền được nạp lúc login. Hãy nhắc họ logout/login để áp quyền mới.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
