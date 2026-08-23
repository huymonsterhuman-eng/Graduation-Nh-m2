import { type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { type LucideIcon } from 'lucide-react'

interface Props {
  title: ReactNode
  icon?: LucideIcon
  sprint?: string
  description?: ReactNode
  actions?: ReactNode
}

export function AdminPageHeader({ title, icon: Icon, sprint, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          <h1 className="text-2xl font-bold">{title}</h1>
          {sprint && <Badge variant="outline" className="text-xs">{sprint}</Badge>}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
