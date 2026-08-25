import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { api, type ApiResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useState } from 'react'
import { Mail, MailCheck, AlertTriangle } from 'lucide-react'
import type { AxiosError } from 'axios'

const schema = z.object({
  usernameOrEmail: z.string().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormData = z.infer<typeof schema>

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const from = (location.state as { from?: string } | null)?.from || '/'

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Trạng thái riêng cho luồng "tài khoản chưa xác thực email"
  const [unverified, setUnverified] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resentTo, setResentTo] = useState<string | null>(null)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setUnverified(false)
    setResentTo(null)
    try {
      await login(data.usernameOrEmail, data.password, 'customer')
      toast.success('Đăng nhập thành công')
      navigate(from, { replace: true })
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown> & { code?: string }>
      const status = err.response?.status
      const message = err.response?.data?.message
      const isEmailNotVerified = status === 403 &&
        (message?.toLowerCase().includes('chưa xác thực') ?? false)

      if (isEmailNotVerified) {
        setUnverified(true)
        // Prefill email nếu user gõ email vào form
        setResendEmail(looksLikeEmail(data.usernameOrEmail) ? data.usernameOrEmail : '')
      } else {
        toast.error(message || 'Đăng nhập thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const email = resendEmail.trim()
    if (!looksLikeEmail(email)) {
      toast.error('Vui lòng nhập email hợp lệ')
      return
    }
    setResending(true)
    try {
      await api.post<ApiResponse<unknown>>('/auth/resend-verification', { email })
      // Backend silent để tránh enumeration — mình luôn báo đã gửi
      setResentTo(email)
      toast.success('Đã gửi lại email xác thực (nếu email hợp lệ)')
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không gửi được email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="container flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Truy cập tài khoản LaptopWorld của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail">Tên đăng nhập hoặc email</Label>
              <Input id="usernameOrEmail" autoComplete="username" {...register('usernameOrEmail')} />
              {errors.usernameOrEmail && (
                <p className="text-sm text-destructive">{errors.usernameOrEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link to="/quen-mat-khau" className="text-xs text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>

            {/* Block "tài khoản chưa xác thực" — cho user resend email verify */}
            {unverified && (
              <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Tài khoản chưa xác thực email</p>
                    <p className="mt-0.5 text-xs">
                      Kiểm tra hộp thư (kể cả spam) để bấm link xác thực.
                      Nếu chưa nhận được, gửi lại bên dưới.
                    </p>
                  </div>
                </div>

                {resentTo ? (
                  <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Đã gửi lại email xác thực đến <b>{resentTo}</b>. Link có hiệu lực trong 24h.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="resend-email" className="text-xs">Email nhận link xác thực</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="resend-email"
                            type="email"
                            placeholder="email@example.com"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResend}
                          disabled={resending}
                        >
                          {resending ? 'Đang gửi...' : 'Gửi lại'}
                        </Button>
                      </div>
                      {!looksLikeEmail(getValues('usernameOrEmail') || '') && (
                        <p className="text-[11px] text-muted-foreground">
                          Bạn vừa gõ tên đăng nhập, vui lòng nhập email đã đăng ký.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link to="/dang-ky" className="text-primary hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
