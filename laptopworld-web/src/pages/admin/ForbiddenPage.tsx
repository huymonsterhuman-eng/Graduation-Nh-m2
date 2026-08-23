import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4 text-center">
      <ShieldOff className="h-20 w-20 text-destructive" strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Không có quyền truy cập</h1>
        <p className="max-w-md text-muted-foreground">
          Trang quản trị chỉ dành cho tài khoản có vai trò <b>ADMIN</b>. Nếu bạn cần
          quyền này, vui lòng liên hệ quản trị viên hệ thống.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
        <Button asChild>
          <Link to="/tai-khoan">Trang tài khoản</Link>
        </Button>
      </div>
    </div>
  )
}
