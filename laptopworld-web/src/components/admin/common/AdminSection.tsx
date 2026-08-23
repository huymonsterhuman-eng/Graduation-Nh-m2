import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  compact?: boolean
}

/**
 * Section wrapper phong cách Filament: header có icon + tiêu đề + phụ đề,
 * body nội dung. Dùng cho các form tạo/sửa admin (đơn hàng, phiếu nhập/xuất...).
 */
export function AdminSection({
  title, description, icon: Icon, actions, children, className, compact,
}: Props) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn(
        'flex flex-wrap items-start justify-between gap-2 border-b bg-muted/30',
        compact ? 'px-4 py-2.5' : 'px-4 py-3'
      )}>
        <div className="flex items-start gap-2.5">
          {Icon && (
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-1.5">{actions}</div>}
      </div>
      <div className={compact ? 'p-3' : 'p-4'}>{children}</div>
    </Card>
  )
}
