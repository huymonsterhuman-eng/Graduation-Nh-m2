import { useMemo } from 'react'
import { Calendar, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type DateRangePreset = 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM'

export interface DateRange {
  from?: string  // ISO date yyyy-MM-dd
  to?: string
}

const PRESET_LABEL: Record<DateRangePreset, string> = {
  ALL: 'Tất cả',
  TODAY: 'Hôm nay',
  LAST_7: '7 ngày qua',
  LAST_30: '30 ngày qua',
  THIS_MONTH: 'Tháng này',
  CUSTOM: 'Tùy chọn...',
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function firstDayOfMonthIso(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

/** Suy ngược preset từ giá trị {from, to} — để chọn đúng option ban đầu khi refresh. */
function inferPreset(range: DateRange): DateRangePreset {
  const { from, to } = range
  if (!from && !to) return 'ALL'
  const today = todayIso()
  if (from === today && to === today) return 'TODAY'
  if (to === today && from === daysAgoIso(6)) return 'LAST_7'
  if (to === today && from === daysAgoIso(29)) return 'LAST_30'
  if (to === today && from === firstDayOfMonthIso()) return 'THIS_MONTH'
  return 'CUSTOM'
}

export interface DateRangeFilterProps {
  value: DateRange
  onChange: (v: DateRange) => void
  className?: string
}

/**
 * Bộ lọc khoảng ngày — 4 preset nhanh + tùy chọn nhập tay from/to.
 * Dùng chung cho các trang admin cần lọc theo `createdAt`.
 */
export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const preset = useMemo(() => inferPreset(value), [value])

  const setPreset = (p: DateRangePreset) => {
    switch (p) {
      case 'ALL':        onChange({}); break
      case 'TODAY':      onChange({ from: todayIso(), to: todayIso() }); break
      case 'LAST_7':     onChange({ from: daysAgoIso(6),  to: todayIso() }); break
      case 'LAST_30':    onChange({ from: daysAgoIso(29), to: todayIso() }); break
      case 'THIS_MONTH': onChange({ from: firstDayOfMonthIso(), to: todayIso() }); break
      case 'CUSTOM':     /* để user tự nhập; không đổi from/to */ break
    }
  }

  const hasFilter = !!(value.from || value.to)

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
        <SelectTrigger className="w-40">
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABEL) as DateRangePreset[]).map((p) => (
            <SelectItem key={p} value={p}>{PRESET_LABEL[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={value.from ?? ''}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
          className="w-[150px] [color-scheme:light] dark:[color-scheme:dark]"
          aria-label="Từ ngày"
        />
        <span className="text-muted-foreground">→</span>
        <Input
          type="date"
          value={value.to ?? ''}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
          className="w-[150px] [color-scheme:light] dark:[color-scheme:dark]"
          aria-label="Đến ngày"
        />
      </div>

      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3.5 w-3.5" /> Xóa lọc
        </Button>
      )}
    </div>
  )
}
