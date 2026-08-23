import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut, User, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useAdminUi } from '@/stores/adminUi'
import { findNavByPath } from './adminNav'

export function AdminTopbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const setMobileOpen = useAdminUi((s) => s.setMobileOpen)
  const location = useLocation()
  const navigate = useNavigate()

  const nav = findNavByPath(location.pathname)

  const initials = (user?.fullName || user?.username || 'A')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/admin/dang-nhap', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <nav className="flex flex-1 items-center gap-1 text-sm text-muted-foreground">
        <Link to="/admin" className="flex items-center gap-1 hover:text-foreground">
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
        {nav && (
          <>
            <span className="mx-1">/</span>
            <span className="hidden sm:inline">{nav.groupTitle}</span>
            <span className="hidden sm:inline mx-1">/</span>
            <span className="font-medium text-foreground">{nav.itemLabel}</span>
          </>
        )}
      </nav>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Đổi chế độ sáng/tối"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[11px]">{initials || 'A'}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm md:inline">{user?.fullName || user?.username}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-semibold">{user?.fullName || user?.username}</div>
            <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/tai-khoan">
              <User className="mr-2 h-4 w-4" />
              Trang tài khoản
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Về trang chủ
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
