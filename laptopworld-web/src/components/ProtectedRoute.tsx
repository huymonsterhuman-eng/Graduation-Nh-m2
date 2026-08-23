import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import type { ReactNode } from 'react'

/** Chặn route yêu cầu đã login. Chưa login → redirect /dang-nhap với ref quay lại. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isReady = useAuthStore((s) => s.isReady)
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
