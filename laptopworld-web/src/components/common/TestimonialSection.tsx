import { Card, CardContent } from '@/components/ui/card'
import { Rating } from './Rating'
import { Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Trần Minh Anh',
    role: 'Freelancer',
    rating: 5,
    content: 'Mua MacBook Pro tại LaptopWorld, giao nhanh trong ngày, đóng gói chắc chắn. Nhân viên tư vấn nhiệt tình. Rất hài lòng!',
    avatar: '👩‍💻',
  },
  {
    name: 'Nguyễn Văn Hùng',
    role: 'Sinh viên IT',
    rating: 5,
    content: 'Chatbot AI tư vấn khá chuẩn, giúp mình chọn được laptop phù hợp ngân sách. Giá tốt hơn nhiều nơi khác cùng cấu hình.',
    avatar: '👨‍🎓',
  },
  {
    name: 'Phạm Thu Hà',
    role: 'Chủ shop online',
    rating: 4,
    content: 'Đã mua nhiều lần cho nhân viên. Chính sách bảo hành rõ ràng, đổi trả dễ. Chỉ tiếc là chưa có cửa hàng ở Hà Nội.',
    avatar: '👩‍💼',
  },
]

export function TestimonialSection() {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Khách hàng nói gì</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Card key={i} className="relative">
            <CardContent className="p-5 space-y-3">
              <Quote className="absolute right-3 top-3 h-8 w-8 text-primary/10" />
              <Rating value={t.rating} />
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{t.content}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t">
                <span className="text-3xl">{t.avatar}</span>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
