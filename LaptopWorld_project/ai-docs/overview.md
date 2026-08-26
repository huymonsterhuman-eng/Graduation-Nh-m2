# LaptopWorld — Tổng quan dự án

> ⚠️ **Lưu ý cho AI assistant / dev khi làm việc trên repo này:**
> - **Backend + Frontend luôn chạy trực tiếp trên branch `main`** tại đường dẫn gốc `D:\FINALYEAR\GRADUATION\LaptopWorld_project\`.
> - **Không sửa code trong `.claude/worktrees/*`** — worktree là bản clone tách biệt, thay đổi ở đó BE/FE sẽ KHÔNG pickup được. Ai đang chạy dev server sẽ không thấy thay đổi.
> - Luôn edit file trực tiếp trên main path (`LaptopWorld_project/...` và `laptopworld-web/...` từ repo root), rồi user restart BE tay (devtools đã tắt do bug Java 25 — xem [feedback memory](../../../.claude/projects/D--FINALYEAR-GRADUATION-LaptopWorld-project/memory/feedback_java25_devtools.md)); FE tự HMR.
> - Nếu Claude đang trong worktree cwd, vẫn dùng đường dẫn tuyệt đối tới main để Read/Edit/Write.

> **Đề tài:** Xây dựng hệ thống thương mại điện tử tích hợp trợ lý AI hỗ trợ tư vấn sản phẩm cho **LaptopWorld**.
> **Loại:** Đồ án tốt nghiệp.
> **Cập nhật:** 2026-08-26 (Polish MegaMenu + brand filter theo category — xem cuối doc). **Phase 11 ✅ HOÀN THÀNH** — 5 bước 11A→11E xong: 57 test tự động (41 unit + 16 integration Testcontainers) pass < 45s; Docker Compose 3 container end-to-end (`docker compose up -d` truy cập `http://localhost` OK, ảnh SP hiển thị); `AuthRateLimiter` chống brute-force login/register/forgot-password; [security-audit.md](security-audit.md) verify 0 IDOR + config prod hardened; V22 seed 5 user + 5 voucher + 10 order rải qua 6 status; Newman 154 request pass in 20.8s → [newman-report.html](newman-report.html) 2.8MB; [testcases.md](testcases.md) mở rộng từ 38 → 93 case cho báo cáo. **Hotfix cùng ngày ✅ HOÀN THÀNH (user đã verify STAFF login thành công):** (1) Tách bạch session admin/customer bằng field `loginSource` — 4 file FE (`auth.ts`, `LoginPage.tsx`, `AdminLoginPage.tsx`, `AdminProtectedRoute.tsx`); (2) **Fix bug backend chính:** `LoginResponse.UserInfo` chỉ có `roles` mà **thiếu `permissions[]`** (bỏ sót từ Sprint 9G-perm, chỉ `/auth/me` trả) — thêm field `permissions: List<String>` vào record + `AuthService.toUserInfo()` collect từ `user.roles.permissions`. Trước bug không lộ vì user luôn login ADMIN (bypass permission check); STAFF login → `hasPermission('access_admin')=undefined` → AdminLoginPage tự logout. **Polish 9F round 2 (cùng ngày, commit `41e1c53`):** (a) Cleanup demo data — xoá 15 orders `ORD-DEMO/TEST/REV-*` + 5 goods_issues + 3 users `user3/4/5`; (b) AdminBrandsPage thêm cột "Logo" (header text) + "Sản phẩm" (badge count), guardrail xoá disable khi còn SP + khoá slug khi còn SP + warn realtime khi tắt isActive; (c) Banner đa slot — V23 `banners.position` (hero_carousel/sidebar_phone/sidebar_laptop), V24 `banners.image_fit`, endpoint `GET /api/banners/slot/{position}` + hook `useBannerBySlot`, admin form Select vị trí; (d) Image cropper với `react-easy-crop` — `ImageCropperDialog` kéo/zoom/xoay + canvas→JPEG blob→upload lại, auto mở sau upload banner, aspect 16:9 hero / 1:3 sidebar; (e) `CategorySection` sidebar aspect-[1/3] cứng khớp cropper, ảnh fill 100% object-cover không cắt mép. Còn **Phase 12** (báo cáo Word + slide + video demo).

---

## 1. Mục tiêu

Xây dựng một website thương mại điện tử hoàn chỉnh dành cho cửa hàng bán lẻ thiết bị điện tử (không chỉ laptop), có tích hợp **trợ lý AI** giúp khách hàng tư vấn, so sánh và tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên. Dự án đóng vai trò minh chứng cho khả năng kết hợp:

- **Kỹ thuật backend hiện đại**: Spring Boot 4, JPA, PostgreSQL, kiến trúc phân lớp rõ ràng.
- **Frontend SPA**: React (Vite), gọi REST API — tách biệt hoàn toàn với backend.
- **AI ứng dụng**: LLM (Google Gemini) + RAG (Retrieval-Augmented Generation) với pgvector + Function Calling.
- **Nghiệp vụ thương mại điện tử thực tế**: giỏ hàng, thanh toán, quản lý đơn hàng, khuyến mãi, đánh giá, kho FIFO.

---

## 2. Progress tổng quan

**Đã xong:** Phase 0-8 + Phase 9 đầy đủ 9/9 sprint (9A→9F + 9G-perm + 9G + 9H) + Phase 10 VNPay + Phase 11 Testing/Docker. **Còn nợ:** Phase 12 báo cáo.

| Phase | Nội dung | Kết quả |
|-------|----------|---------|
| 0 | Setup env (Docker Postgres pgvector, Flyway, Spring Security…) | ✅ |
| 1 | Schema DB (24 migrations V1-V24, gồm V14_5 seed admin) | ✅ |
| 2 | Auth full flow (register, verify email, login, refresh, forgot/reset) | ✅ |
| 3 | Catalog CRUD (categories cha-con, brands, collections, products, media upload) | ✅ |
| 4 | Address, Cart, Voucher, Order + Checkout | ✅ |
| 5 | AI layer: Semantic search + Chat RAG + Chat Agent 5 tools | ✅ |
| 6 | Inventory FIFO — luồng 5 status `pending→confirmed→preparing→shipping→delivered` với kho duyệt/từ chối phiếu xuất | ✅ |
| 7 | Review (gate purchased+delivered) + Blog CRUD + Banner + rating aggregate | ✅ |
| 8 | Frontend user site React SPA (26 route, chat AI widget, wishlist, compare, dark mode, megamenu) | ✅ |
| **9** | **Frontend Admin dashboard — 9/9 sprint xong (9A→9F + 9G-perm + 9G + 9H)** | ✅ |
| 10 | Payment integration (VNPay sandbox) | ✅ |
| 11 | Testing + hardening + Docker Compose full stack | ✅ |
| 12 | Báo cáo Word + slide + video demo | ⚪ |

**Backend:** ~130+ endpoint (thêm 30 endpoint admin cho dashboard + orders + inventory + tạo đơn/phiếu).
**Frontend user site:** 26 route.
**Frontend admin:** 24+ route (`/admin/*` — Dashboard + Products + Orders + Inventory + Partners + Vouchers + Banners + Blog + Reviews).
**Dữ liệu (sau cleanup 2026-08-25):** 200 SP, 12 categories, 27 brands (Acer 0 SP), 3 partners (có code), 4 post_categories, 8 posts, 3 banners (đều slot `hero_carousel`), 5 users, 10 orders (không còn ORD-DEMO/TEST/REV), 7 goods_issues.

**Điểm nhấn Sprint 9E:**
- Race condition oversell (V19 `reserved_stock` column + PESSIMISTIC_WRITE lock)
- Bàn giao ĐVVC tự sinh mã vận đơn format `{CODE}{yyMMdd}{5 digits}`
- Filament-style form (`AdminSection` wrapper) — 3 trang tạo đơn/phiếu nhập/phiếu xuất
- Delete guardrails 4 tầng cho Product + guardrails Category/Brand
- Giá vốn (`cost_price`) + validate `import_price ≤ price`
- ProductCombobox inline (search debounce + dropdown suggestion) — thay hoàn toàn modal picker
- Java 25 compile fix: `-proc:full`

**Sprint 9G-perm (đang làm, 3/4 bước xong)** — Phân quyền chi tiết theo mẫu webthegioididong + fix trang Product:
- **Bước 0 ✅**: fix bug "không vào được trang sửa sản phẩm" — root cause: `AdminProductFormPage.tsx` dùng `cn()` không import → runtime error → trang trắng. Bonus fix `@Lock` package sai ở `ProductRepository`. Thêm cột "Kinh doanh" với toggle Switch inline trên AdminProductsPage — endpoint mới `PATCH /admin/products/{id}/active` chỉ update 1 field.
- **Bước 1 ✅**: Backend seed 30 permission chia 4 nhóm (V20 migration) + refactor `@PreAuthorize` trên 17 controller (ADMIN bypass + `hasAuthority('code')` cho từng endpoint) + RoleService + AdminRoleController (5 endpoint CRUD role + list permissions) + PermissionMetadata hardcode label tiếng Việt 4 nhóm.
- **Bước 2 ✅**: Frontend — auth store `hasPermission()` + `hasAnyPermission()` (ADMIN bypass); `adminNav.ts` mỗi item gắn `requiredPermission` / `requiredAnyPermission`; AdminSidebar + AdminMobileSidebar tự filter (ẩn item + ẩn cả group nếu rỗng); AdminProtectedRoute gate 2 cấp (layout access + route-level permission); `AdminRolesPage` list + `AdminRoleFormPage` phong cách TGDĐ (2 cột: 4 tab checkbox + panel Tóm tắt quyền hạn realtime badge màu 4 nhóm rose/sky/amber/emerald); route mới `/admin/vai-tro`, `/admin/vai-tro/moi`, `/admin/vai-tro/:id/sua`.
- **Bước 3** ~~test riêng~~ → **gộp vào Sprint 9G Bước E** (chốt 2026-08-21) để test 1 lần trên UI thật thay vì gán role bằng SQL.

**Điểm nhấn Sprint 9F:**
- 4 module CRUD content/promotion: Banners, Vouchers, Reviews moderation, Blog (PostCategories + Posts)
- Banner list với cột Thứ tự / Ảnh / Tiêu đề+link / Trạng thái / Ngày tạo-sửa+tác giả / Thao tác (button outline có text "Sửa"/"Xóa" không chỉ icon)
- Voucher form 10 field (fixed/percent, min-order, max-discount, valid range datetime, usage limit) + status badge tự tính (Đang chạy / Chưa mở / Hết hạn / Hết lượt / Ngừng) + validate realtime (clamp percent max 100, strip leading zero) + note vàng "1 đơn chỉ áp 1 voucher"
- Reviews list với filter isHidden (server-side) + rating + keyword (client-side), reply modal + toggle hide + delete. **Thêm 2 entry gửi review từ user site**: nút "Viết đánh giá" ở tab Reviews của ProductDetailPage + nút amber rõ hơn trong OrderDetailPage item khi delivered
- Posts: list page riêng với filter category/publish + form page riêng 2 cột (main: title/slug/excerpt/TipTap content; aside: publish toggle, category, ảnh, info)
- PostCategories dialog CRUD đơn giản với guardrail delete khi còn bài viết
- UX polish: datetime-local trong Radix Dialog thêm class `[color-scheme:light] dark:[color-scheme:dark]` fix picker vô hình trong dark mode

---

## 3. Cấu trúc thư mục dự án

Từ 2026-08-23 backend + frontend đã được gộp vào **cùng một git repo** ([github.com/huymonsterhuman-eng/Graduation-Nh-m2](https://github.com/huymonsterhuman-eng/Graduation-Nh-m2)):

```
D:\FINALYEAR\GRADUATION\LaptopWorld_project\   ← git repo root
├── .gitignore                    ← Ignore Report/, node_modules/, target/, uploads/, *-local.properties
├── LaptopWorld_project\          ← Spring Boot backend
│   ├── ai-docs\                  ← Tài liệu dự án (đọc trước khi làm)
│   │   ├── overview.md           ← File này
│   │   ├── plan.md               ← Kế hoạch 13 phase chi tiết
│   │   ├── database.md           ← Schema + quyết định thiết kế
│   │   ├── ai-design.md          ← Kiến trúc AI (RAG + function calling)
│   │   ├── setup-postgres-windows.md
│   │   └── LaptopWorld.postman_collection.json
│   ├── docker-compose.dev.yml    ← Postgres pgvector cổng 5433
│   ├── pom.xml
│   ├── uploads\                  ← Files admin upload (tự tạo)
│   └── src\main\
│       ├── java\com\example\LaptopWorld_project\
│       │   ├── LaptopWorldProjectApplication.java
│       │   ├── ai\               ← AI layer (Gemini REST client, RAG, Agent 5 tools)
│       │   │   ├── controller\   (ChatController, SemanticSearchController, AdminAiController)
│       │   │   ├── dto\
│       │   │   ├── entity\       (ChatSession, ChatMessage, ChatRole, ProductEmbedding)
│       │   │   ├── gemini\       (GeminiClient, dto request/response)
│       │   │   ├── prompt\       (system prompts)
│       │   │   ├── ratelimit\    (ChatRateLimiter — token bucket thuần Java)
│       │   │   ├── repository\
│       │   │   ├── service\      (ChatService, AgentChatService, SemanticSearchService…)
│       │   │   └── tool\         (ToolDefinitions 5 tools, ToolExecutor)
│       │   ├── auth\             ← Login/register/JWT
│       │   │   ├── UserPrincipal.java
│       │   │   ├── controller\, dto\, entity\ (RefreshToken, EmailVerifyToken…)
│       │   │   ├── filter\       (JwtAuthenticationFilter)
│       │   │   ├── handler\      (AuthEntryPoint, AccessDeniedHandler)
│       │   │   ├── repository\, service\ (AuthService, EmailService…)
│       │   ├── banner\           ← Banner trang chủ (Phase 7)
│       │   ├── blog\             ← PostCategory, Post (Phase 7)
│       │   ├── catalog\          ← Category, Brand, Collection, Product, ProductImage
│       │   ├── common\           ← DataInitializer, dto (ApiResponse, PagedResponse), exception, util
│       │   ├── config\           ← SecurityConfig, WebMvcConfig, GeminiConfig, JwtProperties, OpenApiConfig
│       │   ├── inventory\        ← Partner, GoodsReceipt/Detail, GoodsIssue/Detail — FIFO
│       │   ├── media\            ← MediaController upload file → /uploads/
│       │   ├── order\            ← Cart, Order, OrderDetail + CheckoutService + OrderService
│       │   ├── review\           ← Review + rating aggregate
│       │   ├── user\             ← User, Address, Role, Permission
│       │   └── voucher\          ← Voucher, UserVoucher
│       └── resources\
│           ├── application.properties
│           ├── application-dev.properties
│           ├── application-local.properties  ← gitignored (chứa Gemini key, SMTP)
│           ├── db\migration\     ← Flyway V1-V24 (auto chạy khi boot)
│           └── templates\        ← Thymeleaf email templates
│
├── laptopworld-web\              ← React + Vite frontend user site (đã gộp vào repo 2026-08-23)
│   ├── package.json
│   ├── vite.config.ts            ← Proxy /api + /uploads → localhost:8080
    ├── tailwind.config.js        ← darkMode: 'class'
    ├── components.json           ← shadcn config
    ├── index.html
    └── src\
        ├── main.tsx
        ├── App.tsx               ← Router + QueryClient + Toaster + init theme/auth
        ├── index.css             ← Tailwind + CSS vars (light + dark palette)
        ├── lib\
        │   ├── api.ts            ← Axios instance + JWT interceptor + refresh queue
        │   ├── storage.ts        ← tokenStorage wrapper localStorage
        │   ├── format.ts         ← formatPrice, productImageSrc, formatChatTime
        │   └── utils.ts          ← cn (clsx + twMerge) — shadcn helper
        ├── types\
        │   └── api.ts            ← Types map với backend response
        ├── stores\               ← Zustand
        │   ├── auth.ts           ← user + login/logout/loadCurrentUser
        │   ├── wishlist.ts       ← productIds
        │   ├── compare.ts        ← items (max 3)
        │   └── theme.ts          ← light/dark toggle
        ├── hooks\
        │   ├── useVoiceInput.ts  ← Web Speech API cho chat
        │   └── api\              ← TanStack Query hooks (22 file)
        │       ├── (user) useProducts, useCategories, useBanners, useBlog,
        │       │   useReviews, useCreateReview, useSearch, useCart,
        │       │   useAddresses, useOrders, useVouchers, useChat, useCollections
        │       └── (admin) useAdminBlog, useAdminCatalog, useAdminChatSessions,
        │           useAdminDashboard, useAdminInventory, useAdminOrders,
        │           useAdminProducts, useAdminUsers, useRoles
        ├── components\
        │   ├── ChatWidget.tsx    ← Float chat AI popup (mascot + voice + cited products)
        │   ├── MascotIcon.tsx    ← SVG mascot robot laptop inline
        │   ├── ProtectedRoute.tsx
        │   ├── ReviewDialog.tsx  ← Modal đăng review từ order delivered
        │   ├── ScrollToTop.tsx   ← Fix React Router không auto scroll
        │   ├── ui\               ← shadcn (button, input, label, card, badge, skeleton,
        │   │                       tabs, separator, carousel, dialog, dropdown-menu,
        │   │                       tooltip, popover, select, sheet, switch, table,
        │   │                       alert-dialog, avatar)
        │   ├── layout\           ← Header (2 tầng: TopBar + main), Footer, MainLayout,
        │   │                       AccountLayout, MegaMenu, TopBar
        │   ├── common\           ← ProductCard, ProductGrid, Rating, PriceTag, Pagination,
        │   │                       Breadcrumb, SmartImage, FlashSaleBlock, CategorySection,
        │   │                       AccessoriesSection, AiRecommendSection, PromoGrid,
        │   │                       TestimonialSection, CompareBar, CollectionsSection
        │   └── admin\            ← 5 file layout + adminNav.ts + 2 folder con
        │       ├── AdminLayout.tsx, AdminSidebar.tsx, AdminMobileSidebar.tsx,
        │       │   AdminTopbar.tsx, AdminProtectedRoute.tsx, adminNav.ts
        │       ├── common\       ← 14 primitive tái sử dụng cho admin:
        │       │   ├── AdminPageHeader, AdminTable, AdminSection, AdminEmptyState,
        │       │   ├── ConfirmDialog, FormDialog,
        │       │   ├── MediaUploader (upload 1 ảnh), MultiImageUploader (upload nhiều),
        │       │   ├── ImageCropperDialog (crop banner — react-easy-crop, Sprint polish),
        │       │   ├── TipTapEditor, SpecFieldsInput, SpecTemplateEditor,
        │       │   ├── ProductCombobox, OrderStatusBadge
        │       └── dashboard\    ← 10 widget cho AdminDashboardPage:
        │           ├── DashboardFilter, KpiCard,
        │           ├── RevenueChart, StockMovementChart, SalesByCategoryChart,
        │           ├── TopProductsWidget, LatestOrdersWidget,
        │           ├── DeadStockWidget, LowRatedWidget, ChatbotSection
        └── pages\
            ├── auth\             ← Login, Register, ForgotPassword, ResetPassword, VerifyEmail
            ├── HomePage.tsx      ← Trang chủ: Banner + FlashSale + 2 CategorySection + Accessories +
            │                       AI Recommend + Promo + Blog + Testimonial
            ├── CategoryListPage, ProductDetailPage, SearchPage
            ├── BlogListPage, BlogDetailPage, ComparePage
            ├── CartPage, CheckoutPage, ThankYouPage
            ├── AccountPage, AddressBookPage, OrdersPage, OrderDetailPage, MyVouchersPage
            ├── NotFoundPage
            └── admin\            ← 30+ trang admin (Sprint 9A-9H):
                ├── AdminLoginPage, AdminDashboardPage, AdminNotFoundPage, ForbiddenPage
                ├── AdminCategoriesPage, AdminBrandsPage, AdminCollectionsPage
                ├── AdminProductsPage, AdminProductFormPage
                ├── AdminOrdersPage, AdminOrderDetailPage, AdminOrderPrintPage,
                │   AdminCreateOrderPage
                ├── AdminInventoryPage, AdminPartnersPage,
                │   AdminGoodsReceiptsPage, AdminCreateReceiptPage,
                │   AdminGoodsIssuesPage, AdminCreateIssuePage
                ├── AdminBannersPage, AdminVouchersPage, AdminReviewsPage
                ├── AdminPostCategoriesPage, AdminPostsPage, AdminPostFormPage
                ├── AdminUsersPage, AdminUserDetailPage, AdminUserFormPage
                ├── AdminRolesPage, AdminRoleFormPage
                ├── AdminAiEmbeddingPage, AdminAiChatSessionsPage, ChatSessionDetailDialog
                └── AdminPlaceholderPage
```

---

## 4. Cách chạy dự án

### 4.1. Backend
```bash
cd D:\FINALYEAR\GRADUATION\LaptopWorld_project\LaptopWorld_project
docker compose -f docker-compose.dev.yml up -d       # Postgres pgvector cổng 5433
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev,local"
```
Boot xong: Flyway auto chạy 24 migrations, DataInitializer seed admin/admin123.
- API: http://localhost:8080/api/
- Swagger: http://localhost:8080/swagger-ui.html
- Health: http://localhost:8080/actuator/health

### 4.2. Frontend user site
```bash
cd D:\FINALYEAR\GRADUATION\LaptopWorld_project\laptopworld-web
npm install       # lần đầu
npm run dev       # → http://localhost:5173
```
Vite proxy `/api` + `/uploads` → localhost:8080.

### 4.3. Tài khoản test
- **Admin:** `admin` / `admin123`
- **User:** `user1` / `admin123`, `user2` / `admin123` (đã reset)

---

## 5. Công nghệ

### 5.1. Backend
- Spring Boot **4.1.0** — chạy Java 21 trên JVM 25
- PostgreSQL 16 (Docker `pgvector/pgvector:pg16` cổng **5433**), DB `laptopworld_dev`
- Flyway 12.4 migration idempotent, ddl-auto=validate
- Spring Security 6 + JJWT 0.12.6 (access + refresh token)
- Spring Mail SMTP Gmail (Thymeleaf template)
- Lombok + MapStruct
- **Devtools DISABLED** trong dev (bug NoClassDefFoundError với Java 25)

### 5.2. Frontend
- Vite 7 + React 19 + **TypeScript**
- Tailwind CSS 3 (dark mode class-based) + **shadcn/ui** (button, input, card, tabs, carousel…)
- TanStack Query v5 + Zustand persist
- React Router v6 + React Hook Form + Zod + Sonner (toast) + Lucide + embla-carousel
- Axios interceptor JWT refresh queue

### 5.3. AI Layer (điểm nhấn đồ án)
- **Gemini REST client** (RestClient built-in, không SDK)
- Text model: `gemini-3.5-flash` (đã đổi từ `gemini-flash-latest` do bị overload)
- Embedding: `gemini-embedding-001` (768 dim, có outputDimensionality)
- Retry 2 lần với backoff khi 503/502/429
- **RAG**: embed câu hỏi → top-5 SP → nhồi context vào system prompt
- **Function Calling**: Agent gọi 5 tools — `search_products`, `compare_products`, `recommend_by_budget`, `get_product_detail`, `get_my_orders` (yêu cầu login)
- pgvector HNSW index
- Rate limit token bucket 180 msg/hour, burst 20 (thuần Java, không dùng Bucket4j)

---

## 6. Trạng thái database

**24 migrations V1-V24** (gồm V14_5 seed admin trước inventory):
| Version | Nội dung |
|---------|----------|
| V1 | Extensions: vector, pg_trgm, unaccent + trigger set_updated_at |
| V2 | Catalog: categories (parent_id), brands, products (specs JSONB), product_images, collections |
| V3 | Auth: users, addresses, roles, permissions, refresh_tokens |
| V4 | Cart, orders, order_details |
| V5 | Voucher + user_voucher |
| V6 | Review |
| V7 | Inventory: partners, goods_receipts/details, goods_issues/details |
| V8 | AI: chat_sessions, chat_messages, product_embeddings vector(768) |
| V9 | Blog: post_categories, posts, banners |
| V10 | activity_log |
| V11 | Advanced indexes (FTS + trigram + JSONB GIN + HNSW vector) |
| V12 | Auth tokens seed + admin seed |
| V13 | Seed catalog (12 categories, 27 brands) |
| V14 | Seed 200 products |
| V14_5 | Seed admin trước V15 (fix bug prod: V15 seed_inventory tham chiếu admin) |
| V15 | Seed inventory (3 partners + phiếu nhập ảo bao trọn 200 SP) |
| V16 | Inventory preparing flow (thêm status preparing/pending, nullable order_id + goods_receipt_detail_id) |
| V17 | Seed blog (4 categories + 5 posts) + 3 banners |
| V18 | `partners.code` UNIQUE (mã ĐVVC) + backfill 3 partner (NCC/GHN/VP) — dùng sinh tracking number |
| V19 | `products.reserved_stock` INT (chống oversell) + `products.cost_price` NUMERIC + CHECK `cost_price ≤ price` |
| V20 | Reset + seed 30 permission 4 nhóm (hệ thống/SP-nội dung/kho-vận chuyển/bán hàng-KH) + assign ADMIN full 30 + STAFF 11 |
| V21 | Thêm cột thanh toán VNPay: `orders.payment_transaction_ref` VARCHAR(50) + `orders.paid_at` TIMESTAMPTZ + index |
| V22 | Seed demo cho báo cáo: 5 user (customer/CTV) + 5 voucher (fixed/percent) + 10 order rải qua 6 status (đã cleanup DEMO/TEST/REV sau khi review UI) |
| V23 | `banners.position` VARCHAR(50) (hero_carousel/sidebar_phone/sidebar_laptop) + backfill banner cũ về hero_carousel + index `(position, is_active, sort_order)` |
| V24 | `banners.image_fit` VARCHAR(10) NOT NULL DEFAULT 'cover' (cột dự phòng, không dùng UI — cropper đã thay thế mục đích ban đầu) |
| V25 | `collections.home_position` VARCHAR(20) NOT NULL DEFAULT 'NONE' (NONE/FEATURED_BLOCK/PHONE_CHIP/LAPTOP_CHIP) — thay `show_on_home` bool cũ để admin gán vị trí chi tiết trên homepage. Backfill `show_on_home=true` → `FEATURED_BLOCK` rồi drop cột cũ. Index composite `(home_position, is_active, sort_order)`. |
| V26 | `collections.is_featured` BOOLEAN NOT NULL DEFAULT FALSE — tách "Bộ sưu tập nổi bật" khỏi enum home_position thành toggle độc lập. Backfill `home_position='FEATURED_BLOCK'` → `is_featured=true` + reset position về `NONE`. Enum HomePosition rút gọn còn NONE/PHONE_CHIP/LAPTOP_CHIP. 1 collection có thể VỪA là chip Laptop VỪA nổi bật. Index `(is_featured, is_active, sort_order)`. |

---

## 7. Điểm khác biệt so với các ref e-commerce

| Feature | Cellphones/TGDĐ | LaptopWorld |
|---------|-----------------|-------------|
| Chatbot | Rule-based / kịch bản có sẵn | **AI Agent** với function calling (Gemini gọi 5 tools DB thật) |
| Tìm kiếm | Full-text SQL | **Semantic search** dùng embedding vector + pgvector HNSW |
| Gợi ý SP | Filter thủ công | **AI recommend** dựa trên SP đã xem (semantic search cá nhân hoá) |
| Kho FIFO | Không expose ra user | Full flow admin duyệt phiếu xuất, timeline 5 status |
| Chat voice | Không có | Web Speech API tiếng Việt (input) |

---

## 8. Roadmap phase còn lại

### Phase 9 — Frontend Admin dashboard — 🟡 6/9 sprint xong (chèn 9G-perm mới)
- ✅ **9A** — Foundation + AdminLayout emoji-group + AdminLoginPage riêng
- ✅ **9B** — Dashboard đầy đủ (6 KPI + 3 chart + 4 widget + AI section)
- ✅ **9C** — CRUD Category/Brand/Collection + Collections wire vào HomePage user site
- ✅ **9D** — Product CRUD (guardrails 4 tầng + TipTap + MultiImageUploader + SpecFieldsInput động + cost_price + re-embed)
- ✅ **9E** — Order + Inventory + Partner + tạo đơn admin + Filament-style form + race protection reserved_stock + auto tracking generator
- ✅ **9F** — Vouchers + Banners + Blog + Reviews moderation + polish UX round 1 (validate realtime, datetime dark mode, review entry ProductDetail+OrderDetail)
- ✅ **9G-perm** — Phân quyền chi tiết theo mẫu TGDĐ (30 permission 4 nhóm, refactor hasRole→hasAuthority, RoleResource UI 2 cột) — 4/4 bước xong (Bước 3 test gộp vào 9G Bước E, user đã test pass)
- ✅ **9G** — 5 bước A-E hoàn tất: Backend Users (4 endpoint + 5 guardrails, +fix SecurityConfig `/api/admin/**`); FE Users (KPI + trang chi tiết 4 tabs + trang tạo/chỉnh sửa gộp status+roles); AdminAiEmbeddingPage (3 KPI + 2 nút action + table Re-embed); Backend + FE Chat sessions (2 endpoint + list+dialog bubble 4 màu); Polish (`useCopyToClipboard` + `AdminEmptyState` + wire copy 4 chỗ). Test E2E 21 case pass trên UI thật.
- ✅ **9H** — Postman 21 folder/151 endpoint (thêm 11 folder admin: Dashboard/Product-mở-rộng/Partners/Goods-Receipts/Inventory+Issues/Banners/Reviews/Blog/Roles/Users/AI-Ops) + README rewrite 11 section (đủ tài khoản test + luồng demo phân quyền 6 bước cho hội đồng)

### Phase 10 — VNPay sandbox ✅
### Phase 11 — Testing + hardening + Docker Compose full stack ✅ (5 bước xong)
- ✅ **11A** — 41 unit test (Voucher, Jwt, Vnpay HMAC, ChatRateLimiter, AuthRateLimiter, Checkout, Inventory FIFO, AgentChat loop)
- ✅ **11B** — 16 integration test Testcontainers pgvector (AuthFlow, OrderFlow, PermissionRbac, ReviewGate) — fix bug prod V15 seed_inventory phụ thuộc admin → thêm V14_5 seed admin
- ✅ **11C** — `AuthRateLimiter` (login 10/15p, register 5/1h, forgot 3/1h theo IP) + [security-audit.md](security-audit.md) 220 dòng verify 0 IDOR
- ✅ **11D** — Docker Compose full stack 3 container (postgres + backend + frontend Nginx), Dockerfile multi-stage, `.env.example`, `application-prod.properties` hardened, README root
- ✅ **11E** — V22 seed 5 user + 5 voucher + 10 order (rải 6 status) + Newman 154 request pass 20.8s → [newman-report.html](newman-report.html) + [testcases.md](testcases.md) 38→93 case

**Hotfix Phase 11 (cùng 2026-08-25) — admin/customer session isolation:**
- **Bug:** `AdminLoginPage.tsx` chỉ check `isAdmin()` (bỏ sót từ Sprint 9G-perm) → STAFF login xong bị FE tự logout với toast "Không có quyền quản trị"
- **Bug UX:** JWT lưu localStorage chia sẻ giữa customer site + admin site → khách hàng login `/dang-nhap` xong vào `/admin/*` **không cần login lại** — sai nghiệp vụ, dễ nhầm nếu chung máy
- **Fix 4 file FE:**
  - `stores/auth.ts` — thêm field `loginSource: 'admin' | 'customer' | null` persist localStorage. `login()` nhận thêm param `source`. `logout()` clear
  - `pages/auth/LoginPage.tsx` — gọi `login(u, p, 'customer')`
  - `pages/admin/AdminLoginPage.tsx` — gọi `login(u, p, 'admin')`; gate check cả `hasPermission('access_admin')` (không chỉ `isAdmin`); auto-redirect chỉ khi `loginSource === 'admin'`
  - `components/admin/AdminProtectedRoute.tsx` — thêm rule `if (loginSource !== 'admin') redirect /admin/dang-nhap`
- **Debug flow phát hiện root cause thật:**
  - Network tab: `login` 200 → **`logout` 200 gọi ngay sau** = FE tự logout do check permission fail
  - Local Storage `lw-auth`: `user: null, loginSource: null` (đã bị logout xoá)
  - Test API `/api/auth/login`: response `user.permissions` là `MISSING` — mặc dù `/api/auth/me` trả đủ
  - Root cause: `LoginResponse.UserInfo` bỏ sót field `permissions` từ Sprint 9G-perm
- **Fix bổ sung (2 file backend):**
  - [LoginResponse.java](../src/main/java/com/example/LaptopWorld_project/auth/dto/LoginResponse.java) — thêm `List<String> permissions` vào record `UserInfo`
  - [AuthService.java](../src/main/java/com/example/LaptopWorld_project/auth/service/AuthService.java) `toUserInfo()` — collect permission codes từ `user.roles.permissions` (safe vì `findWithRolesByUsername` dùng `@EntityGraph(attributePaths={"roles","roles.permissions"})`)
- **Kết quả ✅ (2026-08-25 user verify OK):**
  - STAFF (`annguyen`, role=STAFF, có `access_admin`) login qua `/admin/dang-nhap` vào được `/admin/*`
  - Customer session vào `/admin/*` bị đá về `/admin/dang-nhap` (bắt re-login)
  - Session cũ (loginSource undefined) cũng bị force re-login — hành vi đúng
- **Note trải nghiệm:** Vite HMR đôi khi không catch được thay đổi trong Zustand store → **cần restart `npm run dev`** để test được. Đã ghi vào [feedback memory](../../../.claude/projects/D--FINALYEAR-GRADUATION-LaptopWorld-project/memory/feedback_admin_login_session_source.md).

**Polish 9F round 2 (2026-08-25 tối, commit `41e1c53`) — cleanup data + brand cột SP + banner đa slot + cropper ảnh:**

*(a) Cleanup demo data trước khi quay video Phase 12* — script SQL 1 transaction có preview + sanity check:
- Xoá 15 orders `ORD-DEMO-001..010` + `ORD-TEST-002/003/004` + `ORD-REV-005/006` (kèm 5 goods_issues auto-cancelled + goods_issue_details + user_vouchers + order_details)
- Xoá 3 users `user3/user4/user5` (id 8/9/10) — sạch dependencies vì orders của họ đã xoá trước; giữ user1/user2 làm demo customer
- Giữ 4 đơn `ORD-2026081*` có "Admin Test" trong shipping_name (mã ngày thật, không phải seed) + `GI-20260817-006` note "Test reject"
- Script lưu tại `scripts/cleanup-demo-test.sql` (worktree, chỉ dùng 1 lần)

*(b) AdminBrandsPage — 2 cột mới + guardrails realtime* ([BrandService](../src/main/java/com/example/LaptopWorld_project/catalog/service/BrandService.java), [AdminBrandsPage.tsx](../../laptopworld-web/src/pages/admin/AdminBrandsPage.tsx)):
- Cột **"Logo"** (thêm header text vì trước là `''`)
- Cột **"Sản phẩm"** — badge count + icon Package. Backend `ProductRepository.countGroupByBrandId()` bulk query 1 shot tránh N+1, merge vào `BrandDto.productCount` trong `BrandService.findAll()`
- Guardrail **xoá**: nút Trash `disabled` + tooltip "Còn X sản phẩm — chuyển SP sang brand khác trước" khi `productCount > 0` (BE đã có `BRAND_HAS_PRODUCTS` từ Sprint 9C, FE giờ hiển thị proactively)
- Guardrail **sửa slug**: `BrandService.update()` throw `SLUG_LOCKED_HAS_PRODUCTS` khi slug đổi mà brand còn SP (tránh gãy URL `/thuong-hieu/*` cũ); FE disable input + icon 🔒 + hint amber
- Warn realtime khi tắt Switch `isActive` mà brand còn SP → alert amber "Ẩn brand này sẽ khiến khách không lọc được X sản phẩm..."

*(c) Banner đa slot (V23) — CRUD theo vị trí hiển thị*:
- Cột `banners.position` (`hero_carousel` | `sidebar_phone` | `sidebar_laptop`) + backfill 3 banner cũ về `hero_carousel`
- Endpoint public `GET /api/banners/slot/{position}` (trả banner active có sort_order nhỏ nhất) + `useBannerBySlot()` hook
- `publicListActive()` đổi filter theo `SLOT_HERO_CAROUSEL` (không bị lẫn banner sidebar)
- AdminBannersPage: Select "Vị trí hiển thị" 3 option + cột badge màu theo slot (primary/sky/amber)
- HomePage.tsx: `useBannerBySlot('sidebar_phone')` + `'sidebar_laptop'` để lấy banner, fallback picsum nếu chưa có

*(d) Image Cropper — cắt ảnh vừa khung ngay trong app*:
- Cài **`react-easy-crop`** (~15KB, 2 packages)
- Component mới `ImageCropperDialog` — kéo + zoom (slider 1x-4x) + xoay (0-360° + nút 90°); canvas 2 tầng (rotate → crop) → `toBlob('image/jpeg', 0.92)` → gọi lại `/admin/media/upload` với File mới → path mới thay `form.image`
- Aspect chuẩn theo slot: **16:9** hero, **1:3** sidebar (khớp với khung CSS 1:3 của CategorySection)
- Auto mở sau khi upload lần đầu + nút "Cắt lại ảnh" hiển thị luôn ở form khi đã có ảnh
- Không cần crossOrigin ('anonymous') vì ảnh `/uploads/*` cùng origin qua Vite proxy

*(e) V24 `banners.image_fit`* — cột thêm trong plan ban đầu (cover/contain) nhưng sau khi có cropper thì không cần UI nữa. Giữ column NOT NULL DEFAULT 'cover' để không phải rollback migration.

*(f) `CategorySection` sidebar — khung cứng aspect 1:3*:
- Trước: `h-full` stretch theo grid SP → aspect biến động → object-cover cắt mép ảnh cropped
- Giờ: `aspect-[1/3]` cứng + `self-start` (không stretch) → khớp chính xác cropper 1:3, ảnh fit 100% không cắt
- Trade-off chấp nhận được: khoảng trắng ~30-80px dưới banner nếu grid SP cao hơn 720px

**Polish MegaMenu + brand filter theo category (2026-08-26) — sạch UX menu Danh mục + trang danh mục:**

Bối cảnh bug: hover **Danh mục → Điện thoại** thì khung Thương hiệu vẫn hiện Acer/Anker/Baseus/Bose/Corsair… (những hãng chỉ có laptop/phụ kiện), bấm brand ra 0 SP → cụt hứng mua. Ngoài ra `MegaMenu` link truyền `?brandId=X` nhưng `CategoryListPage` bỏ qua URL param → click "Sony" trong menu ra Samsung/iPhone.

*(a) Backend — endpoint mới `GET /api/catalog/brands?categoryId=X`:*
- [ProductRepository.findDistinctBrandsByCategoryIds](../src/main/java/com/example/LaptopWorld_project/catalog/repository/ProductRepository.java) — JPQL SELECT DISTINCT brand FROM Product WHERE category IN (:ids) AND isActive AND brand.isActive, order by brand.name.
- [BrandService.findByCategory(id)](../src/main/java/com/example/LaptopWorld_project/catalog/service/BrandService.java) — gom `parentId + all children id` (dùng `findByParentIdOrderBySortOrderAsc`), gọi repo. Trả `List<BrandDto>`.
- [BrandController.list](../src/main/java/com/example/LaptopWorld_project/catalog/controller/BrandController.java) — thêm optional `@RequestParam Long categoryId` (BC compatible: không có param thì trả all active như cũ).

*(b) FE hook mới `useBrandsByCategory(catId)` trong [useCategories.ts](../../laptopworld-web/src/hooks/api/useCategories.ts):*
- TanStack Query key `['brands', 'by-category', categoryId]`, `enabled: !!categoryId`, cache 5 phút — hover đi hover lại không refetch.

*(c) [MegaMenu.tsx](../../laptopworld-web/src/components/layout/MegaMenu.tsx) — 3 cải tiến:*
- **Thương hiệu + Nổi bật lọc theo cat đang hover**: dùng `useBrandsByCategory(effectiveCategoryId)` thay `useBrands()`. Cat chưa có SP → khung tự ẩn.
- **Sub-cat click-to-lock preview**: mỗi sub-cat có 2 vùng bấm — **tên** (button, click để filter Thương hiệu + Nổi bật theo sub, click lần 2 = unselect toggle) + **icon `↗`** (Link riêng navigate `/danh-muc/{sub.slug}`). Sub đã chọn: nền `primary/10` + text đậm. Link "← Xem tất cả" xuất hiện góc phải khung khi có sub selected. Hint 1 dòng dưới khung: *"Bấm tên để lọc theo nhánh, bấm ↗ để mở trang."* Chuyển cat cha khác → tự reset sub selected qua `useEffect([activeId])`.
- **Hover mở menu** thay click: `onMouseEnter/Leave` trên container + delay đóng 150ms qua `closeTimerRef`. Wrapper panel `pt-2` (thay `mt-2`) làm "bridge" invisible 8px giữa button và card — di chuột thẳng xuống không bị đóng. Vẫn giữ `onClick` toggle button cho mobile/touch.

*(d) [CategoryListPage.tsx](../../laptopworld-web/src/pages/CategoryListPage.tsx) — 2 fix:*
- **Sidebar filter brand dùng `useBrandsByCategory(category?.id)`** — chỉ hiện brand có SP thực sự trong cat (bao gồm sub-cat con). Consistency với MegaMenu.
- **URL query params làm source of truth** cho `brandId`/`minPrice`/`maxPrice` (dùng `useSearchParams`). Trước là `useState` local → link `?brandId=X` từ MegaMenu bị bỏ qua → filter không áp → hiện sai SP. Nay: click brand ở sidebar cũng push vào URL (`replace: true`), back/forward giữ nguyên filter. Ô nhập giá vẫn dùng draft state, commit vào URL khi bấm "Áp dụng".

**Polish HomePage sections + Collection homePosition + UX thêm SP (2026-08-26 tối) — 3 idea cùng làm 1 sprint:**

Bối cảnh: (i) Section "Điện thoại nổi bật" + "Laptop văn phòng-Gaming" trên HomePage cũng dùng `useBrands()` — hiện Acer/Akko/Anker cho cả 2 mục. (ii) Chip "Văn phòng/Gaming/Đồ họa/Mỏng nhẹ/Sinh viên" chỉ đổi màu, không filter. (iii) 2 toggle "Hoạt động" + "Hiển thị trên trang chủ" trong AdminCollectionsPage trùng nghĩa. (iv) Dialog thêm SP vào collection bắt user gõ tên trước mới thấy — chậm.

*(a) Bug 1 — Brand chip theo cat:*
- [CategorySection.tsx](../../laptopworld-web/src/components/common/CategorySection.tsx) đổi `useBrands()` → `useBrandsByCategory(categoryId)`. Điện thoại → brand chip chỉ Apple/Google/Samsung/Sony; Laptop → chỉ Dell/HP/Asus/Acer…

*(b) Bug 2 — Chip use case wire vào Collection:*
- Prop `extraChips` đổi type từ `string[]` → `Array<{label, collectionSlug}>`.
- Khi user click chip → set `activeCollectionSlug` → gọi `useCollectionProductsBySlug(slug)` thay `useProducts` → grid hiển thị SP trong collection đó. Click "Tất cả" trả về `useProducts` theo cat.
- **Brand chips ẩn khi collection active** (2 mode loại trừ, API không combine được). Ngược lại chọn brand → clear collection.
- Empty state khi collection chưa có SP: *"Bộ sưu tập này chưa có sản phẩm. Admin cần gán sản phẩm ở trang /admin/bo-suu-tap."*

*(c) Idea 1+2 — thay `showOnHome` bool bằng `homePosition` enum:*
- **Migration V25** `V25__collection_home_position.sql`: add cột `home_position VARCHAR(20) NOT NULL DEFAULT 'NONE'` + backfill `show_on_home=true` → `'FEATURED_BLOCK'` + drop `show_on_home` + index composite `(home_position, is_active, sort_order)`.
- Enum mới `HomePosition`: NONE / FEATURED_BLOCK / PHONE_CHIP / LAPTOP_CHIP. Rev backend: `Collection.homePosition` (@Enumerated STRING), `CollectionDto`/`CollectionRequest` chứa `HomePosition`, `CollectionRepository.findByHomePositionAndIsActiveTrueOrderBySortOrderAsc(position)`, `CollectionService.findByHomePosition(position)`, endpoint mới `GET /api/catalog/collections/by-position/{position}` + alias BC `/home` → FEATURED_BLOCK.
- FE type `Collection.homePosition` + hook `useCollectionsByPosition(position)` với TanStack key `['collections-by-position', position]`. `useHomeCollections()` giữ làm alias BC.
- `AdminCollectionsPage` form: Switch "Hiển thị trên trang chủ" → **Select "Vị trí trên trang chủ"** 4 option; cột list badge màu 4 loại (emerald/sky/amber/muted); hint dưới Switch "Hoạt động" làm rõ là công tắc TỔNG (ẩn khỏi mọi nơi).
- `HomePage.tsx`: bỏ 5 slug hardcode, dùng `useCollectionsByPosition('PHONE_CHIP')` + `useCollectionsByPosition('LAPTOP_CHIP')` → map thành `extraChips` tự động. Admin thêm/xóa collection → chip trên homepage cập nhật ngay (staleTime 5 phút).

*(d) Idea 3 — UX thêm SP vào collection:*
- Refactor `CollectionProductManager` dialog (`sm:max-w-6xl`):
  - Panel trái (`1fr`): danh sách SP đang có, mỗi row có nút X xóa.
  - Panel phải (`1.4fr`): **filter row** (Input keyword + Select danh mục + Select thương hiệu + button "Xóa lọc") + **list SP paginated 20/trang** hiển thị sẵn qua `useAdminProducts` (không cần gõ mới thấy) + checkbox multi-select + badge "Đã có" khi SP đã trong collection (disabled checkbox + opacity 50%) + pagination "← Trước / Sau →" + button "Thêm N sản phẩm đã chọn" (disabled khi N=0, đổi số realtime).
  - Native `<input type="checkbox">` với `accent-primary` — không cần shadcn Checkbox.
  - Sau khi thêm thành công: toast "Đã thêm N sản phẩm", clear selection, TanStack invalidate `['admin', 'collection-products', id]` tự refresh panel trái.

**Polish Collection round 2 (2026-08-26 tối muộn) — tách isFeatured + crop 3:4:**

Bối cảnh: (v) Dropdown `homePosition` mutually exclusive — chọn `FEATURED_BLOCK` là mất khả năng gán chip. User muốn 1 collection vừa là chip Laptop vừa nổi bật. (vi) Ảnh cover collection upload không có crop → khung homepage cover-crop tùy tiện, mất mép ảnh.

*(e) Idea A — Toggle `isFeatured` độc lập:*
- Migration **V26** `V26__collection_is_featured.sql`: add `is_featured BOOLEAN NOT NULL DEFAULT FALSE` + backfill `home_position='FEATURED_BLOCK'` → `is_featured=true` + reset `home_position` về `NONE` + index `(is_featured, is_active, sort_order)`.
- Enum `HomePosition` rút gọn còn 3 giá trị: `NONE`, `PHONE_CHIP`, `LAPTOP_CHIP` (bỏ `FEATURED_BLOCK`).
- Entity `Collection` thêm `isFeatured` boolean; `CollectionDto`/`CollectionRequest` thêm field; `CollectionMapper` thêm `@Mapping(target="isFeatured", source="featured")` (Lombok bỏ prefix `is`); `CollectionRepository.findByIsFeaturedTrueAndIsActiveTrueOrderBySortOrderAsc()`; `CollectionService.findFeatured()` mới.
- Endpoint mới `GET /api/catalog/collections/featured` + alias BC `/home` gọi `findFeatured()` (không còn dùng `findByPosition(FEATURED_BLOCK)`).
- FE type `Collection.isFeatured: boolean`; `useHomeCollections` đổi endpoint `/featured`. `useCollectionsByPosition` type union chỉ còn 3 giá trị.
- `AdminCollectionsPage`:
  - Dropdown "Chip trên trang chủ" chỉ 3 option (bỏ Section "Bộ sưu tập nổi bật").
  - **Thêm block toggle "Bộ sưu tập nổi bật"** với icon `Sparkles` vàng + hint "Độc lập với chip — 1 collection có thể vừa là chip Laptop vừa nổi bật."
  - Cột list "Vị trí trên trang chủ" hiện 2 badge: position (muted/sky/amber) + "⭐ Nổi bật" (yellow) khi isFeatured.

*(f) Idea B — Crop ảnh cover aspect 3:4:*
- Import `ImageCropperDialog` + state `cropperOpen`/`cropperImageSrc` như pattern AdminBannersPage. Auto mở cropper 100ms sau khi upload lần đầu; nút "Cắt lại ảnh (3:4)" hiện khi đã có ảnh. Folder `collections`.
- `MediaUploader` label ghi rõ "Ảnh cover (aspect 3:4)" + hint 1 dòng dưới.
- [CollectionsSection.tsx](../../laptopworld-web/src/components/common/CollectionsSection.tsx) đổi khung ảnh:
  - Trước: `md:h-full` (desktop stretch cột) + `h-40` (mobile 160px) → mismatch aspect 2 device.
  - Sau: `aspect-[3/4]` cố định cả 2 device + `md:items-start` để không stretch. Ảnh fill 100% object-cover khớp cropper 3:4 → không cắt mép, không méo. Fallback picsum `480x640`.

**Polish Cropper alignment (2026-08-26 tối muộn hơn) — 3 iteration fix cover-crop:**

*(g) Đổi aspect cropper khớp khung UI (Hướng "sửa cropper không đổi UI"):*
- Banner hero: `16:9` → **`3:1`** — khung carousel `h-56 md:h-80` thực tế ~1.67:1 (mobile) và ~4.5:1 (desktop), `3:1` là mid-range.
- Collection cover: `3:4` → **`1:2`** — cột stretched ~240×500 = 1:2.
- `AdminBannersPage.aspectForPosition('hero_carousel')` return `3/1`; `aspectLabel` cập nhật hint "3:1 (banner ngang dài, khớp hero)".
- `AdminCollectionsPage.ImageCropperDialog aspect={1/2}` + label "Ảnh cover (aspect 1:2)".
- `CollectionsSection` khung ảnh: `aspect-[1/2]` mobile + `md:min-h-[480px]` desktop (240 × 2) khớp cropper.

*(h) Cropper nâng cấp UX — auto-fit + zoom-out + fill white:*
- [ImageCropperDialog.tsx](../../laptopworld-web/src/components/admin/common/ImageCropperDialog.tsx):
  - `minZoom={0.2}` (thay 1) + slider `min={0.2}` → cho phép **thu nhỏ ảnh** thấy toàn ảnh gốc trong khung crop.
  - `restrictPosition={false}` — cho phép kéo ảnh ra ngoài khung (khi zoom out < 1x).
  - Canvas 2 fill `#ffffff` trước `drawImage` → vùng crop rơi ngoài ảnh gốc thành trắng (JPEG không hỗ trợ transparent, thay đen mặc định).
  - Callback `onMediaLoaded(size)` set `imgAspect` state; `useEffect(open, imgAspect)` tự trigger `fitToFrame()`.
  - `fitToFrame()`: `zoom = min(imgAspect/aspect, aspect/imgAspect)` clamp `[0.2, 1]` → toàn ảnh gọn trong khung crop khi mở dialog.
  - Nút icon `Maximize2` bên phải slider Zoom để bấm lại auto-fit bất kỳ lúc nào.

*(i) Fix container homepage banner khớp cropper 3:1:*
- Bug user báo: sau khi đổi cropper 3:1, ảnh crop khớp khung dialog nhưng homepage vẫn cover-crop lệch trên/dưới.
- Root cause: container `h-56 md:h-80 w-full` = aspect variable theo device (mobile ~1.67:1, desktop ~4.5:1), không khớp cropper 3:1.
- Fix: [HomePage.tsx](../../laptopworld-web/src/pages/HomePage.tsx) container carousel từ `w-full h-56 md:h-80 object-cover` → **`w-full aspect-[3/1] object-cover`** cố định 2 device. Skeleton loading placeholder cũng update `aspect-[3/1]` tránh layout jump.
- Trade-off: desktop container ~1440 wide → height 480px (cao hơn 320px cũ, banner đẹp hơn); mobile ~375 → height 125px (thấp hơn 224 cũ, tự nhiên vì aspect banner ngang).

### Phase 12 — Báo cáo Word + slide + video demo ⚪

Xem chi tiết trong [plan.md](plan.md).
