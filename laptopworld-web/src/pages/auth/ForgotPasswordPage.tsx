import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { api, type ApiResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useState } from 'react'
import type { AxiosError } from 'axios'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})
type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { data: res } = await api.post<ApiResponse<unknown>>('/auth/forgot-password', {
        email: data.email,
      })
      if (!res.success) throw new Error(res.message)
      setSent(true)
      toast.success('Đã gửi email đặt lại mật khẩu')
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không gửi được email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vui lòng kiểm tra hộp thư (bao gồm cả spam) và click vào link để đặt lại mật khẩu.
                Link có hiệu lực trong 30 phút.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dang-nhap">Về trang đăng nhập</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/dang-nhap" className="text-primary hover:underline">
                  Quay lại đăng nhập
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
