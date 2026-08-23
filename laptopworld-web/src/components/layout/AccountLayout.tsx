import { NavLink, Outlet } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { User, MapPin, Package, Ticket } from 'lucide-react'

const links = [
  { to: '/tai-khoan', label: 'Thông tin cá nhân', icon: User, end: true },
  { to: '/tai-khoan/dia-chi', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/tai-khoan/don-hang', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/tai-khoan/voucher', label: 'Voucher của tôi', icon: Ticket },
]

export function AccountLayout() {
  return (
    <div className="container py-6">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <Card className="h-fit p-2">
          <nav className="space-y-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>
        </Card>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
