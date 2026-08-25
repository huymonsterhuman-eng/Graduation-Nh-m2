import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock, ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVnpayReturn } from '@/hooks/api/useOrders'
import { formatPrice } from '@/lib/format'

/**
 * Trang khách được VNPay redirect về sau khi thanh toán.
 * URL: /thanh-toan/vnpay/ket-qua?vnp_ResponseCode=00&vnp_Amount=...&vnp_SecureHash=...
 *
 * FE forward toàn bộ query string cho backend qua GET /api/payments/vnpay/return
 * để verify HMAC checksum (tránh giả mạo URL bên client) — chỉ hiển thị success khi
 * checksumValid=true VÀ responseCode=00 VÀ transactionStatus=00.
 *
 * Backend cũng update DB tại /return (fallback cho dev localhost khi IPN không tới
 * được). Sau khi verify OK, invalidate cache order để user vào chi tiết đơn thấy
 * paymentStatus=paid ngay không cần F5.
 */
export function VnpayReturnPage() {
  const location = useLocation()
  const queryString = location.search // "?vnp_ResponseCode=00&..."
  const qc = useQueryClient()

  const { data, isLoading, isError, error } = useVnpayReturn(queryString)

  // Sau khi verify + update DB thành công, invalidate cache order + my-orders
  // để mọi trang nhìn thấy trạng thái mới ngay.
  useEffect(() => {
    if (data?.success && data?.orderCode) {
      qc.invalidateQueries({ queryKey: ['order', data.orderCode] })
      qc.invalidateQueries({ queryKey: ['my-orders'] })
    }
  }, [data, qc])

  const amount = useMemo(() => {
    // vnp_Amount đã x100
    if (!data?.amount) return undefined
    const n = Number(data.amount)
    if (Number.isNaN(n)) return undefined
    return n / 100
  }, [data])

  if (!queryString) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Không có tham số thanh toán</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang này chỉ hoạt động khi được cổng VNPay chuyển về.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Về trang chủ</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Clock className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <h1 className="mt-4 text-xl font-bold">Đang xác thực giao dịch...</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng chờ trong giây lát.
          </p>
        </Card>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h1 className="mt-4 text-xl font-bold">Không xác thực được giao dịch</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error)?.message || 'Có lỗi khi kết nối tới máy chủ. Vui lòng thử lại sau.'}
          </p>
          <Button asChild className="mt-6">
            <Link to="/tai-khoan/don-hang">Xem đơn hàng của tôi</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Hash không hợp lệ = URL bị giả mạo — cảnh báo mạnh
  if (!data.checksumValid) {
    return (
      <div className="container py-12">
        <Card className="mx-auto max-w-lg space-y-4 border-rose-500/40 bg-rose-500/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="text-xl font-bold text-rose-700 dark:text-rose-300">
            Chữ ký giao dịch không hợp lệ
          </h1>
          <p className="text-sm text-muted-foreground">
            Backend không xác thực được HMAC của URL này. Có thể URL đã bị chỉnh sửa
            hoặc phiên thanh toán đã hết hạn. Vui lòng vào trang đơn hàng để kiểm
            tra trạng thái thật.
          </p>
          <Button asChild>
            <Link to={`/tai-khoan/don-hang/${data.orderCode}`}>
              Xem đơn {data.orderCode}
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Card className={`mx-auto max-w-lg space-y-4 p-8 text-center ${
        data.success ? 'border-emerald-500/40 bg-emerald-500/5'
                     : 'border-rose-500/40 bg-rose-500/5'
      }`}>
        {data.success ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        ) : (
          <XCircle className="mx-auto h-14 w-14 text-rose-600" />
        )}

        <div>
          <h1 className={`text-2xl font-bold ${
            data.success ? 'text-emerald-700 dark:text-emerald-300'
                         : 'text-rose-700 dark:text-rose-300'
          }`}>
            {data.success ? 'Thanh toán thành công' : 'Thanh toán không thành công'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đơn hàng <span className="font-mono font-semibold">{data.orderCode}</span>
          </p>
        </div>

        <div className="space-y-2 rounded-md border bg-background p-4 text-left text-sm">
          <Row label="Mã đơn" value={<span className="font-mono">{data.orderCode}</span>} />
          {amount !== undefined && (
            <Row label="Số tiền" value={<span className="font-semibold text-primary">{formatPrice(amount)}</span>} />
          )}
          {data.transactionNo && (
            <Row label="Mã giao dịch VNPay" value={<span className="font-mono text-xs">{data.transactionNo}</span>} />
          )}
          <Row label="Mã phản hồi" value={
            <Badge variant="outline" className="font-mono">{data.responseCode}</Badge>
          } />
          <Row label="Trạng thái GD" value={
            <Badge variant="outline" className="font-mono">{data.transactionStatus}</Badge>
          } />
          <Row label="Chữ ký HMAC" value={
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              Hợp lệ
            </Badge>
          } />
        </div>

        {data.success ? (
          <p className="text-xs text-muted-foreground">
            Backend sẽ nhận IPN callback từ VNPay để cập nhật đơn hàng chính thức.
            Bạn có thể vào trang đơn hàng để xem trạng thái thanh toán mới nhất.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nếu bị tính tiền, vui lòng vào trang đơn hàng — hệ thống sẽ đối soát tự động
            khi nhận IPN từ VNPay.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button asChild variant="outline">
            <Link to="/tai-khoan/don-hang">Danh sách đơn hàng</Link>
          </Button>
          <Button asChild>
            <Link to={`/tai-khoan/don-hang/${data.orderCode}`}>
              Xem chi tiết đơn <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
