import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SmartImage } from './SmartImage'
import { PriceTag } from './PriceTag'
import { useProducts } from '@/hooks/api/useProducts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** Flash sale block v2 — tabs date + 5 SP grid ngang có progress bar. */
export function FlashSaleBlock() {
  const [tab, setTab] = useState<'today' | 'tomorrow'>('today')
  const { data, isLoading } = useProducts({ size: 10, sort: 'price,asc' })

  // Countdown đến 22h hôm nay (hoặc mai)
  const target = useMemo(() => {
    const t = new Date()
    if (tab === 'tomorrow') t.setDate(t.getDate() + 1)
    t.setHours(22, 0, 0, 0)
    return t.getTime()
  }, [tab])

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, target - now)
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  const products = data?.content?.slice(0, 5) || []

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 text-white shadow-xl">
      {/* Top strip: title + countdown */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 fill-current text-yellow-300" />
          <span className="text-xl font-black uppercase tracking-wide">Flash Sale</span>
        </div>

        <div className="flex gap-1 ml-2">
          <TabPill active={tab === 'today'} onClick={() => setTab('today')}>Hôm nay</TabPill>
          <TabPill active={tab === 'tomorrow'} onClick={() => setTab('tomorrow')}>Ngày mai</TabPill>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm opacity-90 hidden md:inline">
            {tab === 'today' ? 'Kết thúc sau:' : 'Bắt đầu sau:'}
          </span>
          <div className="flex items-center gap-1 font-mono">
            <TimeBlock v={h} />
            <span className="font-bold">:</span>
            <TimeBlock v={m} />
            <span className="font-bold">:</span>
            <TimeBlock v={s} />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white/10 backdrop-blur-sm p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-52 bg-white/20" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-sm py-4">Chưa có sản phẩm flash sale</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {products.map((p, i) => {
              // Mock progress: SP thứ 1 đã bán 80%, 2 = 60%, 3 = 50%, 4 = 30%, 5 = 15%
              const sold = [80, 60, 50, 30, 15][i] || 20
              return (
                <Link key={p.id} to={`/san-pham/${p.slug}`}>
                  <Card className="h-full overflow-hidden text-foreground transition hover:shadow-lg">
                    <div className="aspect-square bg-muted">
                      <SmartImage
                        src={p.primaryImage}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        usePicsum
                        seed={`p-${p.id}`}
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <h4 className="line-clamp-2 h-8 text-xs font-medium leading-4">{p.name}</h4>
                      <PriceTag price={p.price} salePrice={p.salePrice ?? Math.floor(p.price * 0.85)} size="sm" showDiscount={false} />
                      {/* Progress bar */}
                      <div className="space-y-0.5">
                        <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                            style={{ width: `${sold}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Đã bán {sold}/100 suất
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

function TabPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold transition',
        active ? 'bg-white text-red-600' : 'bg-white/20 text-white hover:bg-white/30'
      )}
    >
      {children}
    </button>
  )
}

function TimeBlock({ v }: { v: number }) {
  return (
    <span className="flex h-8 w-9 items-center justify-center rounded bg-black/30 text-base font-bold tabular-nums">
      {String(v).padStart(2, '0')}
    </span>
  )
}
