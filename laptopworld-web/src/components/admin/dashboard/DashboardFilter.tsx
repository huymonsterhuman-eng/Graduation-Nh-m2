import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar as CalendarIcon } from 'lucide-react'
import { lastNDaysRange, thisMonthRange } from '@/lib/format'
import { useMemo } from 'react'

/**
 * Filter range ngày cho toàn dashboard. Đồng bộ qua URL param `from` & `to`.
 * 3 preset: 7 ngày / 30 ngày / tháng này. Ngoài ra cho phép custom native date input.
 */
export interface DateRangeValue { from: string; to: string }

interface Props {
  value: DateRangeValue
  onChange: (v: DateRangeValue) => void
}

export function DashboardFilter({ value, onChange }: Props) {
  const setPreset = (r: DateRangeValue) => onChange(r)

  const preset7 = useMemo(() => lastNDaysRange(7), [])
  const preset30 = useMemo(() => lastNDaysRange(30), [])
  const presetMonth = useMemo(() => thisMonthRange(), [])

  const activePreset =
    value.from === preset7.from && value.to === preset7.to ? '7'
    : value.from === preset30.from && value.to === preset30.to ? '30'
    : value.from === presetMonth.from && value.to === presetMonth.to ? 'month'
    : 'custom'

  return (
    <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:gap-4">
      <div className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Từ ngày</Label>
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Đến ngày</Label>
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <CalendarIcon className="hidden h-4 w-4 text-muted-foreground md:inline" />
        <Button
          variant={activePreset === '7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPreset(preset7)}
        >7 ngày</Button>
        <Button
          variant={activePreset === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPreset(preset30)}
        >30 ngày</Button>
        <Button
          variant={activePreset === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPreset(presetMonth)}
        >Tháng này</Button>
      </div>
    </Card>
  )
}

/**
 * Hook: lưu range vào URL params, mặc định 30 ngày gần nhất.
 * Trả về [value, setValue].
 */
export function useDashboardRange(): [DateRangeValue, (v: DateRangeValue) => void] {
  const [params, setParams] = useSearchParams()
  const defaults = useMemo(() => lastNDaysRange(30), [])
  const from = params.get('from') || defaults.from
  const to = params.get('to') || defaults.to

  const setValue = (v: DateRangeValue) => {
    const next = new URLSearchParams(params)
    next.set('from', v.from)
    next.set('to', v.to)
    setParams(next, { replace: true })
  }
  return [{ from, to }, setValue]
}

