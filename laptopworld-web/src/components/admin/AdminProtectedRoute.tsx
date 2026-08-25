import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { ForbiddenPage } from '@/pages/admin/ForbiddenPage'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Nếu có, user phải sở hữu permission này (hoặc là ADMIN). Bỏ trống = chỉ cần `access_admin`. */
  requiredPermission?: string
}

/**
 * Guard cho /admin/*:
 * - Chưa login → redirect /dang-nhap
 * - Login nhưng không có role ADMIN VÀ không có permission `access_admin` → 403
 * - Nếu prop `requiredPermission` được set → cần thêm permission đó (hoặc ADMIN)
 */
export function AdminProtectedRoute({ children, requiredPermission }: Props) {
  const user = useAuthStore((s) => s.user)
  const isReady = useAuthStore((s) => s.isReady)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const loginSource = useAuthStore((s) => s.loginSource)
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  // Chưa login → về trang login admin
  if (!user) {
    return <Navigate to="/admin/dang-nhap" state={{ from: location.pathname }} replace />
  }

  // Đã login nhưng KHÔNG qua form admin (login từ /dang-nhap khách hàng, hoặc session cũ)
  // → bắt buộc login lại qua /admin/dang-nhap để xác nhận vào khu vực quản trị
  if (loginSource !== 'admin') {
    return <Navigate to="/admin/dang-nhap" state={{ from: location.pathname }} replace />
  }

  // Gate cấp 1: được vào layout admin?
  if (!isAdmin() && !hasPermission('access_admin')) {
    return <ForbiddenPage />
  }

  // Gate cấp 2: được xem trang cụ thể này?
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}
