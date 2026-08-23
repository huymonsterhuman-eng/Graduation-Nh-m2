import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useState } from 'react'
import { ShieldCheck, Lock } from 'lucide-react'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

const schema = z.object({
  usernameOrEmail: z.string().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormData = z.infer<typeof schema>

/**
 * Trang đăng nhập RIÊNG cho admin. UI dark, tối giản, không dùng MainLayout.
 * Reuse POST /api/auth/login. Sau khi login xong check role ADMIN:
 *  - Đúng ADMIN → điều hướng vào /admin (hoặc `from`).
 *  - Không ADMIN → logout ngay + báo lỗi (tránh session dở dang).
 * Nếu đã login sẵn:
 *  - Admin đang login → redirect /admin.
 *  - User thường đã login → cứ để họ nhập, backend tự trả token mới; ta sẽ check role sau khi login.
 */
export function AdminLoginPage() {
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const isReady = useAuthStore((s) => s.isReady)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const from = (location.state as { from?: string } | null)?.from || '/admin'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Admin đã login rồi thì bay thẳng vào /admin
  if (isReady && user && isAdmin()) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await login(data.usernameOrEmail, data.password)
      // Sau login, useAuthStore.user đã cập nhật — check role
      if (useAuthStore.getState().isAdmin()) {
        toast.success('Đăng nhập quản trị thành công')
        navigate(from, { replace: true })
      } else {
        await logout()
        toast.error('Tài khoản này không có quyền quản trị')
      }
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">LaptopWorld Admin</h1>
            <p className="mt-1 text-sm text-slate-400">
              Đăng nhập bằng tài khoản có vai trò ADMIN
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usernameOrEmail" className="text-slate-200">
                  Tên đăng nhập hoặc email
                </Label>
                <Input
                  id="usernameOrEmail"
                  autoComplete="username"
                  autoFocus
                  className="border-slate-700 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                  {...register('usernameOrEmail')}
                />
                {errors.usernameOrEmail && (
                  <p className="text-sm text-red-400">{errors.usernameOrEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="border-slate-700 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Lock className="mr-2 h-4 w-4" />
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập quản trị'}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
              Không phải quản trị viên?{' '}
              <Link to="/dang-nhap" className="text-primary/90 hover:text-primary hover:underline">
                Về trang đăng nhập chung
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} LaptopWorld — Trang quản trị nội bộ
          </p>
        </div>
      </div>
    </div>
  )
}
