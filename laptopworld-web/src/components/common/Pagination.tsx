import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number             // 0-indexed
  totalPages: number
  onChange: (page: number) => void
}

/** Phân trang đơn giản: prev - danh sách trang - next. */
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | 'dots')[] = []
  const window = 2
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= page - window && i <= page + window)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'dots') {
      pages.push('dots')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-6">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`d-${i}`} className="px-2 text-muted-foreground">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            className="h-9 min-w-9"
            onClick={() => onChange(p)}
          >
            {p + 1}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
