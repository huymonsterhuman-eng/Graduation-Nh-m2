import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface Crumb {
  label: string
  to?: string   // nếu không có → không link (item cuối)
}

interface Props {
  items: Crumb[]
}

export function Breadcrumb({ items }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground py-3">
      <Link to="/" className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {c.to ? (
            <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
          ) : (
            <span className="text-foreground line-clamp-1 max-w-xs">{c.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
