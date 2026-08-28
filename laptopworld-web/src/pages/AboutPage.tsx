import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import {
  ShieldCheck, Truck, Sparkles, Headphones, MapPin, Phone, Mail,
  Users, Package, Award, Handshake, ArrowRight,
} from 'lucide-react'

const STATS = [
  { icon: Users, label: 'Khách hàng tin dùng', value: '15.000+' },
  { icon: Package, label: 'Đơn hàng đã giao', value: '30.000+' },
  { icon: Award, label: 'Năm kinh nghiệm', value: '8+' },
  { icon: Handshake, label: 'Thương hiệu hợp tác', value: '25+' },
]

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Hàng chính hãng 100%',
    desc: 'Cam kết nhập khẩu chính ngạch, đầy đủ VAT, bảo hành nhà sản xuất. Hoàn tiền gấp đôi nếu phát hiện hàng giả.',
  },
  {
    icon: Truck,
    title: 'Giao nhanh 2 giờ',
    desc: 'Giao nội thành Hà Nội trong 2 giờ. Toàn quốc 1-3 ngày, kiểm tra hàng trước khi thanh toán (COD).',
  },
  {
    icon: Sparkles,
    title: 'Trợ lý AI tư vấn 24/7',
    desc: 'Chatbot AI tích hợp GPT giúp bạn chọn máy theo nhu cầu, so sánh sản phẩm, gợi ý theo ngân sách.',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ trọn đời',
    desc: 'Đội ngũ kỹ thuật vệ sinh máy miễn phí trọn đời. Cài lại phần mềm, tư vấn nâng cấp không phát sinh phí.',
  },
]

const MILESTONES = [
  { year: '2018', text: 'LaptopWorld ra đời tại Hà Nội với showroom đầu tiên rộng 60m² ở Cầu Giấy.' },
  { year: '2020', text: 'Mở rộng danh mục sang điện thoại, tablet, phụ kiện gaming. Kênh online chính thức.' },
  { year: '2022', text: 'Đạt mốc 10.000 đơn hàng/năm. Trở thành đại lý uỷ quyền của ASUS, Acer, MSI.' },
  { year: '2024', text: 'Ra mắt hệ thống bảo hành trực tuyến và chương trình đổi máy cũ lấy máy mới.' },
  { year: '2026', text: 'Tích hợp trợ lý AI vào website — tư vấn sản phẩm bằng ngôn ngữ tự nhiên tiếng Việt.' },
]

export function AboutPage() {
  return (
    <div className="container py-6 space-y-12">
      <Breadcrumb items={[{ label: 'Giới thiệu' }]} />

      {/* Hero */}
      <section className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          Chào mừng đến với <span className="text-primary">LaptopWorld</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          Chuỗi bán lẻ laptop, điện thoại và phụ kiện công nghệ uy tín tại Hà Nội.
          Chúng tôi tự hào là địa chỉ tin cậy của học sinh, sinh viên, dân văn phòng và game thủ trên khắp cả nước.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6 text-center space-y-2">
              <s.icon className="h-8 w-8 mx-auto text-primary" />
              <div className="text-2xl md:text-3xl font-bold">{s.value}</div>
              <p className="text-xs md:text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Câu chuyện */}
      <section className="grid gap-8 md:grid-cols-[1fr_1fr] items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Câu chuyện của chúng tôi</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Khởi đầu từ một cửa hàng nhỏ ở Cầu Giấy năm 2018, LaptopWorld ra đời với một mục tiêu đơn giản:
            <strong className="text-foreground"> giúp người Việt tiếp cận laptop chính hãng với giá hợp lý và dịch vụ hậu mãi tử tế.</strong>
          </p>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Sau 8 năm, chúng tôi đã phục vụ hơn 15.000 khách hàng, giao hơn 30.000 đơn hàng và mở rộng danh mục từ laptop
            sang điện thoại, tablet, phụ kiện. Điểm nhấn năm 2026 là việc tích hợp <strong className="text-foreground">trợ lý AI tư vấn</strong> —
            công nghệ mới giúp bạn chọn được thiết bị phù hợp mà không cần dò tìm mất thời gian.
          </p>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Chúng tôi tin rằng công nghệ nên phục vụ con người, và một chiếc laptop tốt phải đi kèm với sự tin cậy — từ nguồn hàng,
            chính sách bảo hành cho đến từng buổi tư vấn.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <img
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop"
            alt="Team LaptopWorld"
            className="rounded-lg object-cover aspect-square"
            loading="lazy"
          />
          <img
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop"
            alt="Showroom LaptopWorld"
            className="rounded-lg object-cover aspect-square mt-8"
            loading="lazy"
          />
          <img
            src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop"
            alt="Laptop"
            className="rounded-lg object-cover aspect-square"
            loading="lazy"
          />
          <img
            src="https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400&auto=format&fit=crop"
            alt="Tư vấn khách"
            className="rounded-lg object-cover aspect-square mt-8"
            loading="lazy"
          />
        </div>
      </section>

      {/* Giá trị */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Điều làm nên khác biệt</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <CardContent className="p-6 space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Cột mốc */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Hành trình 8 năm</h2>
        <div className="relative pl-6 md:pl-8 border-l-2 border-primary/30 space-y-6 max-w-3xl mx-auto">
          {MILESTONES.map((m) => (
            <div key={m.year} className="relative">
              <div className="absolute -left-[30px] md:-left-[38px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-4 ring-background">
                •
              </div>
              <div className="text-sm font-bold text-primary">{m.year}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Liên hệ */}
      <section className="rounded-xl border bg-muted/40 p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Ghé thăm chúng tôi</h2>
          <p className="text-sm text-muted-foreground">Showroom mở cửa 8:30 — 21:30 tất cả các ngày trong tuần</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Địa chỉ</p>
              <p className="text-sm text-muted-foreground">Cầu Giấy, Hà Nội</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Hotline</p>
              <p className="text-sm text-muted-foreground">1900 6789 (24/7)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Email</p>
              <p className="text-sm text-muted-foreground">support@laptopworld.vn</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center pt-2">
          <Button asChild>
            <Link to="/">
              Khám phá sản phẩm <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
