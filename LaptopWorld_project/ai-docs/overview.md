# LaptopWorld — Tổng quan dự án

> **Đề tài:** Xây dựng hệ thống thương mại điện tử tích hợp trợ lý AI hỗ trợ tư vấn sản phẩm cho **LaptopWorld**.
> **Loại:** Đồ án tốt nghiệp.
> **Cập nhật:** 2026-08-23 (Gộp backend + frontend vào cùng git repo [Graduation-Nh-m2](https://github.com/huymonsterhuman-eng/Graduation-Nh-m2); Sprint 9F hoàn tất + polish UX round 1 — 6/8 sprint Phase 9 xong; đang làm Sprint 9G-perm phân quyền chi tiết — **Bước 0 + 1 + 2 xong**, còn Bước 3 (Test E2E)).

---

## 1. Mục tiêu

Xây dựng một website thương mại điện tử hoàn chỉnh dành cho cửa hàng bán lẻ thiết bị điện tử (không chỉ laptop), có tích hợp **trợ lý AI** giúp khách hàng tư vấn, so sánh và tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên. Dự án đóng vai trò minh chứng cho khả năng kết hợp:

- **Kỹ thuật backend hiện đại**: Spring Boot 4, JPA, PostgreSQL, kiến trúc phân lớp rõ ràng.
- **Frontend SPA**: React (Vite), gọi REST API — tách biệt hoàn toàn với backend.
- **AI ứng dụng**: LLM (Google Gemini) + RAG (Retrieval-Augmented Generation) với pgvector + Function Calling.
- **Nghiệp vụ thương mại điện tử thực tế**: giỏ hàng, thanh toán, quản lý đơn hàng, khuyến mãi, đánh giá, kho FIFO.

---

## 2. Progress tổng quan

**Đã xong:** Phase 0-8 + Sprint 9A→9F của Phase 9. **Còn nợ:** Sprint 9G-perm (chèn mới), 9G, 9H + Phase 10-12.

| Phase | Nội dung | Kết quả |
|-------|----------|---------|
| 0 | Setup env (Docker Postgres pgvector, Flyway, Spring Security…) | ✅ |
| 1 | Schema DB (19 migrations V1-V19) | ✅ |
| 2 | Auth full flow (register, verify email, login, refresh, forgot/reset) | ✅ |
| 3 | Catalog CRUD (categories cha-con, brands, collections, products, media upload) | ✅ |
| 4 | Address, Cart, Voucher, Order + Checkout | ✅ |
| 5 | AI layer: Semantic search + Chat RAG + Chat Agent 5 tools | ✅ |
| 6 | Inventory FIFO — luồng 5 status `pending→confirmed→preparing→shipping→delivered` với kho duyệt/từ chối phiếu xuất | ✅ |
| 7 | Review (gate purchased+delivered) + Blog CRUD + Banner + rating aggregate | ✅ |
| 8 | Frontend user site React SPA (26 route, chat AI widget, wishlist, compare, dark mode, megamenu) | ✅ |
| **9** | **Frontend Admin dashboard — 6/9 sprint xong (9A→9F, chèn 9G-perm mới)** | 🟡 3 sprint |
| 10 | Payment integration (VNPay sandbox) | ⚪ |
| 11 | Testing + hardening + Docker Compose full stack | ⚪ |
| 12 | Báo cáo Word + slide + video demo | ⚪ |

**Backend:** ~130+ endpoint (thêm 30 endpoint admin cho dashboard + orders + inventory + tạo đơn/phiếu).
**Frontend user site:** 26 route.
**Frontend admin:** 24+ route (`/admin/*` — Dashboard + Products + Orders + Inventory + Partners + Vouchers + Banners + Blog + Reviews).
**Dữ liệu:** 200 SP, 12 categories, 27 brands, 3 partners (giờ có code), 4 post_categories, 8 posts, 3 banners.

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
│           ├── db\migration\     ← Flyway V1-V17 (auto chạy khi boot)
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
        │   └── api\              ← TanStack Query hooks
        │       ├── useProducts.ts, useCategories.ts, useBrands.ts
        │       ├── useBanners.ts, useBlog.ts, useReviews.ts, useCreateReview.ts
        │       ├── useSearch.ts  ← semantic search
        │       ├── useCart.ts, useAddresses.ts, useOrders.ts, useVouchers.ts
        │       └── useChat.ts    ← AI chat session + agent-message
        ├── components\
        │   ├── ChatWidget.tsx    ← Float chat AI popup (mascot + voice + cited products)
        │   ├── MascotIcon.tsx    ← SVG mascot robot laptop inline
        │   ├── ProtectedRoute.tsx
        │   ├── ReviewDialog.tsx  ← Modal đăng review từ order delivered
        │   ├── ScrollToTop.tsx   ← Fix React Router không auto scroll
        │   ├── ui\               ← shadcn (button, input, label, card, badge, skeleton,
        │   │                       tabs, separator, carousel)
        │   ├── layout\           ← Header (2 tầng: TopBar + main), Footer, MainLayout,
        │   │                       AccountLayout, MegaMenu, TopBar
        │   └── common\           ← ProductCard, ProductGrid, Rating, PriceTag, Pagination,
        │                           Breadcrumb, SmartImage, FlashSaleBlock, CategorySection,
        │                           AccessoriesSection, AiRecommendSection, PromoGrid,
        │                           TestimonialSection, CompareBar
        └── pages\
            ├── auth\             ← Login, Register, ForgotPassword, ResetPassword, VerifyEmail
            ├── HomePage.tsx      ← Trang chủ: Banner + FlashSale + 2 CategorySection + Accessories +
            │                       AI Recommend + Promo + Blog + Testimonial
            ├── CategoryListPage, ProductDetailPage, SearchPage
            ├── BlogListPage, BlogDetailPage, ComparePage
            ├── CartPage, CheckoutPage, ThankYouPage
            ├── AccountPage, AddressBookPage, OrdersPage, OrderDetailPage, MyVouchersPage
            └── NotFoundPage
```

---

## 4. Cách chạy dự án

### 4.1. Backend
```bash
cd D:\FINALYEAR\GRADUATION\LaptopWorld_project\LaptopWorld_project
docker compose -f docker-compose.dev.yml up -d       # Postgres pgvector cổng 5433
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev,local"
```
Boot xong: Flyway auto chạy 17 migrations, DataInitializer seed admin/admin123.
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

**19 migrations V1-V19:**
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
| V15 | Seed inventory (3 partners + phiếu nhập ảo bao trọn 200 SP) |
| V16 | Inventory preparing flow (thêm status preparing/pending, nullable order_id + goods_receipt_detail_id) |
| V17 | Seed blog (4 categories + 5 posts) + 3 banners |
| V18 | `partners.code` UNIQUE (mã ĐVVC) + backfill 3 partner (NCC/GHN/VP) — dùng sinh tracking number |
| V19 | `products.reserved_stock` INT (chống oversell) + `products.cost_price` NUMERIC + CHECK `cost_price ≤ price` |

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
- 🟡 **9G-perm** — Phân quyền chi tiết theo mẫu TGDĐ (30 permission 4 nhóm, refactor hasRole→hasAuthority, RoleResource UI 2 cột) — **3/4 bước xong; Bước 3 test gộp vào 9G Bước E**
- 🔴 **9G** — 5 bước A-E: Backend Users → FE AdminUsersPage → AI Embedding page → AI Chat Sessions (backend+FE) → Polish (copy-to-clipboard, empty state) + **Test E2E gộp cả 9G-perm + 9G (4 kịch bản, 21 test case)**
- 🔴 **9H** — Test end-to-end + cập nhật docs + Postman

### Phase 10 — VNPay sandbox
### Phase 11 — Testing + Docker Compose full stack
### Phase 12 — Báo cáo Word + slide + video demo

Xem chi tiết trong [plan.md](plan.md).
