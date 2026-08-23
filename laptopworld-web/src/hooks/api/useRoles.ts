import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiResponse } from '@/lib/api'
import type { PermissionMeta, RoleDetail, RoleListItem } from '@/types/api'

export interface RoleInput {
  name: string
  description?: string
  permissions?: string[]
}

// ==================== Queries ====================

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RoleListItem[]>>('/admin/roles')
      return data.data ?? []
    },
  })
}

export function useRoleDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'role', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RoleDetail>>(`/admin/roles/${id}`)
      return data.data
    },
  })
}

/** 30 permission kèm label + groupName tiếng Việt — dùng render 4 tab checkbox. */
export function useAllPermissions() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    staleTime: 60 * 60_000,  // cache 1h vì rất ít khi đổi
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PermissionMeta[]>>('/admin/roles/permissions')
      return data.data ?? []
    },
  })
}

// ==================== Mutations ====================

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: RoleInput) => {
      const { data } = await api.post<ApiResponse<RoleDetail>>('/admin/roles', body)
      if (!data.success) throw new Error(data.message || 'Tạo vai trò thất bại')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: RoleInput }) => {
      const { data } = await api.put<ApiResponse<RoleDetail>>(`/admin/roles/${id}`, body)
      if (!data.success) throw new Error(data.message || 'Cập nhật thất bại')
      return data.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] })
      qc.invalidateQueries({ queryKey: ['admin', 'role', vars.id] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/admin/roles/${id}`)
      if (!data.success) throw new Error(data.message || 'Xóa thất bại')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] })
    },
  })
}
