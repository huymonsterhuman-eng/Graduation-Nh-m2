import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useCart } from '@/hooks/api/useCart'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Search, User, LogOut, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from './TopBar'
import { MegaMenu } from './MegaMenu'
import { useThemeStore } from '@/stores/theme'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const { data: cart } = useCart()
  const cartCount = cart?.itemCount ?? 0
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất')
    navigate('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      navigate(`/tim-kiem?q=${encodeURIComponent(keyword.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
      <TopBar />

      <div className="container flex h-16 items-center gap-3">
        <Link to="/" className="text-xl font-bold text-primary shrink-0">
          LaptopWorld
        </Link>

        <div className="hidden lg:block">
          <MegaMenu />
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm laptop, điện thoại, phụ kiện..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <nav className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sáng' : 'Chuyển tối'}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/gio-hang" aria-label="Giỏ hàng">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tai-khoan" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.fullName || user.username}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/dang-ky">Đăng ký</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
