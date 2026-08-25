import { type ReactNode } from 'react'
import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  /** Padding compact khi nhúng vào Card/Table nhỏ. */
  compact?: boolean
}

/**
 * Empty state chuẩn cho admin — icon + title + description + action button.
 * Refactor từ các đoạn empty inline rải rác trong các trang list.
 */
export function AdminEmptyState({
  icon: Icon = Inbox, title, description, action, className, compact,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-center text-muted-foreground',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground max-w-md">{description}</div>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
