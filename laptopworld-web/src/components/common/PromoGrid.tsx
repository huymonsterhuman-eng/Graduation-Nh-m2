import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { GraduationCap, CreditCard, ShieldCheck, RotateCcw } from 'lucide-react'

const PROMOS = [
  {
    title: 'Ưu đãi sinh viên',
    desc: 'Giảm thêm 5-10% cho HSSV',
    icon: GraduationCap,
    color: 'from-sky-500 to-blue-600',
    to: '/tin-tuc?keyword=sinh+vien',
  },
  {
    title: 'Trả góp 0%',
    desc: 'Chỉ cần CMND, duyệt trong 15 phút',
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-600',
    to: '/tin-tuc?keyword=tra+gop',
  },
  {
    title: 'Bảo hành 24 tháng',
    desc: 'Chính hãng toàn quốc, đổi mới 1-1',
    icon: ShieldCheck,
    color: 'from-violet-500 to-purple-600',
    to: '/bao-hanh',
  },
  {
    title: 'Đổi trả 7 ngày',
    desc: 'Đổi trả miễn phí, không cần lý do',
    icon: RotateCcw,
    color: 'from-orange-500 to-red-600',
    to: '/doi-tra',
  },
]

export function PromoGrid() {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Chính sách & Ưu đãi</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROMOS.map((p) => (
          <Link key={p.title} to={p.to}>
            <Card className={`h-full overflow-hidden bg-gradient-to-br ${p.color} text-white transition hover:shadow-lg hover:scale-[1.02]`}>
              <div className="p-4 space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm">{p.title}</h3>
                <p className="text-xs opacity-90">{p.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
