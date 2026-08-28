import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, PlayCircle, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminSection } from '@/components/admin/common/AdminSection'
import { AdminEmptyState } from '@/components/admin/common/AdminEmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRunReservedStockAudit, type ReservedStockMismatch } from '@/hooks/api/useAdminInventory'

/**
 * Kiểm toán reserved_stock — đối chiếu số hệ thống đang tin vs đếm lại từ đơn active.
 * Cron 3h sáng chạy tự động (chỉ log). Trang này cho phép admin chạy tay + xem kết quả.
 */
export function AdminReservedStockAuditPage() {
  const run = useRunReservedStockAudit()
  const [rows, setRows] = useState<ReservedStockMismatch[] | null>(null)
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null)

  const handleRun = async () => {
    try {
      const r = await run.mutateAsync()
      setRows(r.rows)
      setLastRunAt(new Date())
      if (r.rows.length === 0) toast.success('Kho sạch — không có SP nào lệch')
      else toast.warning(`Phát hiện ${r.rows.length} SP lệch reserved_stock`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        icon={ClipboardCheck}
        title="Kiểm toán tồn kho (reserved_stock)"
        actions={
          <Button onClick={handleRun} disabled={run.isPending}>
            {run.isPending ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang chạy...</>
            ) : (
              <><PlayCircle className="mr-2 h-4 w-4" /> Chạy kiểm toán ngay</>
            )}
          </Button>
        }
      />

      <Card className="p-4 text-sm text-muted-foreground">
        <p>
          Đối chiếu <b>reserved_stock</b> (số suất đang giữ chỗ trên bảng products)
          với số reserved đếm lại từ các đơn hàng đang chạy (<i>pending / confirmed / preparing</i>).
        </p>
        <p className="mt-1">
          Cron tự chạy mỗi <b>3h sáng</b>. Nếu phát hiện lệch, ghi log warning để dev/admin điều tra.
          <b> Không tự sửa</b> — nếu logic đếm sai, tự sửa sẽ hỏng data thật.
        </p>
      </Card>

      {rows === null ? (
        <AdminEmptyState
          icon={ShieldCheck}
          title="Chưa chạy kiểm toán"
          description="Bấm nút phía trên để đối chiếu ngay lập tức."
        />
      ) : rows.length === 0 ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-400">
            Kho sạch — không có sản phẩm nào lệch reserved_stock
          </p>
          {lastRunAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Kiểm tra lúc {lastRunAt.toLocaleString('vi-VN')}
            </p>
          )}
        </Card>
      ) : (
        <AdminSection
          icon={AlertTriangle}
          title={`Phát hiện ${rows.length} sản phẩm lệch reserved_stock`}
          description={lastRunAt ? `Kiểm tra lúc ${lastRunAt.toLocaleString('vi-VN')}` : undefined}
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Mã SP</th>
                  <th className="p-2 text-left">Tên sản phẩm</th>
                  <th className="p-2 text-right">Hệ thống tin</th>
                  <th className="p-2 text-right">Đúng phải là</th>
                  <th className="p-2 text-right">Chênh lệch</th>
                  <th className="p-2 text-center">Loại</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.productId}>
                    <td className="p-2 font-mono text-xs text-muted-foreground">#{r.productId}</td>
                    <td className="p-2">{r.productName}</td>
                    <td className="p-2 text-right font-medium">{r.actualReserved}</td>
                    <td className="p-2 text-right font-medium">{r.expectedReserved}</td>
                    <td className={`p-2 text-right font-bold ${
                      r.deltaAbsolute > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-destructive'
                    }`}>
                      {r.deltaAbsolute > 0 ? `+${r.deltaAbsolute}` : r.deltaAbsolute}
                    </td>
                    <td className="p-2 text-center">
                      {r.deltaAbsolute > 0 ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          Giữ ảo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Thiếu reserved</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
            <p><b>Giữ ảo</b> (+) — hệ thống đang giữ chỗ nhiều hơn thực tế. Khách sẽ thấy "còn ít hàng" giả → có thể mất đơn.</p>
            <p><b>Thiếu reserved</b> (−) — hệ thống giữ ít hơn thực tế cần → nguy cơ <b>oversell</b>. Kiểm tra logic reserve.</p>
          </div>
        </AdminSection>
      )}
    </div>
  )
}
