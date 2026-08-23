import { Link } from 'react-router-dom'
import { X, Scale, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompareStore } from '@/stores/compare'
import { SmartImage } from './SmartImage'
import { formatPrice } from '@/lib/format'

/** Float bar dưới cùng khi có >= 1 SP trong compare list. */
export function CompareBar() {
  const items = useCompareStore((s) => s.items)
  const remove = useCompareStore((s) => s.remove)
  const clear = useCompareStore((s) => s.clear)

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-6rem)] md:left-1/2 md:-translate-x-1/2 rounded-lg border bg-background shadow-2xl">
      <div className="flex items-center gap-3 p-3">
        <div className="flex items-center gap-2 shrink-0">
          <Scale className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">So sánh ({items.length}/3)</span>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {items.map((p) => (
            <div key={p.id} className="relative flex items-center gap-2 rounded border px-2 py-1 shrink-0">
              <SmartImage
                src={p.image}
                alt={p.name}
                className="h-8 w-8 rounded object-cover"
                usePicsum
                seed={`p-${p.id}`}
                fallbackSize="60x60"
              />
              <div className="text-xs max-w-[140px]">
                <p className="line-clamp-1 font-medium">{p.name}</p>
                <p className="text-primary font-semibold">{formatPrice(p.salePrice ?? p.price)}</p>
              </div>
              <button onClick={() => remove(p.id)} className="rounded p-0.5 hover:bg-muted" aria-label="Xóa">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button variant="ghost" size="sm" onClick={clear} title="Xóa hết">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" disabled={items.length < 2}>
            <Link to="/so-sanh">So sánh ngay</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
