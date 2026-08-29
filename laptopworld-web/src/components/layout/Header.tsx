import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useCart } from '@/hooks/api/useCart'
import { useWishlistStore } from '@/stores/wishlist'
import { Button } from '@/components/ui/button'
import { ShoppingCart, User, LogOut, Moon, Sun, Heart, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { TopBar } from './TopBar'
import { MegaMenu } from './MegaMenu'
import { SearchSuggest } from './SearchSuggest'
import { useThemeStore } from '@/stores/theme'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const cartCount = cart?.itemCount ?? 0
  const wishlistCount = useWishlistStore((s) => s.ids.length)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất')
    navigate('/')
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

        {/* CTA vào Hybrid Search — nổi bật để user biết có tính năng tư vấn AI, không nhầm với ô search theo tên SP */}
        <Link
          to="/tim-kiem"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 to-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:from-primary/20 hover:to-fuchsia-500/20 hover:shadow-sm shrink-0"
          title="Tìm sản phẩm bằng mô tả nhu cầu — kết hợp bộ lọc và AI"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Tư vấn AI</span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-xl">
          <SearchSuggest />
        </div>

        <nav className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sáng' : 'Chuyển tối'}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/tai-khoan/yeu-thich" aria-label="Sản phẩm yêu thích">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
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
