import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type ApiResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Status = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token không hợp lệ')
      return
    }
    let mounted = true
    api.post<ApiResponse<unknown>>('/auth/verify-email', { token })
      .then((res) => {
        if (!mounted) return
        if (res.data.success) {
          setStatus('success')
          setMessage(res.data.message || 'Xác thực email thành công')
        } else {
          setStatus('error')
          setMessage(res.data.message || 'Xác thực thất bại')
        }
      })
      .catch(() => {
        if (!mounted) return
        setStatus('error')
        setMessage('Token đã hết hạn hoặc không hợp lệ')
      })
    return () => { mounted = false }
  }, [token])

  return (
    <div className="container flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Xác thực email</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Đang xác thực...'}
            {status === 'success' && message}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' && (
            <Button asChild className="w-full">
              <Link to="/dang-nhap">Đăng nhập ngay</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
