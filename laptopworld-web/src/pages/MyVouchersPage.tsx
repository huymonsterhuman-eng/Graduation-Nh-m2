import { useAvailableVouchers, useMyVouchers, useSaveVoucher } from '@/hooks/api/useVouchers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'
import { toast } from 'sonner'
import type { Voucher } from '@/types/api'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

export function MyVouchersPage() {
  const { data: available, isLoading: loadingAvail, refetch: refetchAvail } = useAvailableVouchers()
  const { data: mine, isLoading: loadingMine, refetch: refetchMine } = useMyVouchers()
  const save = useSaveVoucher()

  const handleSave = async (code: string) => {
    try {
      await save.mutateAsync(code)
      toast.success('Đã lưu voucher')
      refetchAvail()
      refetchMine()
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không lưu được')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-3">Voucher đã lưu</h1>
        {loadingMine ? (
          <Skeleton className="h-24" />
        ) : !mine || mine.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Chưa lưu voucher nào.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((v) => <VoucherCard key={v.id} v={v} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Voucher đang có</h2>
        {loadingAvail ? (
          <Skeleton className="h-24" />
        ) : !available || available.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Chưa có voucher nào.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {available.filter((v) => !v.isSaved).map((v) => (
              <VoucherCard key={v.id} v={v} onSave={() => handleSave(v.code)} saving={save.isPending} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VoucherCard({ v, onSave, saving }: { v: Voucher; onSave?: () => void; saving?: boolean }) {
  const discountText = v.type === 'fixed'
    ? formatPrice(v.discountAmount)
    : `${v.discountAmount}%${v.maxDiscount ? ` (tối đa ${formatPrice(v.maxDiscount)})` : ''}`
  const expiryText = v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Không thời hạn'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{v.name}</CardTitle>
          <Badge variant="secondary" className="font-mono">{v.code}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="text-muted-foreground">Giảm: </span><span className="font-semibold text-primary">{discountText}</span></p>
        {v.minOrderValue > 0 && (
          <p><span className="text-muted-foreground">Đơn tối thiểu: </span>{formatPrice(v.minOrderValue)}</p>
        )}
        <p><span className="text-muted-foreground">Hết hạn: </span>{expiryText}</p>
        {onSave && (
          <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="w-full mt-2">
            Lưu voucher
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
