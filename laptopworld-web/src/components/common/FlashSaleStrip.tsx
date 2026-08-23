import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

/** Strip flash sale countdown — set target 24h từ lần mount. */
export function FlashSaleStrip() {
  const [target] = useState(() => {
    const t = new Date()
    t.setHours(23, 59, 59, 0)  // đến cuối ngày hôm nay
    return t.getTime()
  })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, target - now)
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 px-4 py-3 text-white shadow">
      <div className="flex items-center gap-2 shrink-0">
        <Zap className="h-6 w-6 fill-current" />
        <span className="text-lg font-bold uppercase">Flash Sale</span>
      </div>
      <span className="text-sm opacity-90 hidden md:inline">
        Ưu đãi giới hạn — kết thúc trong:
      </span>
      <div className="flex items-center gap-1 ml-auto shrink-0 font-mono">
        <TimeBlock v={h} />
        <span className="font-bold">:</span>
        <TimeBlock v={m} />
        <span className="font-bold">:</span>
        <TimeBlock v={s} />
      </div>
    </div>
  )
}

function TimeBlock({ v }: { v: number }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded bg-black/25 text-sm font-bold tabular-nums">
      {String(v).padStart(2, '0')}
    </span>
  )
}
