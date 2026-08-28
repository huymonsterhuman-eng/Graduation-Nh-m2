import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'

// Social icons — SVG inline vì lucide-react đã bỏ brand icons
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
    </svg>
  )
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="container py-10 grid gap-8 md:grid-cols-5">
        {/* About */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-xl font-bold text-primary">LaptopWorld</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cửa hàng laptop, điện thoại, phụ kiện chính hãng — bảo hành toàn quốc, giao nhanh 2h.
          </p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Cầu Giấy, Hà Nội</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> Hotline: 1900 6789</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@laptopworld.vn</p>
          </div>
          <div className="flex gap-2">
            <a
              href="https://www.facebook.com/laptopworldhoangminh"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border p-2 hover:border-primary hover:text-primary transition"
              aria-label="Facebook LaptopWorld Hoàng Minh"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.youtube.com/@laptopworldHM"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border p-2 hover:border-primary hover:text-primary transition"
              aria-label="Youtube LaptopWorld HM"
            >
              <YoutubeIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.instagram.com/laptopworldvn/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border p-2 hover:border-primary hover:text-primary transition"
              aria-label="Instagram LaptopWorld"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Hỗ trợ khách hàng</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tai-khoan/don-hang" className="hover:text-foreground">Tra cứu đơn hàng</Link></li>
            <li><Link to="/bao-hanh" className="hover:text-foreground">Chính sách bảo hành</Link></li>
            <li><Link to="/doi-tra" className="hover:text-foreground">Đổi trả hàng</Link></li>
            <li><Link to="/van-chuyen" className="hover:text-foreground">Vận chuyển</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Về LaptopWorld</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/gioi-thieu" className="hover:text-foreground">Giới thiệu</Link></li>
            <li><Link to="/tin-tuc" className="hover:text-foreground">Tin công nghệ</Link></li>
            <li><Link to="/tuyen-dung" className="hover:text-foreground">Tuyển dụng</Link></li>
            <li><Link to="/lien-he" className="hover:text-foreground">Liên hệ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Thanh toán</h4>
          <div className="grid grid-cols-3 gap-2">
            {['VISA', 'MC', 'JCB', 'MoMo', 'VNPay', 'COD'].map((m) => (
              <div key={m} className="flex h-8 items-center justify-center rounded border bg-background text-[10px] font-medium">
                {m}
              </div>
            ))}
          </div>

          <h4 className="font-semibold mt-4 mb-2">Chứng nhận</h4>
          <div className="rounded border bg-background p-2 text-[10px] text-center text-muted-foreground">
            Đã thông báo<br />Bộ Công Thương
          </div>
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 LaptopWorld. Đồ án tốt nghiệp — Chỉ dùng cho mục đích học thuật.
      </div>
    </footer>
  )
}
