import { Link } from 'react-router-dom'
import { Phone, Package, Newspaper } from 'lucide-react'

/** Top bar mảnh trên header — hotline + tiện ích. */
export function TopBar() {
  return (
    <div className="hidden md:block border-b bg-muted/50 text-xs">
      <div className="container flex h-8 items-center justify-between">
        <div className="flex items-center gap-4 text-muted-foreground">
          <a href="tel:19006789" className="flex items-center gap-1 hover:text-primary">
            <Phone className="h-3 w-3" /> Hotline: 1900 6789
          </a>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link to="/tai-khoan/don-hang" className="flex items-center gap-1 hover:text-primary">
            <Package className="h-3 w-3" /> Tra cứu đơn hàng
          </Link>
          <Link to="/tin-tuc" className="flex items-center gap-1 hover:text-primary">
            <Newspaper className="h-3 w-3" /> Tin công nghệ
          </Link>
        </div>
      </div>
    </div>
  )
}
