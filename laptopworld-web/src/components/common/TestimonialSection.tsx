import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from '@/components/ui/carousel'
import { Rating } from './Rating'
import { Quote } from 'lucide-react'

/**
 * Ảnh chân dung ưu tiên người Việt / Đông Á — dùng Unsplash (CC0) cho prototype.
 * Có `?w=200&h=200&fit=crop` để crop vuông. Nếu ảnh fail thì AvatarFallback hiện chữ đầu tên.
 * Không phải khách hàng thật; chỉ để tăng tính tin cậy trực quan cho đồ án demo.
 */
const TESTIMONIALS = [
  {
    name: 'Trần Minh Anh',
    role: 'Freelancer thiết kế',
    rating: 5,
    content: 'Mua MacBook Pro tại LaptopWorld, giao nhanh trong ngày, đóng gói chắc chắn. Nhân viên tư vấn nhiệt tình. Rất hài lòng!',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&auto=format&q=80',
  },
  {
    name: 'Nguyễn Văn Hùng',
    role: 'Sinh viên IT — ĐH Bách Khoa',
    rating: 5,
    content: 'Chatbot AI tư vấn khá chuẩn, giúp mình chọn được laptop phù hợp ngân sách. Giá tốt hơn nhiều nơi khác cùng cấu hình.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format&q=80',
  },
  {
    name: 'Phạm Thu Hà',
    role: 'Chủ shop online',
    rating: 5,
    content: 'Đã mua nhiều lần cho nhân viên. Chính sách bảo hành rõ ràng, đổi trả dễ. Cửa hàng ở Cầu Giấy tiện đường mình ghé lấy trực tiếp, đỡ chờ ship.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&auto=format&q=80',
  },
  {
    name: 'Lê Quốc Bảo',
    role: 'Game thủ',
    rating: 5,
    content: 'Lấy con ROG Strix Scar 15 ở đây, chơi mượt max setting mọi game. Kỹ thuật vệ sinh máy miễn phí lần đầu — điểm cộng lớn!',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&auto=format&q=80',
  },
  {
    name: 'Đỗ Thị Ngọc',
    role: 'Kế toán trưởng',
    rating: 5,
    content: 'Đặt online 8h tối, sáng hôm sau đã có máy tại văn phòng. Hoá đơn VAT đầy đủ, thanh toán chuyển khoản nhanh gọn.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&auto=format&q=80',
  },
  {
    name: 'Vũ Hoàng Long',
    role: 'Nhiếp ảnh gia',
    rating: 4,
    content: 'MacBook và màn hình rời giao đúng hẹn, cân màu chuẩn. Chỉ mong shop mở thêm chi nhánh phía Nam để bạn bè trong đó cũng mua được thuận tiện.',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&auto=format&q=80',
  },
]

export function TestimonialSection() {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Khách hàng nói gì</h2>
      <Carousel
        opts={{ align: 'start', loop: true }}
        className="relative px-2"
      >
        <CarouselContent className="-ml-4">
          {TESTIMONIALS.map((t, i) => (
            <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
              {/* h-full + card flex column để mọi card cao bằng nhau, không lệch */}
              <Card className="relative h-full">
                <CardContent className="p-5 flex h-full flex-col gap-3">
                  <Quote className="absolute right-3 top-3 h-8 w-8 text-primary/10" />
                  <Rating value={t.rating} />
                  <p className="text-sm text-muted-foreground italic leading-relaxed flex-1">
                    "{t.content}"
                  </p>
                  <div className="flex items-center gap-3 pt-3 border-t">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={t.avatar} alt={t.name} loading="lazy" />
                      <AvatarFallback>{t.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Nút điều hướng — đặt bên ngoài mép card để không đè lên nội dung */}
        <CarouselPrevious className="left-0 -translate-x-1/2" />
        <CarouselNext className="right-0 translate-x-1/2" />
      </Carousel>
    </section>
  )
}
