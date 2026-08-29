import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Copy, Printer, CheckCircle2, Truck, PackageCheck, XCircle,
  User, MapPin, Phone, StickyNote, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { OrderStatusBadge } from '@/components/admin/common/OrderStatusBadge'
import { useAdminOrderDetail, useUpdateOrderStatus } from '@/hooks/api/useAdminOrders'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { formatPrice, productImageSrc, formatDateTime } from '@/lib/format'
import type { OrderStatus } from '@/types/api'

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: 'pending',   label: 'Chờ xử lý' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'preparing', label: 'Đang chuẩn bị' },
  { key: 'shipping',  label: 'Đang giao hàng' },
  { key: 'delivered', label: 'Đã giao thành công' },
]

/** Modal state cho 4 action. */
type ActionKind = null | 'confirm' | 'prepare' | 'delivered' | 'cancel'

export function AdminOrderDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = idParam ? Number(idParam) : undefined
  const navigate = useNavigate()

  const { data: order, isLoading } = useAdminOrderDetail(id)
  const update = useUpdateOrderStatus()
  const { copy } = useCopyToClipboard()

  const [action, setAction] = useState<ActionKind>(null)
  const [adminNote, setAdminNote] = useState('')

  if (isLoading || !order) {
    return <div className="grid place-items-center py-20 text-sm text-muted-foreground">Đang tải...</div>
  }

  const currentIdx = TIMELINE.findIndex((t) => t.key === order.status)
  const isCancelled = order.status === 'cancelled'
  const isFinal = order.status === 'delivered' || order.status === 'cancelled'

  const copyCode = () => copy(order.code, `Đã sao chép mã ${order.code}`)

  const doAction = async (newStatus: OrderStatus, note?: string) => {
    try {
      await update.mutateAsync({
        id: order.id,
        body: {
          status: newStatus,
          adminNote: note || undefined,
        },
      })
      toast.success('Đã cập nhật trạng thái')
      setAction(null)
      setAdminNote('')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/don-hang"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <AdminPageHeader
          title={<><span className="font-mono">{order.code}</span></>}
          sprint="Sprint 9E"
        />
        <Button variant="ghost" size="sm" onClick={copyCode}>
          <Copy className="mr-2 h-3 w-3" /> Copy mã
        </Button>
        <OrderStatusBadge status={order.status} className="text-sm" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/don-hang/${order.id}/in`} target="_blank">
              <Printer className="mr-2 h-3 w-3" /> In hóa đơn
            </Link>
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card className="p-4">
        {isCancelled ? (
          <div className="flex items-center justify-center gap-3 py-4 text-rose-600 dark:text-rose-400">
            <XCircle className="h-6 w-6" />
            <div>
              <div className="text-sm font-semibold">Đơn hàng đã bị hủy</div>
              {order.cancelledAt && (
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(order.cancelledAt)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between overflow-x-auto">
            {TIMELINE.map((step, idx) => {
              const done = idx <= currentIdx
              const current = idx === currentIdx
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1 text-center min-w-[100px]">
                    <div className={
                      'grid h-8 w-8 place-items-center rounded-full text-xs font-bold ' +
                      (done
                        ? current
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground')
                    }>{idx + 1}</div>
                    <div className={
                      'text-xs ' +
                      (current ? 'font-bold text-primary' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')
                    }>{step.label}</div>
                  </div>
                  {idx < TIMELINE.length - 1 && (
                    <div className={
                      'h-0.5 w-6 md:w-10 ' +
                      (idx < currentIdx ? 'bg-emerald-500' : 'bg-muted')
                    } />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Shipping info */}
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Thông tin giao hàng</h3>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <InfoRow icon={User} label="Người nhận" value={order.shippingName || '—'} />
              <InfoRow icon={Phone} label="Số điện thoại" value={order.shippingPhone || '—'} />
              <InfoRow icon={MapPin} label="Địa chỉ" value={order.shippingAddress || '—'} className="md:col-span-2" />
              <InfoRow icon={Truck} label="PT vận chuyển" value={order.shippingMethod || '—'} />
              <InfoRow icon={Clock} label="Ngày đặt" value={formatDateTime(order.createdAt)} />
              {order.trackingNumber && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                    <Truck className="h-3 w-3" /> Mã vận đơn
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-sm">
                    <span className="font-mono">{order.trackingNumber}</span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 opacity-60 hover:opacity-100"
                      title="Sao chép mã vận đơn"
                      onClick={() => copy(order.trackingNumber!, 'Đã sao chép mã vận đơn')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {order.adminNote && (
                <InfoRow icon={StickyNote} label="Ghi chú admin" value={order.adminNote} className="md:col-span-2" />
              )}
            </div>
          </Card>

          {/* Items */}
          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <h3 className="text-sm font-semibold">Sản phẩm ({order.items.length})</h3>
            </div>
            <div className="divide-y">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  <img src={productImageSrc(it.productImage)} alt={it.productName}
                    className="h-14 w-14 rounded border object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/san-pham/`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                      {it.productName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(it.priceAtPurchase)} × {it.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(it.lineTotal)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          {/* Summary */}
          <Card className="space-y-2 p-4">
            <h3 className="mb-2 text-sm font-semibold">Tổng kết chi phí</h3>
            <Row label="Tiền hàng" value={formatPrice(order.subtotal)} />
            {order.discountAmount > 0 && (
              <Row label={order.voucherCode ? `Giảm (${order.voucherCode})` : 'Giảm'}
                value={`-${formatPrice(order.discountAmount)}`} className="text-emerald-600" />
            )}
            <Row label="Phí ship" value={formatPrice(order.shippingFee)} />
            <div className="border-t pt-2">
              <Row label="Tổng thanh toán" value={formatPrice(order.total)}
                className="text-base font-bold text-primary" />
            </div>
          </Card>

          {/* Payment info */}
          <Card className="space-y-2 p-4">
            <h3 className="mb-2 text-sm font-semibold">Thanh toán</h3>
            <Row label="Phương thức" value={order.paymentMethod.toUpperCase()} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trạng thái</span>
              <Badge className={
                order.paymentStatus === 'paid'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : order.paymentStatus === 'refunded'
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }>
                {order.paymentStatus === 'paid' ? 'Đã thanh toán'
                 : order.paymentStatus === 'refunded' ? 'Đã hoàn tiền'
                 : 'Chưa thanh toán'}
              </Badge>
            </div>
            {order.paymentTransactionRef && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mã GD VNPay</span>
                <span className="flex items-center gap-1 font-mono text-xs">
                  {order.paymentTransactionRef}
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 opacity-60 hover:opacity-100"
                    title="Sao chép mã giao dịch"
                    onClick={() => copy(order.paymentTransactionRef!, 'Đã sao chép mã giao dịch')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </span>
              </div>
            )}
            {order.paidAt && (
              <Row label="Ngày TT" value={formatDateTime(order.paidAt)} />
            )}
          </Card>

          {/* Actions */}
          {!isFinal && (
            <Card className="space-y-2 p-4">
              <h3 className="mb-2 text-sm font-semibold">Thao tác</h3>

              {order.status === 'pending' && (
                <Button className="w-full" onClick={() => setAction('confirm')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Xác nhận đơn
                </Button>
              )}
              {order.status === 'confirmed' && (
                <Button className="w-full" onClick={() => setAction('prepare')}>
                  <Truck className="mr-2 h-4 w-4" /> Chuyển kho chuẩn bị
                </Button>
              )}
              {order.status === 'preparing' && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Đang chờ kho duyệt phiếu xuất. Vào <Link to="/admin/phieu-xuat" className="font-semibold underline">Phiếu xuất</Link> để approve.
                </div>
              )}
              {order.status === 'shipping' && (
                <Button className="w-full" onClick={() => setAction('delivered')}>
                  <PackageCheck className="mr-2 h-4 w-4" /> Đã giao thành công
                </Button>
              )}
              <Button variant="destructive" className="w-full" onClick={() => setAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" /> Hủy đơn
              </Button>
            </Card>
          )}

          {/* Customer */}
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Khách hàng</h3>
            <div className="text-sm">
              <div>{order.username}</div>
              <div className="text-xs text-muted-foreground">ID: {order.userId}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Action dialogs */}
      <AlertDialog open={action === 'confirm'} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đơn hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Chuyển đơn <b>{order.code}</b> từ <i>Chờ xử lý</i> sang <i>Đã xác nhận</i>.
              Sau bước này, có thể chuyển kho chuẩn bị hàng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={update.isPending}
              onClick={(e) => { e.preventDefault(); doAction('confirmed') }}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={action === 'prepare'} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển kho chuẩn bị?</AlertDialogTitle>
            <AlertDialogDescription>
              Chuyển sang <i>Đang chuẩn bị</i> — hệ thống sẽ tự sinh 1 <b>Phiếu xuất kho</b> ở trạng thái
              <i> Chờ duyệt</i>. Kho phải approve phiếu này (chọn ĐVVC → tự sinh mã vận đơn) thì
              đơn mới sang <i>Đang giao hàng</i>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={update.isPending}
              onClick={(e) => { e.preventDefault(); doAction('preparing') }}>
              Chuyển kho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={action === 'delivered'} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đơn đã giao thành công?</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận khách đã nhận hàng và không có khiếu nại.
              {order.paymentMethod === 'cod' && (
                <><br /><br />COD: hệ thống tự đánh dấu <b>Đã thanh toán</b>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={update.isPending}
              onClick={(e) => { e.preventDefault(); doAction('delivered') }}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={action === 'cancel'} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đơn hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              {order.status === 'shipping'
                ? 'Đơn đang giao — hủy sẽ hoàn kho tự động (theo lô đã trừ).'
                : order.status === 'preparing'
                ? 'Đơn đang chuẩn bị — phiếu xuất pending sẽ bị hủy, kho không đổi.'
                : 'Xác nhận hủy đơn hàng này? Voucher (nếu có) sẽ được hoàn.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Lý do hủy (tùy chọn)</Label>
            <textarea id="note" rows={2} value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Không</AlertDialogCancel>
            <AlertDialogAction disabled={update.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); doAction('cancelled', adminNote) }}>
              Hủy đơn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoRow({
  icon: Icon, label, value, className,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={'flex items-center justify-between text-sm ' + (className ?? '')}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
