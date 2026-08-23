import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router v6 không tự scroll top khi chuyển route.
 * Đặt trong <BrowserRouter> để mỗi lần pathname đổi, cuộn về đầu trang.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}
