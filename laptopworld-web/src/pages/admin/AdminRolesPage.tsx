import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Plus, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { useAdminRoles, useDeleteRole } from '@/hooks/api/useRoles'
import type { RoleListItem } from '@/types/api'

const ADMIN_ROLE_NAMES = ['ADMIN']

function isProtected(name: string) {
  return ADMIN_ROLE_NAMES.includes(name.toUpperCase())
}

export function AdminRolesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useAdminRoles()
  const remove = useDeleteRole()

  const handleDelete = async (r: RoleListItem) => {
    try {
      await remove.mutateAsync(r.id)
      toast.success(`Đã xóa vai trò "${r.name}"`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const columns: AdminColumn<RoleListItem>[] = [
    {
      key: 'name', header: 'Tên vai trò',
      cell: (r) => (
        <div className="space-y-0.5">
          <div className="font-semibold flex items-center gap-2">
            {r.name}
            {isProtected(r.name) && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                Hệ thống
              </Badge>
            )}
          </div>
          {r.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'permCount', header: 'Số quyền', align: 'center', className: 'w-32',
      cell: (r) => (
        <Badge variant="outline" className="font-mono">
          {r.permissionCount}
        </Badge>
      ),
    },
    {
      key: 'userCount', header: 'Người đang mang', align: 'center', className: 'w-40',
      cell: (r) => (
        <div className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3 text-muted-foreground" />
          <Badge variant="secondary" className="font-mono">{r.userCount}</Badge>
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Ngày tạo', className: 'w-32',
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
        </div>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-44',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm"
                  onClick={() => navigate(`/admin/vai-tro/${r.id}/sua`)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm"
                      disabled={isProtected(r.name)}
                      className="text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa
              </Button>
            }
            title="Xóa vai trò?"
            description={
              <>
                Xóa <b>{r.name}</b>. Chỉ xóa được khi không còn ai đang mang vai trò này.
                {r.userCount > 0 && (
                  <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                    ⚠️ Đang có <b>{r.userCount}</b> người mang vai trò này — cần gỡ trước khi xóa.
                  </div>
                )}
              </>
            }
            confirmLabel="Xóa"
            onConfirm={() => handleDelete(r)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Vai trò & Phân quyền"
        icon={ShieldCheck}
        sprint="Sprint 9G-perm"
        description="Tạo vai trò (VD: Thủ kho, Nhân viên bán hàng) và tick các quyền tương ứng. Người có vai trò sẽ chỉ thấy menu và gọi được API tương ứng."
        actions={
          <Button onClick={() => navigate('/admin/vai-tro/moi')}>
            <Plus className="mr-2 h-4 w-4" /> Thêm vai trò
          </Button>
        }
      />

      <AdminTable<RoleListItem>
        columns={columns}
        data={data}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="Chưa có vai trò nào"
      />

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
        <b>Lưu ý:</b> Vai trò <b>ADMIN</b> có tất cả quyền và không thể xóa/đổi tên/sửa quyền —
        đây là vai trò siêu quản trị của hệ thống. Nếu muốn giới hạn quyền của ai đó, hãy tạo
        vai trò mới rồi gán, thay vì sửa ADMIN.
      </div>
    </div>
  )
}
