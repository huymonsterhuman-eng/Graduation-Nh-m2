import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminOrderDetail } from '@/hooks/api/useAdminOrders'
import { formatPrice, formatDateTime } from '@/lib/format'

const PAY_METHOD_LABEL: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPay',
  momo: 'MoMo',
}

/**
 * Trang in hóa đơn A4. Không dùng AdminLayout — layout đơn giản để CSS in đẹp.
 * @media print ẩn nút "In" + margin.
 */
export function AdminOrderPrintPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = idParam ? Number(idParam) : undefined
  const { data: order, isLoading } = useAdminOrderDetail(id)

  useEffect(() => { document.title = order ? `HĐ ${order.code}` : 'Hóa đơn' }, [order])

  if (isLoading || !order) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Đang tải...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">Xem trước hóa đơn — bấm In để xuất</div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> In
        </Button>
      </div>

      {/* Invoice sheet A4 */}
      <div className="invoice-sheet mx-auto max-w-[210mm] rounded-md border bg-white p-8 text-slate-900 shadow print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-2xl font-bold text-primary">LaptopWorld</div>
            <div className="text-xs text-slate-500">
              12 Phùng Chí Kiên, Cầu Giấy, Hà Nội<br />
              Hotline: 1900 1234 · support@laptopworld.vn
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold uppercase">Hóa đơn bán hàng</div>
            <div className="mt-1 font-mono text-sm">{order.code}</div>
            <div className="text-xs text-slate-500">Ngày: {formatDateTime(order.createdAt)}</div>
          </div>
        </div>

        {/* Info 2 col */}
        <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Khách hàng</div>
            <div className="font-medium">{order.shippingName || order.username}</div>
            {order.shippingPhone && <div>SĐT: {order.shippingPhone}</div>}
            {order.shippingAddress && <div className="text-slate-600">Địa chỉ: {order.shippingAddress}</div>}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Thanh toán</div>
            <div>{PAY_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</div>
            <div className="text-slate-600">
              {order.paymentStatus === 'paid' ? 'Đã thanh toán' :
               order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán'}
            </div>
            {order.trackingNumber && (
              <div className="mt-1 text-xs">Mã vận đơn: <span className="font-mono">{order.trackingNumber}</span></div>
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="mt-6 w-full text-sm">
          <thead className="border-y bg-slate-50 text-left">
            <tr>
              <th className="w-10 py-2 pl-2">#</th>
              <th className="py-2">Sản phẩm</th>
              <th className="w-24 py-2 text-right">Đơn giá</th>
              <th className="w-16 py-2 text-center">SL</th>
              <th className="w-32 py-2 pr-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={it.id} className="border-b">
                <td className="py-2 pl-2">{i + 1}</td>
                <td className="py-2">{it.productName}</td>
                <td className="py-2 text-right">{formatPrice(it.priceAtPurchase)}</td>
                <td className="py-2 text-center">{it.quantity}</td>
                <td className="py-2 pr-2 text-right font-semibold">{formatPrice(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Tiền hàng:</span><span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}:</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Phí vận chuyển:</span><span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold text-primary">
            <span>Tổng thanh toán:</span><span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <div className="font-semibold">Người mua hàng</div>
            <div className="mt-1 text-xs text-slate-500">(Ký, ghi rõ họ tên)</div>
            <div className="mt-16 border-t border-dashed pt-2 text-xs">&nbsp;</div>
          </div>
          <div>
            <div className="font-semibold">Người bán hàng</div>
            <div className="mt-1 text-xs text-slate-500">(Ký, đóng dấu)</div>
            <div className="mt-16 border-t border-dashed pt-2 text-xs">&nbsp;</div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Cảm ơn quý khách đã mua hàng tại LaptopWorld!
        </div>
      </div>
    </div>
  )
}
