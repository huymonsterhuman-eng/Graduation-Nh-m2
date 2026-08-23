import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useCategories } from '@/hooks/api/useCategories'
import { Headphones, Zap, Mouse, Keyboard, Battery, Speaker, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const ICON_MAP: Record<string, typeof Headphones> = {
  'tai-nghe': Headphones,
  'sac-nhanh': Zap,
  'chuot': Mouse,
  'ban-phim': Keyboard,
  'sac-du-phong': Battery,
  'loa-bluetooth': Speaker,
}

/** Grid danh mục con phụ kiện — thay cho 'Danh mục nổi bật' đơn điệu cũ. */
export function AccessoriesSection() {
  const { data: tree } = useCategories()

  const phuKien = tree?.find((c) => c.slug === 'phu-kien')
  const children = phuKien?.children ?? []

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Phụ kiện chất lượng</h2>
        {phuKien && (
          <Link to={`/danh-muc/${phuKien.slug}`} className="text-sm text-primary hover:underline">
            Xem tất cả →
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {children.map((c) => {
            const Icon = ICON_MAP[c.slug] || Package
            return (
              <Link key={c.id} to={`/danh-muc/${c.slug}`}>
                <Card className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center transition hover:border-primary hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">{c.name}</span>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
