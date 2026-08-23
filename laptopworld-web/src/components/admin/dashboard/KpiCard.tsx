import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  to?: string
  loading?: boolean
}

const COLOR: Record<Required<Props>['color'], string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger:  'text-rose-600 dark:text-rose-400',
  info:    'text-sky-600 dark:text-sky-400',
}
const BG: Record<Required<Props>['color'], string> = {
  default: 'bg-muted',
  success: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
  danger:  'bg-rose-500/10',
  info:    'bg-sky-500/10',
}

export function KpiCard({ label, value, icon: Icon, hint, color = 'default', to, loading }: Props) {
  const inner = (
    <Card className={cn(
      'group relative overflow-hidden p-4 transition',
      to && 'cursor-pointer hover:border-primary/40 hover:shadow-md'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <div className={cn('mt-1 truncate text-2xl font-bold', COLOR[color])}>{value}</div>
          )}
          {hint && !loading && (
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
          )}
        </div>
        {Icon && (
          <div className={cn('grid h-9 w-9 place-items-center rounded-md shrink-0', BG[color])}>
            <Icon className={cn('h-4 w-4', COLOR[color])} />
          </div>
        )}
      </div>
      {to && (
        <ArrowUpRight
          className="absolute right-3 top-3 h-4 w-4 opacity-0 transition group-hover:opacity-70"
        />
      )}
    </Card>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}
