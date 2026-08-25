import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ScrollToTop } from '@/components/ScrollToTop'
import { HomePage } from '@/pages/HomePage'
import { CategoryListPage } from '@/pages/CategoryListPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { BlogListPage } from '@/pages/BlogListPage'
import { BlogDetailPage } from '@/pages/BlogDetailPage'
import { ComparePage } from '@/pages/ComparePage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { ThankYouPage } from '@/pages/ThankYouPage'
import { VnpayReturnPage } from '@/pages/VnpayReturnPage'
import { AccountLayout } from '@/components/layout/AccountLayout'
import { AccountPage } from '@/pages/AccountPage'
import { AddressBookPage } from '@/pages/AddressBookPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { MyVouchersPage } from '@/pages/MyVouchersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminPlaceholderPage } from '@/pages/admin/AdminPlaceholderPage'
import { AdminNotFoundPage } from '@/pages/admin/AdminNotFoundPage'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminBrandsPage } from '@/pages/admin/AdminBrandsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminCollectionsPage } from '@/pages/admin/AdminCollectionsPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminProductFormPage } from '@/pages/admin/AdminProductFormPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage'
import { AdminOrderPrintPage } from '@/pages/admin/AdminOrderPrintPage'
import { AdminCreateOrderPage } from '@/pages/admin/AdminCreateOrderPage'
import { AdminCreateReceiptPage } from '@/pages/admin/AdminCreateReceiptPage'
import { AdminCreateIssuePage } from '@/pages/admin/AdminCreateIssuePage'
import { AdminPartnersPage } from '@/pages/admin/AdminPartnersPage'
import { AdminGoodsReceiptsPage } from '@/pages/admin/AdminGoodsReceiptsPage'
import { AdminGoodsIssuesPage } from '@/pages/admin/AdminGoodsIssuesPage'
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage'
import { AdminBannersPage } from '@/pages/admin/AdminBannersPage'
import { AdminVouchersPage } from '@/pages/admin/AdminVouchersPage'
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage'
import { AdminPostCategoriesPage } from '@/pages/admin/AdminPostCategoriesPage'
import { AdminPostsPage } from '@/pages/admin/AdminPostsPage'
import { AdminPostFormPage } from '@/pages/admin/AdminPostFormPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminRoleFormPage } from '@/pages/admin/AdminRoleFormPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage'
import { AdminUserFormPage } from '@/pages/admin/AdminUserFormPage'
import { AdminAiEmbeddingPage } from '@/pages/admin/AdminAiEmbeddingPage'
import { AdminAiChatSessionsPage } from '@/pages/admin/AdminAiChatSessionsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

function App() {
  const loadCurrentUser = useAuthStore((s) => s.loadCurrentUser)
  const initTheme = useThemeStore((s) => s.set)
  const currentTheme = useThemeStore((s) => s.theme)

  useEffect(() => {
    void loadCurrentUser()
    // Áp dụng theme lưu trong localStorage vào DOM lần đầu render
    initTheme(currentTheme)
  }, [loadCurrentUser, initTheme, currentTheme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />

            {/* Catalog */}
            <Route path="/danh-muc/:slug" element={<CategoryListPage />} />
            <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
            <Route path="/tim-kiem" element={<SearchPage />} />

            {/* Blog */}
            <Route path="/tin-tuc" element={<BlogListPage />} />
            <Route path="/tin-tuc/:slug" element={<BlogDetailPage />} />

            {/* Compare */}
            <Route path="/so-sanh" element={<ComparePage />} />

            {/* Auth */}
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/reset-mat-khau/:token" element={<ResetPasswordPage />} />
            <Route path="/xac-thuc-email/:token" element={<VerifyEmailPage />} />

            {/* Cart + Checkout — protected */}
            <Route path="/gio-hang" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/dat-hang" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/dat-hang/thanh-cong/:code" element={<ProtectedRoute><ThankYouPage /></ProtectedRoute>} />
            <Route path="/thanh-toan/vnpay/ket-qua" element={<ProtectedRoute><VnpayReturnPage /></ProtectedRoute>} />

            {/* Account với sidebar layout — protected */}
            <Route
              path="/tai-khoan"
              element={
                <ProtectedRoute>
                  <AccountLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountPage />} />
              <Route path="dia-chi" element={<AddressBookPage />} />
              <Route path="don-hang" element={<OrdersPage />} />
              <Route path="don-hang/:code" element={<OrderDetailPage />} />
              <Route path="voucher" element={<MyVouchersPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Admin login — standalone, không guard, không layout */}
          <Route path="/admin/dang-nhap" element={<AdminLoginPage />} />

          {/* Admin — layout riêng, guard role ADMIN */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />

            {/* Catalog */}
            <Route path="san-pham" element={<AdminProductsPage />} />
            <Route path="san-pham/moi" element={<AdminProductFormPage />} />
            <Route path="san-pham/:id/sua" element={<AdminProductFormPage />} />
            <Route path="danh-muc" element={<AdminCategoriesPage />} />
            <Route path="thuong-hieu" element={<AdminBrandsPage />} />
            <Route path="bo-suu-tap" element={<AdminCollectionsPage />} />

            {/* Sales */}
            <Route path="don-hang" element={<AdminOrdersPage />} />
            <Route path="don-hang/moi" element={<AdminCreateOrderPage />} />
            <Route path="don-hang/:id" element={<AdminOrderDetailPage />} />
            <Route path="don-hang/:id/in" element={<AdminOrderPrintPage />} />
            <Route path="voucher" element={<AdminVouchersPage />} />

            {/* Kho */}
            <Route path="phieu-nhap" element={<AdminGoodsReceiptsPage />} />
            <Route path="phieu-nhap/moi" element={<AdminCreateReceiptPage />} />
            <Route path="phieu-xuat" element={<AdminGoodsIssuesPage />} />
            <Route path="phieu-xuat/moi" element={<AdminCreateIssuePage />} />
            <Route path="ton-kho" element={<AdminInventoryPage />} />
            <Route path="doi-tac" element={<AdminPartnersPage />} />

            {/* Nội dung */}
            <Route path="bai-viet" element={<AdminPostsPage />} />
            <Route path="bai-viet/moi" element={<AdminPostFormPage />} />
            <Route path="bai-viet/:id/sua" element={<AdminPostFormPage />} />
            <Route path="danh-muc-bai" element={<AdminPostCategoriesPage />} />
            <Route path="banner" element={<AdminBannersPage />} />
            <Route path="danh-gia" element={<AdminReviewsPage />} />

            {/* AI */}
            <Route path="ai/embedding" element={<AdminAiEmbeddingPage />} />
            <Route path="ai/chat" element={<AdminAiChatSessionsPage />} />

            {/* Hệ thống */}
            <Route path="nguoi-dung" element={<AdminUsersPage />} />
            <Route path="nguoi-dung/moi" element={<AdminUserFormPage />} />
            <Route path="nguoi-dung/:id/sua" element={<AdminUserFormPage />} />
            <Route path="nguoi-dung/:id" element={<AdminUserDetailPage />} />
            <Route path="vai-tro" element={<AdminRolesPage />} />
            <Route path="vai-tro/moi" element={<AdminRoleFormPage />} />
            <Route path="vai-tro/:id/sua" element={<AdminRoleFormPage />} />

            {/* 404 admin */}
            <Route path="*" element={<AdminNotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}

export default App
