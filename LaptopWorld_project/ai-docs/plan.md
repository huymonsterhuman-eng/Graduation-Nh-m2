# LaptopWorld — Kế hoạch triển khai chi tiết

> Tham chiếu: [overview.md](overview.md).
> Nguyên tắc: **làm chắc từng bước, test được rồi mới sang phase kế**. Không cắt xén thứ tự để "chạy trước tính sau".
> Không có deadline cứng — mỗi phase ghi thời lượng gợi ý theo mật độ làm việc bán thời gian của sinh viên (buổi/ngày, 2-3h/buổi).

---

## Sơ đồ phase

```
Phase 0 — Setup môi trường & khởi tạo repo          (2-3 buổi)
   │
Phase 1 — Thiết kế database & Flyway migration      (4-6 buổi)
   │
Phase 2 — Auth + User + kiến trúc chung backend     (5-7 buổi)
   │
Phase 3 — Catalog module (categories/brands/products) (7-10 buổi)
   │
Phase 4 — Cart + Order + Voucher + Checkout          (10-14 buổi)
   │
Phase 5 — AI layer (Gemini + pgvector + RAG + chat)  (10-14 buổi)
   │
Phase 6 — Inventory FIFO (goods receipt/issue)        (7-10 buổi)
   │
Phase 7 — Review + Blog + Banner                     (3-5 buổi)
   │
Phase 8 — Frontend React SPA (user site)             (12-18 buổi)
   │
Phase 9 — Frontend React SPA (admin dashboard)       (10-14 buổi)
   │
Phase 10 — Payment integration (VNPay/MoMo sandbox)  (4-6 buổi)
   │
Phase 11 — Testing, hardening, seed data, Docker     (5-7 buổi)
   │
Phase 12 — Báo cáo, slide, video demo                (7-10 buổi)
```

**Tổng gợi ý:** ~85-125 buổi làm việc (≈ 3-5 tháng bán thời gian).

---

## Phase 0 — Setup môi trường & khởi tạo repo ✅ HOÀN THÀNH

**Mục tiêu:** Có project chạy được `mvn spring-boot:run` kết nối PostgreSQL local, đã cài extension pgvector, đã setup git repo.

### Việc cần làm
- [x] Cài PostgreSQL 15+ local (dùng Docker `pgvector/pgvector:pg16` cổng 5433) — [docker-compose.dev.yml](../docker-compose.dev.yml)
- [x] Extension pgvector + pg_trgm + unaccent (init script auto)
- [x] User riêng `laptopworld_app` với password
- [x] `application.properties` + `application-dev.properties` (Jackson VN, JPA validate, Flyway, JWT placeholder, CORS Vite, Gemini placeholder)
- [x] Thêm dependencies pom.xml: Spring Security, Validation, Mail, Actuator, Flyway (+ **spring-boot-flyway** cho SB4), MapStruct, JJWT 0.12.6, springdoc OpenAPI, pgvector client, spring-security-test
- [x] `.gitignore` bổ sung `application-local.properties`, `.env*`, `uploads/`, `logs/`
- [x] README + [ai-docs/setup-postgres-windows.md](setup-postgres-windows.md)
- [x] SecurityConfig tạm permit-all (Phase 2 thay)
- [ ] `git init`, commit đầu, tạo remote (chưa làm — để user tự làm khi sẵn sàng)

**Deliverable đạt:** App boot thành công, `/actuator/health` = UP, `/swagger-ui.html` mở được.

---

## Phase 1 — Thiết kế database & Flyway migration ✅ HOÀN THÀNH

**Mục tiêu:** Có toàn bộ schema PostgreSQL viết bằng Flyway migration, chạy tự động khi app khởi động.

### Việc đã làm
- [x] [ai-docs/database.md](database.md) — schema đầy đủ + quyết định thiết kế (JSONB specs, TIMESTAMPTZ, snake_case, BIGSERIAL)
- [x] V1 extensions (vector, pg_trgm, unaccent, `set_updated_at()`, `immutable_unaccent()`)
- [x] V2 catalog (categories với spec_template JSONB, brands, products với specs JSONB, product_images, collections, collection_product)
- [x] V3 auth (users, addresses, roles, permissions, user_roles, role_permissions, refresh_tokens)
- [x] V4 order (carts, cart_items, orders, order_details)
- [x] V5 voucher (vouchers, user_vouchers) + wire FK orders→vouchers
- [x] V6 review
- [x] V7 inventory FIFO (partners, goods_receipts+details, goods_issues+details) + wire FK orders→partners
- [x] V8 AI (chat_sessions, chat_messages, product_embeddings vector(768))
- [x] V9 blog (post_categories, posts, banners)
- [x] V10 activity_log
- [x] V11 advanced indexes (FTS + trigram + JSONB GIN + HNSW vector + composite)
- [x] Chạy Flyway thành công 11 migrations, DB có 32 bảng nghiệp vụ

**Deliverable đạt:** DB laptopworld_dev có đủ schema, migration idempotent.

**Quyết định kiến trúc đã chốt:**
- Thông số SP dùng JSONB (`categories.spec_template` định nghĩa template, `products.specs` chứa dữ liệu)
- Timestamps dùng `TIMESTAMPTZ`, trigger `set_updated_at()` chung
- Mã code (ORD/GR/GI) sinh ở Java service, không dùng sequence DB
- Vector index HNSW (nhanh hơn IVFFlat, không cần train)

---

## Phase 2 — Auth + User + kiến trúc chung backend ✅ HOÀN THÀNH

**Deliverable đạt:** Đăng ký + verify email + login + refresh + logout + forgot/reset password chạy end-to-end. Admin login được.

### Sprint đã làm
- [x] **Sprint 2A** — V12 migration (2 token tables + seed roles/permissions), Common infra (BaseEntity, ApiResponse, exceptions, GlobalExceptionHandler), 7 entities + 7 repositories
- [x] **Sprint 2B** — JwtService (JJWT 0.12.6 HS256), UserPrincipal, UserDetailsServiceImpl, JwtAuthenticationFilter, SecurityConfig chính (CORS chặt, method security, BCrypt), JwtAuthenticationEntryPoint (401 JSON), JwtAccessDeniedHandler (403 JSON), OpenApiConfig
- [x] **Sprint 2C** — TokenHasher (SHA256), MailService (Gmail SMTP + Thymeleaf), EmailVerificationService, RefreshTokenService, AuthService, AuthController, template verify-email.html, DataInitializer (admin/admin123)
- [x] **Sprint 2D** — PasswordResetService, template reset-password.html, thêm 2 endpoint forgot-password + reset-password
- [x] **Sprint 2E** — Postman collection [LaptopWorld.postman_collection.json](LaptopWorld.postman_collection.json) (10 request + 4 error case)

**9 endpoint hoạt động:** `POST /api/auth/{register|resend-verification|verify-email|login|refresh|logout|forgot-password|reset-password}` + `GET /api/auth/me`

**Fix quan trọng đã ghi:**
- Spring Boot 4 tách autoconfigure → cần thêm `spring-boot-flyway` explicit
- Jackson 3 (`tools.jackson.*`) → bỏ property `write-dates-as-timestamps`
- JPA Auditing với `OffsetDateTime` → cần custom `DateTimeProvider` bean
- `AuthenticationEntryPoint` tùy biến trả 401 (không phải 403 mặc định)
- SHA256 hash tokens trước khi lưu DB, email gửi raw
- Reset password → revoke tất cả refresh tokens

**Còn nợ:** Address CRUD (dời sang Phase 4 khi làm Checkout).

---

## Phase 3 — Catalog module ✅ HOÀN THÀNH

**Deliverable đạt:** Admin CRUD toàn bộ category / brand / collection / product. User search/filter/paginate/detail SP. Upload ảnh local. 200 SP đã seed từ reference sang PostgreSQL với JSONB specs.

### Sprint đã làm
- [x] **Sprint 3A** — 5 entities (Category self-ref, Brand, Product JSONB specs + soft-delete, ProductImage, Collection M:N) + 5 repositories + V13 seed 12 categories với spec_template + 26 brands
- [x] **Sprint 3B** — SlugGenerator (bỏ dấu tiếng Việt) + 8 DTOs + 3 mappers + 3 services + 3 controllers = 14 endpoint
- [x] **Sprint 3C** — Product DTOs (nested refs) + ProductMapper + ProductSpecifications (dynamic filter, effective price COALESCE) + ProductService + ProductController = 8 endpoint
- [x] **Sprint 3D** — MediaController + MediaStorageService (validate type/size, UUID filename, sanitize folder) + WebMvcConfig serve `/uploads/**` + V14 seed 200 sản phẩm (script Python convert MySQL → PostgreSQL với specs JSONB)

**Fix quan trọng đã ghi:**
- MapStruct + Lombok boolean `is*` field → cần `@Mapping(source = "active")` (Lombok bean prop bỏ prefix `is`)
- JPA CriteriaBuilder ngược lại → dùng `root.get("isActive")` (JPA FIELD access = tên field entity)
- MapStruct primary image: qualifiedByName helper `primaryImagePath` fallback ảnh đầu
- PowerShell 5.1 không có `-Form` cho `Invoke-RestMethod` multipart → dùng `curl.exe -F`

---

## Phase 4 — Cart + Order + Voucher + Checkout ✅ HOÀN THÀNH

**Deliverable đạt:** Luồng mua hàng end-to-end backend. Postman flow: login → add cart → apply voucher → checkout → xem order → admin đổi status hoạt động OK.

### Sprint đã làm
- [x] **Sprint 4A** — 4 enum (OrderStatus, PaymentMethod, PaymentStatus, VoucherType) + 6 entity (Cart/CartItem/Order/OrderDetail/Voucher/UserVoucher) + 6 repository. Voucher có `isValid()` + `calculateDiscount()` logic đầy đủ trong entity
- [x] **Sprint 4B** — Address CRUD (5 endpoint, MapStruct mapper, auto-default logic) + Cart module (5 endpoint, price change detection, stock validation)
- [x] **Sprint 4C** — Voucher module: 5 admin endpoint + 4 user endpoint (list available/mine/save/check preview)
- [x] **Sprint 4D** — CheckoutService (transaction đầy đủ, snapshot pattern, voucher mark used, order code retry) + OrderService (transition table, refund voucher khi cancel) + 4 user endpoint + 3 admin endpoint. Sinh mã ORD-YYYYMMDD-NNN qua OrderCodeGenerator
- [x] **Sprint 4E** — Postman collection [LaptopWorld.postman_collection.json](LaptopWorld.postman_collection.json) 10 folder / 58 endpoint tổng cho Phase 2+3+4

**Fix quan trọng đã ghi:**
- MultipleBagFetchException khi @EntityGraph fetch 2 List → giảm depth, để inner LAZY load trong transaction
- Voucher decrement khi cancel order — refundVoucherIfAny helper
- Snapshot productName + productImage + priceAtPurchase vào order_details (không JOIN)

**Còn nợ (đúng thiết kế):** Inventory FIFO integration khi order transition — sẽ hook ở Phase 6.

---

## Phase 5 — AI Layer (điểm nhấn đồ án) ✅ HOÀN THÀNH

**Deliverable đạt:** Semantic search + Chatbot RAG + Function calling. Bot dùng Gemini gọi 4 tool để tra cứu DB thật, không bịa giá/stock.

### Sprint đã làm
- [x] **Sprint 5A** — Gemini REST client (RestClient built-in, không SDK), EmbeddingService, ProductEmbeddingService (JdbcTemplate + pgvector, batch embed 200 SP), SemanticSearchService (native SQL vector cosine), AdminAiController + SemanticSearchController. Model: `gemini-embedding-001` (768 dim) + `gemini-flash-latest`.
- [x] **Sprint 5B** — ChatSession/ChatMessage entities, ChatService với RAG (embed câu hỏi → top-5 SP → nhồi context vào system prompt → Gemini), 3 endpoint POST/GET sessions/messages. Guest session OK (không cần login).
- [x] **Sprint 5C** — Function calling: enhanced GenerateRequest/Response (multi-turn + tools + thoughtSignature), 4 tools (search_products, compare_products, recommend_by_budget, get_product_detail), ToolExecutor dispatcher, AgentChatService với loop tool calls (max 5 iterations), endpoint `/agent-messages`.

- [x] **Sprint 5D** — Token bucket rate limiter thuần Java (30 msg/hour, burst 5, in-memory), read timeout 30s cho Gemini RestClient, error handler mapping Gemini 5xx → 502 Bad Gateway với message tiếng Việt sạch, viết `ai-docs/ai-design.md` (~2000 từ chi tiết architecture + hiệu năng + rủi ro)

**Fix quan trọng đã ghi:**
- `text-embedding-004` deprecated → dùng `gemini-embedding-001` (support outputDimensionality=768)
- `gemini-2.0-flash` / `2.5-flash` deprecated → dùng alias `gemini-flash-latest`
- Gemini 2.5+ thinking mode ăn hết maxOutputTokens → set `thinkingBudget=0`
- Function calling requires `thoughtSignature` preserve khi echo model turn back
- Long-running batch không nên dùng @Transactional wrap outer method (block INSERT)
- pgvector chưa support JPA type → dùng JdbcTemplate + PGvector literal `?::vector`

---

## Phase 6 — Inventory FIFO ✅ HOÀN THÀNH (refactor giống webthegioididong)

**Deliverable đạt:** Luồng đầy đủ 5 trạng thái đơn `pending → confirmed → preparing → shipping → delivered` với vai trò sales/kho tách biệt. Phiếu xuất kho có bước duyệt (pending → completed/cancelled). Hỗ trợ cả phiếu tự động (auto — từ order) và phiếu thủ công (manual — admin tự tạo).

### Luồng nghiệp vụ
```
Sales                             Kho
─────                             ────
pending → confirmed → preparing → APPROVE → shipping → delivered
                          │       (FIFO chạy, trừ kho)      │
                          │                                 ▼
                          │       REJECT → về confirmed  cancelled → hoàn kho
                          │       (không trừ kho)
                          ▼
                       cancelled (hủy phiếu pending, không hoàn kho)
```

### Sprint đã làm
- [x] **Sprint 6A** — Partners CRUD + Goods Receipts (create phiếu nhập trong transaction, tự sinh code `GR-YYYYMMDD-NNN`, tăng `products.stock`, list/detail admin).
- [x] **Sprint 6B v1** — GoodsIssue entities + `InventoryService.reduceStockForOrder` chạy FIFO tại `confirmed→shipping`. **Đã refactor ở v2 dưới.**
- [x] **Sprint 6C** — Admin inventory endpoints + `V15__seed_inventory.sql` (3 partners + 1 phiếu nhập ảo `GR-SEED-INIT-001` bao trọn 200 SP với `import_price = ROUND(price*0.85)`).
- [x] **Sprint 6D (refactor)** — Đưa luồng về giống webthegioididong:
  - `V16__inventory_preparing_flow.sql`: thêm `preparing` vào `orders.status`, cột `preparing_at`, thêm `pending` vào `goods_issues.status` (default `pending`), cho phép NULL `goods_issues.order_id` (phiếu manual) và `goods_issue_details.goods_receipt_detail_id` (stub khi phiếu pending).
  - `OrderStatus` enum thêm `preparing`. `GoodsIssueStatus` thêm `pending`.
  - Bảng transition mới: `confirmed→{preparing,cancelled}`, `preparing→{cancelled}`. Hai transition `preparing→shipping` và `preparing→confirmed` do system-only (bypass ALLOWED, được set trong `InventoryService.approveIssue/rejectIssue`).
  - `adminUpdateStatus` chặn admin gửi `status=shipping` (`MUST_APPROVE_ISSUE_FIRST`) hoặc `status=confirmed` từ preparing (`USE_REJECT_ISSUE`) — message tiếng Việt rõ ràng.
  - `InventoryService` refactor: xóa `reduceStockForOrder`, thay bằng
    - `createPendingIssueForOrder(order, author)` — tạo phiếu `type=auto status=pending` + stub details, KHÔNG trừ kho
    - `approveIssue(issueId, actor)` — xóa stub, chạy FIFO qua `@Lock PESSIMISTIC_WRITE`, set `completed` + `total_cogs`, tự đẩy order sang `shipping` (nếu auto)
    - `rejectIssue(issueId, reason)` — set `cancelled`, append lý do vào note, tự đưa order về `confirmed` (nếu auto)
    - `cancelPendingIssueForOrder(order)` — hủy phiếu pending khi cancel order ở preparing (không hoàn kho)
    - `createManualPendingIssue(req, author)` — admin tạo phiếu manual (order=NULL, note bắt buộc), sau đó vẫn cần approve mới trừ kho
    - `rollbackStockForOrder(order)` giữ nguyên cho cancel sau shipping
  - Hook `doTransition` mới: `confirmed→preparing` gọi createPendingIssueForOrder + set `preparingAt`; `preparing→cancelled` gọi cancelPendingIssueForOrder; `shipping/delivered→cancelled` gọi rollbackStockForOrder.

### 14 endpoint (79 tổng):
- **Partners (5):** `GET/POST/PUT/DELETE /api/admin/partners`, `GET /api/admin/partners/{id}`
- **Receipts (3):** `GET/POST /api/admin/goods-receipts`, `GET /api/admin/goods-receipts/{id}`
- **Inventory (6):**
  - `GET /api/admin/inventory/products/{id}/batches` — xem tồn theo lô
  - `GET /api/admin/goods-issues` (list, filter status), `GET /api/admin/goods-issues/{id}`
  - `POST /api/admin/goods-issues/{id}/approve` — kho duyệt, FIFO chạy
  - `POST /api/admin/goods-issues/{id}/reject` — kho từ chối (body `{reason?}`)
  - `POST /api/admin/goods-issues` — admin tạo phiếu manual (body `{note, items:[{productId,quantity}]}`)

### 7 kịch bản test đã pass end-to-end:
1. `confirmed→preparing` tự tạo phiếu pending + stub, kho không đụng, `preparing_at` set ✓
2. Kho **approve** phiếu auto → FIFO trừ batch cũ trước (batch#1 giá 22.091.500), COGS=44.183.000đ, order tự sang `shipping` ✓
3. Kho **reject** phiếu → `cancelled` + note append `[Từ chối] Hàng chưa về kịp`, order tự về `confirmed`, kho nguyên ✓
4. Cancel order ở `preparing` → phiếu pending → cancelled, kho không hoàn (chưa trừ) ✓
5. Cancel order ở `shipping` → hoàn kho về đúng batch, issue → cancelled ✓
6. Manual issue → approve → FIFO trừ đúng, COGS chuẩn ✓
7. Manual issue → reject → cancelled, kho nguyên ✓

---

## Phase 7 — Review + Blog + Banner ✅ HOÀN THÀNH

**Deliverable đạt:** Review có bảo vệ (chỉ khách đã mua + delivered), rating aggregate expose vào catalog; Blog CRUD đầy đủ có publish flow + tăng views; Banner CRUD có sort_order. Toàn bộ đã seed data mẫu qua V17.

### Sprint đã làm
- [x] **Sprint 7A** — `review/` module + rating aggregate:
  - Entity `Review` (rating 1-5, comment, image JSONB, is_hidden, admin_reply). UNIQUE(user_id, product_id).
  - `ReviewService.createReview` check `OrderRepository.existsDeliveredOrderWithProduct` → chỉ user đã mua + đơn delivered mới được review.
  - Public: `POST /api/reviews`, `GET /api/catalog/products/{id}/reviews`.
  - Admin: `GET/PUT hide/PUT reply/DELETE /api/admin/reviews`.
  - Expose `avgRating` + `reviewCount` vào `ProductListItemDto` + `ProductDetailDto`. Bulk aggregate 1 query cho list (tránh N+1) qua `ReviewService.getRatingSummariesBulk`, single-query cho detail.
- [x] **Sprint 7B** — `blog/` module:
  - Entities `PostCategory`, `Post` (author + category nullable).
  - `PostRepository` với 2 spec static: `publishedFilter` (public — chỉ published + publishedAt<=now, filter keyword/category), `adminFilter` (admin — filter mọi trạng thái).
  - `PostService` với auto slug (từ title), auto author (current user), publish lần đầu tự set `publishedAt=now()`, tăng `views` khi GET public detail.
  - `PostCategoryService`: CRUD với check FK khi delete (báo `CATEGORY_IN_USE`).
  - Admin: `GET/POST/PUT/DELETE /api/admin/post-categories`, `GET/POST/PUT/DELETE /api/admin/posts`.
  - Public: `GET /api/blog/post-categories`, `GET /api/blog/posts` (filter keyword+category), `GET /api/blog/posts/{slug}`.
- [x] **Sprint 7C** — `banner/` module + V17 seed + docs:
  - Entity `Banner` (title, image, link, sort_order, is_active, author).
  - `BannerService`: admin CRUD, public list active sort by sort_order asc.
  - Admin: `GET/POST/PUT/DELETE /api/admin/banners`, `GET /{id}`.
  - Public: `GET /api/banners` (list active).
  - `V17__seed_blog_banner.sql`: 4 post_categories chuẩn (idempotent ON CONFLICT), 5 posts published mẫu, 3 banners active.

### 23 endpoint mới (102 tổng):
- **Review (6):** POST + 1 GET public + 4 admin (GET list, PUT hide, PUT reply, DELETE)
- **Blog PostCategory (5+1):** 5 admin + 1 public list
- **Blog Post (5+2):** 5 admin + 2 public (list, detail by slug)
- **Banner (5+1):** 5 admin + 1 public list active

### Test đã pass end-to-end:
- **7A (8 kịch bản):** NOT_PURCHASED, ALREADY_REVIEWED, admin hide/reply, rating expose vào ProductDto (single + bulk).
- **7B (5 kịch bản):** tạo category auto slug, draft public không thấy, publish → thấy + auto set publishedAt, views tăng 1 mỗi GET, filter category + keyword.
- **7C:** V17 migration chạy OK, public list banner sort đúng, admin CRUD banner đầy đủ.

---

## Phase 8 — Frontend React SPA (user site) ✅ HOÀN THÀNH

**Deliverable đạt:** SPA React user site đủ chức năng — duyệt catalog, đặt hàng, quản lý tài khoản, chat AI. `npm run dev` mở `http://localhost:5173`, thao tác end-to-end mượt.

**Thư mục:** `D:\FINALYEAR\GRADUATION\laptopworld-web\` (ngang cấp backend).

**Stack:** Vite 7 + React 19 + TypeScript + Tailwind 3 + **shadcn/ui** (Button, Input, Label, Card, Badge, Skeleton, Tabs, Separator, Carousel — copy-paste), TanStack Query v5 + Zustand persist + React Router v6 + Axios (interceptor JWT refresh queue) + React Hook Form + Zod + Sonner + Lucide + embla-carousel.

### Sprint đã làm
- [x] **Sprint 8A** — Foundation:
  - Vite scaffold + Tailwind + shadcn setup + Vite proxy `/api` + `/uploads` → `localhost:8080`
  - Alias `@/*` → `src/*`, tắt `spring.devtools.restart.enabled` để tránh bug NoClassDefFoundError với Java 25
  - Axios instance: request interceptor gắn Bearer, response interceptor 401 → refresh queue chống race condition, fail → dispatch `auth:logout` event
  - `useAuthStore` (Zustand persist) — user + login/logout/loadCurrentUser
  - Layout: `MainLayout` (Header + Footer + `<Outlet>`), `ProtectedRoute` redirect `/dang-nhap` giữ `from`
  - 5 auth pages: login, register (Zod validation), forgot-password, reset-password/:token, verify-email/:token

- [x] **Sprint 8B** — Catalog + Homepage:
  - 7 API hooks: `useProducts` (list/detail/related), `useCategories`, `useBrands`, `useBanners`, `useProductReviews`, `useBlog` (posts + categories), `useSemanticSearch`
  - Common components: `ProductCard`, `ProductGrid` (skeleton + empty), `Rating` (half-star), `PriceTag` (VND + strike sale), `Pagination`, `Breadcrumb`, `SmartImage` (auto fallback picsum.photos khi ảnh gốc 404)
  - 6 pages: `HomePage` (banner carousel + danh mục grid + 2 section SP), `CategoryListPage` (filter brand + price + sort), `ProductDetailPage` (gallery + tabs mô tả/thông số/reviews + related + sticky purchase card), `SearchPage` (**semantic search AI** + fallback text), `BlogListPage`, `BlogDetailPage`

- [x] **Sprint 8C** — Cart + Checkout + Account:
  - Hooks: `useCart` + mutations, `useAddresses` + mutations, `useMyOrders/OrderByCode/Checkout/CancelOrder`, `useAvailableVouchers/MyVouchers/SaveVoucher/checkVoucherApi`
  - Cart badge trong Header (auto update qua TanStack Query)
  - `CartPage`: qty +/-, xóa, voucher preview
  - `CheckoutPage`: 4 section (địa chỉ / shipping / payment / note), sidebar review, voucher auto-áp
  - `ThankYouPage` sau checkout
  - `AccountLayout` sidebar + 5 sub-pages: profile, address book CRUD + set-default, orders list với status tabs + pagination, order detail với timeline 5 status + button hủy, my vouchers
  - `ProductDetail` wire "Mua ngay" (thêm giỏ + navigate `/dat-hang`) và "Thêm giỏ"
  - Fix `AddressService.create` (multi-instance Hibernate conflict) + voucher tiếng Việt trong DB
  - `ScrollToTop` component (React Router v6 không auto scroll)

- [x] **Sprint 8D** — Chat AI widget + review từ order:
  - `useChat` hooks: `useCreateChatSession`, `useSendAgentMessage`, `chatSessionStorage` (localStorage session_id persist)
  - `ChatWidget` — float button bottom-right + popup 380×560. Guest OK, message bubble user/assistant + typing dots + suggestions chips + cited products link. Endpoint `/api/ai/chat/sessions/{id}/agent-messages` (**điểm nhấn AI** — Gemini gọi 4 tools). Mount trong `MainLayout` — hiện mọi trang.
  - `useCreateReview` + `ReviewDialog` — modal chọn 1-5 sao + comment. Trong `OrderDetailPage` khi order delivered, mỗi item có nút "Đánh giá"

### ~26 route + ~40 file
- Auth: `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/reset-mat-khau/:token`, `/xac-thuc-email/:token`
- Catalog: `/`, `/danh-muc/:slug`, `/san-pham/:slug`, `/tim-kiem`
- Blog: `/tin-tuc`, `/tin-tuc/:slug`
- Cart/Checkout: `/gio-hang`, `/dat-hang`, `/dat-hang/thanh-cong/:code`
- Account (protected): `/tai-khoan`, `/tai-khoan/dia-chi`, `/tai-khoan/don-hang`, `/tai-khoan/don-hang/:code`, `/tai-khoan/voucher`
- 404: `*`

### Test đã pass:
- Toàn bộ flow: xem catalog → chi tiết → thêm giỏ → checkout → xem đơn → hủy đơn ✓
- Semantic search AI trả kết quả có similarity % ✓
- Chat AI widget gửi câu hỏi + agent tự gọi tools ✓
- Đánh giá SP sau delivered — chặn NOT_PURCHASED nếu chưa mua ✓
- Cart badge, scroll top, mua ngay 1-click ✓

---

## Phase 9 — Frontend React SPA (admin dashboard) 🟡 6/9 sprint xong (chèn Sprint 9G-perm mới)

**Mục tiêu:** Có admin dashboard riêng (route `/admin/*` trong cùng project `laptopworld-web`), CRUD được toàn bộ. Tham khảo phong cách webthegioididong (Filament resource) — section-based layout, badge màu, guardrails nghiệp vụ.

**Kiến trúc chốt:**
- Admin nằm trong `laptopworld-web` (chung project với user site) — chia sẻ Axios/AuthStore/shadcn/theme
- Trang đăng nhập riêng `/admin/dang-nhap` (UI dark, brand + shield icon) — reuse `POST /api/auth/login` + verify role ADMIN post-login
- Bug fix Java 25: thêm `-proc:full` vào `maven-compiler-plugin.compilerArgs` (Java 24+ tắt annotation processor mặc định)

### Sprint đã làm

- [x] **Sprint 9A — Foundation + Login** (~2 buổi)
  - Backend: `GET /api/admin/pending-counts` (orders pending + preparing, goods-issues pending) — dùng cho badge sidebar poll 30s
  - shadcn thêm: `dropdown-menu` / `tooltip` / `avatar` / `sheet`
  - `useAuthStore` mở rộng `hasRole()` + `isAdmin()`
  - `AdminLayout` với sidebar co gọn (collapsed mode + tooltip khi icon-only), 7 nav group emoji (📊 / 📦 / 🛒 / 🏭 / 📝 / 🤖 / 🔐), badge count đỏ ở nav item
  - `AdminMobileSidebar` dùng Sheet drawer < lg
  - `AdminTopbar` breadcrumb auto-generate + theme toggle + user dropdown
  - `AdminProtectedRoute` guard role ADMIN, `ForbiddenPage`, `AdminNotFoundPage`
  - `AdminLoginPage` — UI dark, brand LW + shield icon, tự check role sau login
  - Route `/admin/*` với 17 route (dashboard + 15 placeholder + 404)
  - Fix bug: sidebar text mờ trong light mode → tách CSS class `admin-nav-link` bypass Tailwind CSS var + explicit color slate-700/300; section header nổi bật hơn (fontweight 700, size 12px, border-b)

- [x] **Sprint 9B — Dashboard đầy đủ** (~3 buổi)
  - Backend: 10 endpoint `/api/admin/dashboard/*`: kpi (6 số) + revenue-timeseries + stock-movement + sales-by-category + top-products + dead-stock + low-rated + latest-orders + chatbot-stats + chatbot-top-questions
  - `AdminDashboardService` dùng JdbcTemplate + smart bucket day/week/month theo range (Java `WeekFields` + `LocalDate`)
  - Cài `recharts`, shadcn `table`/`dialog`/`alert-dialog`/`select`/`popover`
  - Common primitives: `DashboardFilter` (7/30/tháng preset + URL param sync) + `KpiCard` (5 color, link, arrow hover)
  - 3 chart Recharts: LineChart doanh thu / BarChart 2-series Nhập-Bán / PieChart top danh mục
  - 4 widget bảng: TopProducts / LatestOrders / DeadStock / LowRated
  - AI section: ChatbotStats 4 KPI (sessions/messages/loggedInRate/avgResponseMs) + TopQuestions bảng
  - Fix: `tailwind.config.js` thiếu mapping `popover` → dropdown/dialog trong suốt → thêm

- [x] **Sprint 9C — Catalog CRUD nhỏ + Collections wire vào HomePage** (~2 buổi)
  - Common primitives: `AdminPageHeader` (title + icon + sprint badge + actions ReactNode), `AdminTable` (columns config + skeleton + empty + toolbar), `ConfirmDialog` (AlertDialog), `FormDialog` (modal form 3 size), `MediaUploader` (1 file upload + preview + xóa), `SpecTemplateEditor` (row-based UI + auto sinh key từ label, dropdown kiểu text/number/boolean)
  - Cài shadcn `switch`
  - 3 CRUD pages: `AdminBrandsPage` / `AdminCategoriesPage` / `AdminCollectionsPage`
  - Collections product manager: dialog side-by-side (list SP hiện tại + search thêm mới)
  - Backend: `CollectionService.findProductsInCollection` + `GET /api/admin/collections/{id}/products`
  - Wire Collections vào HomePage user site: 
    - Backend `GET /api/catalog/collections/{slug}/products?limit`  
    - `useHomeCollections` + `useCollectionsWithProducts` + `CollectionsSection` (tab layout — mỗi collection = 1 tab pill, chỉ hiện SP của tab đang chọn, tránh dài trang)
  - Fix guardrails delete: category/brand còn SP → chặn (`CATEGORY_HAS_PRODUCTS`, `BRAND_HAS_PRODUCTS`)
  - Fix: sortOrder không nhận âm

- [x] **Sprint 9D — Product CRUD hoàn chỉnh** (~3 buổi)
  - Backend guardrails delete 4 tầng: `PRODUCT_IN_ORDER` / `PRODUCT_IN_RECEIPT` / `PRODUCT_IN_ISSUE` / `PRODUCT_HAS_STOCK` — chặn với message VN rõ ràng
  - `ProductSpecifications.withAdminFilter` + enum `StockStatus` (ALL/IN_STOCK/LOW_STOCK 5-10/CRITICAL 1-4/OUT_OF_STOCK)
  - Endpoint `POST /api/admin/products/{id}/restore` + `GET /deleted` (native bypass `@SQLRestriction`)
  - Endpoint `POST /api/admin/ai/embed-products/{id}` re-embed single SP (fix bug LazyInitException: `findWithDetailsById` + `@Transactional`)
  - Cài `@tiptap/react` + starter-kit + placeholder + link
  - 3 common form primitives: `TipTapEditor` (toolbar bold/italic/H2/H3/list/quote/link/undo-redo), `MultiImageUploader` (multi-file + grid thumbnail + ⭐ set primary + ← → reorder + 🗑 xóa), `SpecFieldsInput` (dynamic form theo `SpecField[]` + hiện "orphan fields" khi đổi category, không mất data)
  - `AdminProductsPage` list + 5 filter (keyword/category/brand/active/stockStatus) + tab "Đang bán / Đã xóa" + stock badge màu 4 mức + actions (edit/delete/restore/re-embed)
  - `AdminProductFormPage` trang riêng 2 cột: main (name/slug/sku + TipTap description + SpecFields động theo category) + aside (price/salePrice/costPrice + brand/category select + isActive/featured + MultiImageUploader + Re-embed)
  - **Stock read-only** trong form — chỉ chỉnh qua Phiếu nhập/xuất (backend ignore `stock` từ request)

- [x] **Sprint 9E — Order + Inventory + tính năng lớn** (~5 buổi — kéo dài do thêm race protection + tạo đơn admin + refactor form Filament style)
  
  **Order + Inventory (nghiệp vụ FIFO):**
  - Backend: OrderService `adminSearch` mở rộng thêm date range from/to; `countByStatus` + endpoint `GET /admin/orders/status-counts` cho tabs
  - Backend fix: COD delivered → tự set `payment_status = paid`
  - 8 hooks Order + 13 hooks Inventory + common `OrderStatusBadge` (3 badge màu thống nhất: OrderStatus, IssueStatus, IssueType)
  - `AdminOrdersPage` — **tabs 7 status với count badge màu** (Tất cả + 6 status) + filter date/keyword + cột "Đơn vị vận chuyển" (fetch `usePartners('shipping_provider')` map partnerId→name) + pagination
  - `AdminOrderDetailPage` — timeline 5 status, copy code, item snapshot, 4 nút action theo status (Xác nhận / Chuyển kho + tracking / Đã giao / Hủy) với modal description khác nhau; block info khi `preparing` "chờ kho duyệt"
  - `AdminOrderPrintPage` `/admin/don-hang/:id/in` — layout A4, `@media print` giấu toolbar
  - `AdminPartnersPage` CRUD 2 loại (supplier/shipping_provider) + cột "Mã" badge mono
  - `AdminGoodsIssuesPage` — **2 tab lớn Auto/Manual** (backend spec filter type + `GET /admin/goods-issues/counts` cho badge), approve label động (Truck cho auto, CheckCircle cho manual) với modal description khác nhau, reject có form lý do, badge phiếu xuất
  - `AdminInventoryPage` — list SP + stock badge màu + view batches FIFO dialog (marker "FIFO next")
  
  **Fix bug quan trọng:**
  - Bug `Specification` apply `orderBy` lên **count query** → Hibernate throw 500 → bỏ orderBy trong spec, đưa sort xuống `@PageableDefault`
  - Bug Java 25 clean compile: thêm `-proc:full` vào compilerArgs
  - Bug race condition oversell → **V19 migration + reserved_stock column** + `Product.getAvailableStock()` + `ProductRepository.findByIdForUpdate` (PESSIMISTIC_WRITE lock) + refactor CheckoutService/AdminOrderCreateService/OrderService.cancel/InventoryService.approveIssue để track reserved
  
  **Bàn giao ĐVVC + auto tracking:**
  - V18 migration: `partners.code` UNIQUE + backfill 3 partner (NCC/GHN/VP)
  - Partner entity + DTO + Request có `code`; PartnerService auto-gen từ tên
  - `TrackingNumberGenerator` format `{CODE}{yyMMdd}{5 digits}` (VD `GHN26081912345`)
  - `InventoryService.approveIssue(issueId, actor, shippingPartnerId)` — nếu type=auto bắt buộc chọn partner → sinh tracking → set order.partner_id + tracking_number → order sang shipping
  - Approve dialog UI có Select ĐVVC + hint format tracking
  
  **Tạo đơn thay khách (admin):**
  - `POST /api/admin/orders` + `AdminOrderCreateService` (validate stock/user, snapshot, status=confirmed)
  - `GET /api/admin/users/search` + `GET /api/addresses/of-user/{userId}` (admin fetch address book của khách)
  - `AdminCreateOrderPage` layout Filament: 
    - Main: 📦 Sản phẩm (ProductCombobox inline) + 📍 Thông tin giao nhận (toggle "Từ sổ address book" ↔ "Nhập thủ công" — hỗ trợ khách chưa có address) + 📝 Ghi chú
    - Aside: 👤 Khách hàng + 💳 Thanh toán (hint theo method) + 🧾 Tổng kết
  - Common `ProductCombobox` — search inline debounce 250ms + dropdown suggestion + click outside đóng (thay hoàn toàn modal picker)
  
  **Filament-style form refactor:**
  - Common `AdminSection` — icon primary + title + description + actions slot
  - `AdminCreateReceiptPage` `/admin/phieu-nhap/moi` (từ dialog → trang riêng) — main SP với ProductCombobox + warning "Vượt giá bán!" real-time; aside NCC + tổng kết + lưu ý
  - `AdminCreateIssuePage` `/admin/phieu-xuat/moi` (từ dialog → trang riêng) — main SP requireStock + lý do; aside tổng kết + lưu ý flow chờ duyệt
  
  **Giá vốn + validate:**
  - V19 migration thêm `products.cost_price` (nullable) + CHECK `cost_price ≤ price`
  - Product form thêm field "Giá vốn cơ sở" + border đỏ khi > giá gốc
  - GoodsReceiptService validate `import_price ≤ product.price` — chặn nhập lô lỗ
  
  **UX improvements:**
  - `ProductListItemDto` + `ProductDetailDto` thêm `availableStock` field → FE user site hiển thị "Còn X sản phẩm" theo availableStock (khớp với reserved)
  - Section headers sidebar admin nổi bật hơn (bold 700, size 12px, letter-spacing rộng, border-b)

- [x] **Sprint 9F — Promotion & Content** (~2 buổi + 1 vòng polish UX)
  - **Banners CRUD** — `AdminBannersPage` với FormDialog (title, image MediaUploader folder=banners, link, sort_order, isActive). List cột: Thứ tự (badge to) / Ảnh / Tiêu đề+link / Trạng thái (badge màu emerald/slate) / Ngày tạo-sửa+tác giả / Thao tác (button outline có text "Sửa"/"Xóa"). Wire hook `useAdminBanners` + create/update/delete.
  - **Vouchers CRUD** — `AdminVouchersPage` với FormDialog lớn (grid 2 col): code (disabled khi edit) + name + type (fixed/percent) + discountAmount (clamp realtime max 100 khi percent) + minOrderValue + maxDiscount (chỉ hiện khi percent) + startedAt/expiresAt (datetime-local có class `[color-scheme:light] dark:[color-scheme:dark]` cho dark mode picker) + usageLimit + isActive. Helper `parseIntSafe(v, max)` strip leading zero + clamp. Preview `≈ {formatPrice()}` khi nhập tiền. Hint dài giải thích nghĩa "Tổng số lượt được dùng". Note vàng cuối form: "Mỗi đơn hàng chỉ được áp 1 voucher". Status badge tự tính: Đang chạy / Chưa mở / Hết hạn / Hết lượt / Ngừng.
  - **Reviews moderation** — `AdminReviewsPage` (không có form tạo). Backend list filter isHidden (server-side) + client-side filter rating/keyword (product name / user / comment). Actions: Reply modal (max 1000 char) + toggle hide/unhide + delete. Cột content hiện adminReply nếu có.
    - **Bonus: 2 entry gửi review từ user site**:
      - `ProductDetailPage` tab reviews có block CTA "Bạn đã dùng sản phẩm này?" + nút "Viết đánh giá" mở `ReviewDialog`. Chưa login → redirect `/dang-nhap`. Chưa mua → backend chặn NOT_PURCHASED → toast tiếng Việt.
      - `OrderDetailPage` item khi order.status=delivered có nút "Viết đánh giá" (outline amber + icon sao vàng đầy, thay vì ghost text nhỏ như trước).
  - **Blog** — 3 trang:
    - `AdminPostCategoriesPage` — dialog CRUD đơn giản (name, slug auto, description). Guardrail xóa khi còn bài viết.
    - `AdminPostsPage` — list với filter keyword/category/isPublished + pagination. Actions: sửa (link tới form page) + xóa. Link "Xem trên trang" (target="_blank") khi published.
    - `AdminPostFormPage` (`/admin/bai-viet/moi` + `/:id/sua`) — 2 cột: main (title, slug, excerpt max 1000, TipTap content) + aside (publish toggle, category select, MediaUploader thumbnail folder=posts, info stats khi edit).
  - Wire vào adminNav + App.tsx routes: `/admin/banner`, `/admin/voucher`, `/admin/danh-gia`, `/admin/bai-viet`, `/admin/danh-muc-bai`, `/admin/bai-viet/moi`, `/admin/bai-viet/:id/sua`.
  - Hooks mới: `useAdminBanners` + CRUD, `useAdminVouchers` + CRUD (mở rộng useVouchers.ts), `useAdminReviews` + toggleHidden/reply/delete (mở rộng useReviews.ts), `useAdminBlog.ts` mới (PostCategory + Post CRUD).
  - **UX checklist rút ra (memory `feedback_admin_form_ux.md`):** validate realtime không chờ submit; action button table dùng `variant="outline" size="sm"` + text label chứ không icon-only; list admin có cột Ngày tạo/sửa; label khó hiểu phải có hint 1-2 dòng; note vàng cho ràng buộc nghiệp vụ ngầm; preview `formatPrice` cho input số tiền; datetime-local trong Dialog phải có class color-scheme.

  - **Polish round 2 (2026-08-25 tối, commit `41e1c53`) — brand cột SP + banner đa slot + cropper:**
    - **Cleanup demo data:** xoá 15 orders `ORD-DEMO/TEST/REV-*` + 5 goods_issues + 3 users `user3/4/5` (script `scripts/cleanup-demo-test.sql` 1 transaction, có preview + sanity check). Giữ user1/user2 demo customer + 4 đơn ngày thật.
    - **AdminBrandsPage** — thêm cột **"Logo"** (header text) + **"Sản phẩm"** (badge count `Package`). Backend `ProductRepository.countGroupByBrandId()` bulk 1 query merge vào `BrandDto.productCount`. Guardrail xoá disable + tooltip khi còn SP. `BrandService.update()` throw `SLUG_LOCKED_HAS_PRODUCTS` khi đổi slug mà brand còn SP (tránh gãy URL). Warn realtime khi tắt isActive brand đang có SP.
    - **Banner đa slot** — V23 `banners.position` (`hero_carousel` | `sidebar_phone` | `sidebar_laptop`) + backfill 3 banner cũ về `hero_carousel` + index. Endpoint `GET /api/banners/slot/{position}` + hook `useBannerBySlot()`. AdminBannersPage: Select vị trí + cột badge màu theo slot. HomePage `useBannerBySlot('sidebar_phone')` + `'sidebar_laptop'` để render banner sidebar từ DB, fallback picsum khi trống.
    - **Image cropper** — cài `react-easy-crop`, tạo `ImageCropperDialog` (kéo/zoom/xoay + canvas → JPEG blob → upload lại). Auto mở sau upload lần đầu + nút "Cắt lại ảnh". Aspect chuẩn 16:9 hero / 1:3 sidebar. `CategorySection` sidebar chuyển sang `aspect-[1/3]` cứng khớp cropper, ảnh fill 100% object-cover không cắt mép, `self-start` để không stretch grid.
    - **V24** `banners.image_fit` VARCHAR(10) NOT NULL DEFAULT 'cover' — cột thêm trong plan ban đầu (cover/contain) nhưng cropper thay thế mục đích, giữ column không rollback.

### Sprint còn lại

- [ ] **Sprint 9G-perm — Phân quyền chi tiết theo mẫu TGDĐ + fix Product page** (~3 buổi) — **làm TRƯỚC Sprint 9G**

  **Bối cảnh:** Hiện tại admin đăng nhập là thấy hết mọi trang, mọi API check bằng `@PreAuthorize("hasRole('ADMIN')")`. Sinh viên tham khảo webthegioididong (Laravel + Spatie Permission) muốn LaptopWorld có phân quyền chi tiết tương đương: một user có nhiều role, mỗi role có nhiều permission, chủ shop tự tạo role mới trên UI. Hạ tầng DB đã có sẵn từ V3 (`roles`, `permissions`, `user_roles`, `role_permissions`) — chưa dùng đúng.

  Sinh viên feedback ngày 2026-08-21 bổ sung:
  - Đã rà 35 quyền TGDĐ vs project — bỏ **5 quyền không có endpoint tương ứng** (view_system_logs, view_activity_logs, view_order_logs, manage_inventory, view_ai_chat_detail), **thêm view_partners** → còn **30 quyền**.
  - Có bug "không vào được trang sửa sản phẩm" — chưa có repro chi tiết, cần debug đầu sprint. Có thể do: (a) `findWithDetailsById` bị `@SQLRestriction deleted_at IS NULL` chặn nếu SP soft-delete; (b) useEffect load detail không trigger form set nếu API fail silent; (c) LazyInit exception khi mapper truy cập specs/images.
  - Muốn thêm **toggle trạng thái kinh doanh (isActive) inline** trên cột list SP — không cần vào trang sửa.

  **Danh sách 30 permission chia 4 nhóm (đã lọc phù hợp LaptopWorld):**

  🔐 **Hệ thống (3):** `access_admin`, `manage_roles`, `view_reports`
  📦 **Sản phẩm & Nội dung (11):** `view_products`, `create_products`, `edit_products`, `delete_products`, `view_categories`, `manage_categories`, `view_brands`, `manage_brands`, `manage_collections`, `manage_banners`, `manage_posts`
  🏭 **Kho & Vận chuyển (5):** `view_inventory`, `view_partners`, `manage_partners`, `manage_goods_receipt`, `manage_goods_issue`
  🛒 **Bán hàng & Khách hàng (11):** `view_orders`, `manage_orders`, `create_orders_manual`, `view_vouchers`, `manage_vouchers`, `view_reviews`, `manage_reviews`, `view_users`, `manage_users`, `assign_user_roles`, `manage_ai_embedding`, `view_ai_chat`

  (Đếm lại: 3 + 11 + 5 + 11 = 30. `manage_ai_embedding` + `view_ai_chat` gộp trong nhóm khách hàng vì đều liên quan tới trợ lý AI cho khách.)

  **3 role seed sẵn:**
  - `ADMIN` — bypass mọi permission check (super-admin)
  - `STAFF` — 11 permission: `access_admin`, `view_products`, `edit_products`, `view_categories`, `view_brands`, `view_orders`, `manage_orders`, `view_reviews`, `manage_reviews`, `view_vouchers`, `view_partners` (mẫu nhân viên bán hàng)
  - `CUSTOMER` — không có permission admin nào

  ### Bước 0 ✅ — Fix bug trang sửa SP + toggle isActive inline (~0.5 buổi)

  **Bug root cause tìm ra:** [AdminProductFormPage.tsx](../laptopworld-web/src/pages/admin/AdminProductFormPage.tsx) dùng hàm `cn()` ở dòng 258 (class name conditional cho input Giá vốn) nhưng KHÔNG import từ `@/lib/utils` → runtime error `cn is not defined` → React error boundary catch → trang trắng khi user bấm Sửa. TypeScript check pass sạch (không strict globals) nên không lộ trước. **Fix:** thêm `import { cn } from '@/lib/utils'` vào file.

  **Bonus fix:** [ProductRepository.java:26](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/catalog/repository/ProductRepository.java) sai package `@jakarta.persistence.Lock` (không tồn tại) → đúng ra là `@org.springframework.data.jpa.repository.Lock`. Bug từ Sprint 9E — backend không compile được, user chưa gặp vì chưa clean build. Đã sửa.

  **Toggle isActive inline đã làm:**
  - Backend: endpoint mới `PATCH /api/admin/products/{id}/active` body `{isActive}` — chỉ update 1 field, không đụng cost_price/specs/images. Guard `hasRole('ADMIN') or hasAuthority('edit_products')`. Service `ProductService.setActive(id, boolean)` mới.
  - Frontend: hook mới `useToggleProductActive` trong useAdminProducts.ts với `qc.invalidateQueries`. AdminProductsPage thêm cột "Kinh doanh" (giữa Rating và Thao tác) chứa `<Switch>` + label "Đang bán / Ngừng bán" — click switch → gọi API → toast xác nhận.
  - Test: bấm switch OFF trên 1 SP → sang user site (`/danh-muc/laptop`) → SP đó biến mất (isActive filter server-side).

  ### Bước 1 ✅ — Backend seed 30 quyền + refactor security + API vai trò (~1 buổi)

  **Đã hoàn thành:**
  - **Migration [V20__expand_permissions.sql](LaptopWorld_project/src/main/resources/db/migration/V20__expand_permissions.sql)**: TRUNCATE `permissions` + `role_permissions` (RESTART IDENTITY CASCADE) → insert 30 permission code + description tiếng Việt → gán ADMIN full 30 permission → gán STAFF 11 permission cơ bản (access_admin, view_products, edit_products, view_categories, view_brands, view_orders, manage_orders, view_reviews, manage_reviews, view_vouchers, view_partners). CUSTOMER không có permission admin nào.
  - **Refactor `@PreAuthorize` trên 17 file controller** — đổi từ `hasRole('ADMIN')` cô đơn → `hasRole('ADMIN') or hasAuthority('permission_code')`. ADMIN luôn bypass, staff chỉ pass khi có permission đúng. Class-level cho 7 file (Dashboard, UserSearch, Ai, GoodsReceipt, Banner, PostCategory, Post); method-level cho 10 file (Product, Brand, Category, Collection, Inventory, Partner, Order, Review, Voucher, Media, Address). Grep verify: 0 `hasRole('ADMIN')` cô đơn còn lại.
  - **MeResponse đã có sẵn `permissions[]`** (từ trước, `AuthService.me()` collect từ user.roles.permissions). Không cần sửa.
  - **API mới:**
    - `GET /api/admin/roles` — list role kèm permissionCount + userCount
    - `GET /api/admin/roles/{id}` — detail role kèm list permission codes
    - `POST /api/admin/roles` — tạo role mới (body: name + description + permissions[])
    - `PUT /api/admin/roles/{id}` — sửa role (ADMIN: chặn đổi tên + im lặng bỏ qua sửa permissions)
    - `DELETE /api/admin/roles/{id}` — xóa (chặn ADMIN 400 `ADMIN_ROLE_LOCKED`; chặn nếu còn user gán 400 `ROLE_IN_USE` kèm số user)
    - `GET /api/admin/roles/permissions` — list 30 permission kèm label + groupName (4 nhóm tiếng Việt — hardcode trong `PermissionMetadata.java`, không cần bảng DB)
    - Tất cả guard `hasRole('ADMIN') or hasAuthority('manage_roles')`
  - **Files mới:**
    - DTOs: [PermissionDto](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/dto/PermissionDto.java), [RoleListItemDto](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/dto/RoleListItemDto.java), [RoleDetailDto](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/dto/RoleDetailDto.java), [RoleRequest](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/dto/RoleRequest.java)
    - Service: [PermissionMetadata](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/service/PermissionMetadata.java) (hardcode 30 permission trong 4 nhóm), [RoleService](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/service/RoleService.java) (CRUD + guardrails ADMIN)
    - Controller: [AdminRoleController](LaptopWorld_project/src/main/java/com/example/LaptopWorld_project/user/controller/AdminRoleController.java)
  - **Repository mở rộng:** RoleRepository thêm `existsByName`, `findWithPermissionsById`, `findAllByOrderByNameAsc`, `countUsersByRoleId`. PermissionRepository thêm `findAllByCodeIn`.
  - **Backend `mvnw compile` pass sạch.**

  **Cần user test trước khi sang Bước 2:**
  - Restart backend → Flyway chạy V20 → check log không lỗi
  - Postman: login admin → gọi `GET /api/admin/roles` → phải trả 3 role (ADMIN 30 perm, STAFF 11 perm, CUSTOMER 0 perm)
  - Login staff (nếu có user STAFF) → gọi `GET /api/admin/products` (endpoint dùng `view_products`) → OK; gọi `POST /api/admin/products` (dùng `create_products`) → phải 403
  - Bấm nút Sửa SP (Bug Bước 0) → phải mở form đầy đủ, không trắng
  - Bấm toggle Switch trong list SP → sang user site verify SP ẩn/hiện đúng

  **Refactor `@PreAuthorize` toàn bộ admin controllers:**
  - Thay `@PreAuthorize("hasRole('ADMIN')")` → `@PreAuthorize("hasAuthority('permission_name')")` từng endpoint. Vd:
    - `GET /admin/products` → `@PreAuthorize("hasAuthority('view_products')")`
    - `POST /admin/products` → `@PreAuthorize("hasAuthority('create_products')")`
    - `PUT /admin/products/{id}` → `@PreAuthorize("hasAuthority('edit_products')")`
    - `DELETE /admin/products/{id}` → `@PreAuthorize("hasAuthority('delete_products')")`
    - `POST /admin/orders/{id}/status` → `@PreAuthorize("hasAuthority('manage_orders')")`
    - vv.
  - ADMIN bypass: viết custom `PermissionEvaluator` bean check `if (user.hasRole('ADMIN')) return true` trước; hoặc dùng SpEL `@PreAuthorize("hasRole('ADMIN') or hasAuthority('view_products')")` từng chỗ (verbose nhưng rõ ràng — chọn cách này để rõ ý).
  - `UserPrincipal.getAuthorities()` đã trả về roles + permissions → không cần đổi

  **Mở rộng `MeResponse` DTO:**
  - Thêm field `permissions: List<String>` — client dùng để filter menu
  - Update `AuthService.buildMeResponse()` collect từ `user.getRoles().stream().flatMap(r -> r.getPermissions())`

  **API mới:**
  - `RoleController` (`/api/admin/roles`, `@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")`):
    - `GET` — list roles, mỗi role kèm `permissionCount` + `userCount`
    - `GET /{id}` — detail (info + array permission names + array user preview 5 người)
    - `POST` — tạo role mới (body: `{name, description, permissionNames: string[]}`)
    - `PUT /{id}` — sửa (chặn đổi name ADMIN, chặn sửa permissions của ADMIN)
    - `DELETE /{id}` — xóa (chặn ADMIN; báo lỗi `ROLE_IN_USE` nếu còn user gán)
  - `PermissionController` (`/api/admin/permissions`, cùng guard):
    - `GET` — list 35 permission với label tiếng Việt + groupName (4 nhóm)

  **DTOs mới:**
  - `RoleListItemDto` (id, name, description, permissionCount, userCount, createdAt)
  - `RoleDetailDto` (id, name, description, permissions[], users[] preview 5)
  - `RoleRequest` (name, description, permissionNames[])
  - `PermissionDto` (name, label, groupName)

  ### Bước 2 ✅ — Frontend ẩn menu + trang Vai trò (~1 buổi)

  **Đã hoàn thành:**
  - **`stores/auth.ts`**: thêm field `permissions?: string[]` vào `AuthUser`; helper `hasPermission(perm)` + `hasAnyPermission(...perms)` với ADMIN bypass (ADMIN role tự động return true không cần check permissions[]).
  - **`adminNav.ts`**: thêm 2 field optional `requiredPermission` / `requiredAnyPermission` cho mỗi nav item; wire toàn bộ menu với permission tương ứng (VD Sản phẩm → `view_products`, Đơn hàng → `view_orders`); thêm menu mới **"Vai trò & Phân quyền"** trong nhóm 🔐 Hệ thống với `requiredPermission: 'manage_roles'`.
  - **`AdminSidebar` + `AdminMobileSidebar`**: helper `canSee(item)` + filter groups → nếu user không có permission → menu tự ẩn; nếu cả nhóm rỗng → ẩn cả nhóm.
  - **`AdminProtectedRoute`**: mở rộng với prop `requiredPermission?`. Gate 2 cấp — cấp 1: phải có role ADMIN hoặc permission `access_admin` để vào layout admin; cấp 2: nếu route có `requiredPermission` phải có thêm quyền đó.
  - **Types + hooks (`hooks/api/useRoles.ts`)**: `useAdminRoles`, `useRoleDetail`, `useAllPermissions` (staleTime 1h cache), `useCreateRole`, `useUpdateRole`, `useDeleteRole`. Types `RoleListItem`, `RoleDetail`, `PermissionMeta` trong types/api.ts.
  - **`AdminRolesPage`** (list): cột Tên vai trò (badge "Hệ thống" cho ADMIN) / Số quyền / Số người đang mang (icon Users) / Ngày tạo / Thao tác (Sửa + Xóa). Nút Xóa disabled cho ADMIN. Xóa role còn user → dialog description hiện warning "⚠️ Đang có N người mang". Note vàng cuối trang giải thích ADMIN protected.
  - **`AdminRoleFormPage`** (create/edit, `/admin/vai-tro/moi` + `/:id/sua`): layout 2 cột giống RoleResource của TGDĐ:
    - **Main:** Section "Thông tin vai trò" (tên + mô tả) + Section "Phân quyền chi tiết" chứa Tabs 4 nhóm. Mỗi tab hiện checkbox list 2 cột với code hiển thị nhỏ dưới label. Tab trigger có badge `{selected}/{total}` cho mỗi nhóm. Có nút "Chọn tất cả trong nhóm" với indeterminate state khi select một phần.
    - **Aside:** Section "📋 Tóm tắt quyền hạn" hiện các permission đã tick dưới dạng badge màu (4 màu theo 4 nhóm: rose/sky/amber/emerald) tự cập nhật realtime, đếm số lượng mỗi nhóm + tổng lớn. Empty state "Chưa có quyền nào được chọn". Section "Thông tin" hiện userCount + ngày tạo + ngày cập nhật khi edit. Note xanh: "Người dùng đang online sẽ giữ quyền cũ đến khi đăng nhập lại".
    - Khi edit role ADMIN: banner amber "⚠️ Vai trò ADMIN được bảo vệ" + tên input disabled + checkboxes disabled + opacity giảm; chỉ mô tả sửa được.
  - **App.tsx routes**: `/admin/vai-tro` → `AdminRolesPage`; `/admin/vai-tro/moi` + `/:id/sua` → `AdminRoleFormPage`.
  - **TS + Vite build pass sạch.**

  **Cần user test trước khi sang Bước 3 (test E2E):**
  - Login admin → vào `/admin/vai-tro` — thấy 3 role, ADMIN có badge "Hệ thống", nút Xóa ADMIN disabled
  - Bấm "Thêm vai trò" → nhập tên "Nhân viên bán hàng" + tick vài quyền → thấy panel "Tóm tắt" bên phải update realtime với badge màu → Save → toast success → quay lại list
  - Bấm Sửa role ADMIN → thấy banner amber, tên disabled, checkboxes disabled
  - Bấm Sửa role STAFF → thấy 11 permission đã tick sẵn (từ V20 seed)
  - Xóa role không có user → OK; xóa STAFF (nếu chưa gán ai) → OK; xóa ADMIN → chặn

  **Auth store mở rộng (`stores/auth.ts`):**
  - `user.permissions: string[]` (đọc từ MeResponse)
  - Helper `hasPermission(name: string)` — true nếu ADMIN role hoặc permission có trong list
  - `hasAnyPermission(...names: string[])`

  **adminNav.ts:**
  - Mỗi `AdminNavItem` thêm `requiredPermission?: string`
  - Wire: Sản phẩm → `view_products`, Danh mục → `view_categories`, Đơn hàng → `view_orders`, Voucher → `view_vouchers`, Phiếu nhập → `manage_goods_receipt`, Phiếu xuất → `manage_goods_issue`, Tồn kho → `view_inventory`, Đối tác → `view_partners`, Bài viết → `manage_posts`, Danh mục bài → `manage_posts`, Banner → `manage_banners`, Đánh giá → `view_reviews`, Embedding → `manage_ai_embedding`, Chat sessions → `view_ai_chat`, Người dùng → `view_users`, Vai trò → `manage_roles`
  - `AdminSidebar` filter items theo `hasPermission(item.requiredPermission)`; nếu group không còn item nào → ẩn cả group

  **`AdminProtectedRoute` mở rộng:**
  - Thêm prop `requiredPermission?: string` → check trước khi render, không có → hiện `ForbiddenPage`

  **`AdminRolesPage` mới (`/admin/vai-tro`):**
  - List cột: Tên vai trò (bold) / Số quyền (badge primary) / Số người dùng (badge gray) / Ngày tạo / Thao tác
  - Nút "Tạo vai trò mới" → mở `AdminRoleFormPage` trang riêng (không dialog vì form to)
  - Actions: Sửa (link), Xóa (ConfirmDialog, chặn nếu name=ADMIN hoặc `userCount > 0` → toast "N khách đang mang vai trò này, gỡ bớt trước")

  **`AdminRoleFormPage` mới (`/admin/vai-tro/moi` + `/:id/sua`):**
  - Layout 2 cột giống RoleResource của TGDĐ:
    - **Main (col 2/3):**
      - Section "Thông tin vai trò": input Tên (disabled khi edit ADMIN) + input Mô tả
      - Section "Phân quyền chi tiết": component `PermissionTabs` — 4 tab (theo groupName), mỗi tab là `CheckboxList` các permission trong nhóm với label tiếng Việt (có emoji đầu label như TGDĐ)
    - **Aside (col 1/3):**
      - Section "📋 Tóm tắt quyền hạn": component `PermissionSummary` — hiện các permission đã tick dưới dạng badge màu (4 màu theo 4 nhóm: xanh dương / vàng / xanh lá / đỏ), đếm số lượng mỗi nhóm + tổng. Empty state "Chưa có quyền nào được chọn". Real-time update qua React state.
      - Section "Thông tin bản ghi" (khi edit): ngày tạo + số user đang mang
  - Save → `POST` hoặc `PUT` với `permissionNames: string[]` từ tổng hợp 4 tab

  **Hooks mới (`hooks/api/useRoles.ts`):**
  - `useAdminRoles`, `useRoleDetail`, `useCreateRole`, `useUpdateRole`, `useDeleteRole`, `useAllPermissions`

  **App.tsx routes:**
  - `/admin/vai-tro` → `AdminRolesPage` (guard `manage_roles`)
  - `/admin/vai-tro/moi` + `/admin/vai-tro/:id/sua` → `AdminRoleFormPage`

  ### Bước 3 — **Gộp vào Sprint 9G Bước E** (không làm riêng)

  Chốt cách B ngày 2026-08-21 sau feedback sinh viên: cần trang Users để gán/gỡ role đúng nghĩa
  (không dùng SQL trực tiếp). Vậy test E2E phân quyền sẽ chạy chung với test Sprint 9G để tận
  dụng UI thật. Xem chi tiết trong **Sprint 9G — Bước E**.

  ### Rủi ro & lưu ý

  - **Refactor `@PreAuthorize` toàn bộ** dễ gãy các trang admin đang chạy → sau mỗi controller refactor phải chạy Postman test lại. Nên làm theo module, không đại trà.
  - **Cache `UserPrincipal`** trong session — nếu admin sửa role của user đang online, permission cũ vẫn còn trong access token cho tới khi token expire. Chấp nhận trade-off — user login lại sẽ có permission mới. Ghi note trong help text form.
  - **Migration V20** không xóa dữ liệu quan trọng — chỉ delete + reinsert vào `permissions` + `role_permissions`. `user_roles` giữ nguyên (ADMIN vẫn là ADMIN sau migration).
  - **Endpoint public** (`/api/catalog/*`, `/api/auth/*`, `/api/banners`, `/api/blog/*`) KHÔNG đụng — chỉ đổi `@PreAuthorize` của `/api/admin/*`.

  ### Deliverable

  Chủ shop có thể tự tạo N vai trò tùy ý, mỗi vai trò tick 1 nhóm quyền tùy chọn. Nhân viên chỉ thấy các menu + gọi được các API tương ứng. Xóa/sửa ADMIN bị chặn. Tất cả check ở cả BE (secure) và FE (UX).

- [ ] **Sprint 9G — Users + AI ops + Polish + Test E2E gộp** (~2.5 buổi)

  **Bối cảnh:** Sau khi Sprint 9G-perm xong 3/4 bước (fix bug SP + backend perm + FE role UI), Bước 3 test E2E cần trang Users để gán role cho user1. Thay vì test bằng SQL trực tiếp (thiếu UI thực tế cho demo bảo vệ đồ án), gộp Bước 3 test vào cuối Sprint 9G để test 1 lần cho cả 2 sprint. Sprint 9G có 5 bước A–E.

  ### Bước A ✅ — Backend Users management (~0.5 buổi)

  **Đã hoàn thành:**
  - **4 endpoint mới `/api/admin/users`** (cùng base với `AdminUserSearchController` đã có `/search` — Spring OK khi full path khác nhau):
    - `GET` — list paginated + filter `keyword` (username/email/fullName) + `status` (active/banned/unverified) + `roleId`. Guard `hasRole('ADMIN') or hasAuthority('view_users')`. Sort default `createdAt DESC`, size 20.
    - `GET /{id}` — detail user kèm `stats {orderCount, reviewCount, totalSpent}`. `totalSpent` = SUM(`orders.total`) WHERE status=`delivered` (field entity là `total`, KHÔNG phải `total_amount` — bug đã fix khi restart BE lần đầu). Guard `view_users`.
    - `POST /{id}/status` body `{status}` — set active/banned/unverified. Guard `manage_users`.
    - `POST /{id}/roles` body `{roleIds: number[]}` — replace toàn bộ roles (cho phép list rỗng = gỡ hết). Guard `assign_user_roles`.
  - **Guardrails đầy đủ (chốt cách A ngày 2026-08-24 — bảo vệ ADMIN cuối cùng cả 2 hướng):**
    - `CANNOT_BAN_SELF` — admin không được tự ban mình
    - `CANNOT_REMOVE_OWN_ADMIN` — admin không được tự gỡ role ADMIN của mình
    - `LAST_ADMIN_LOCKED` — chặn ban HOẶC gỡ role ADMIN của ADMIN active cuối cùng (dùng chung helper `RoleRepository.countActiveUsersHavingRoleName('ADMIN')`)
    - `ROLE_NOT_FOUND` — set-roles có id role không tồn tại, message list các id thiếu
    - `INVALID_STATUS` + Pattern validation trên DTO (regex `^(active|banned|unverified)$`)
    - `RESOURCE_NOT_FOUND` (404) khi user id không tồn tại
  - **Files mới:**
    - DTOs: [AdminUserListItemDto](../src/main/java/com/example/LaptopWorld_project/user/dto/AdminUserListItemDto.java), [AdminUserDetailDto](../src/main/java/com/example/LaptopWorld_project/user/dto/AdminUserDetailDto.java) (nested `RoleRef` + `Stats`), [SetUserStatusRequest](../src/main/java/com/example/LaptopWorld_project/user/dto/SetUserStatusRequest.java), [SetUserRolesRequest](../src/main/java/com/example/LaptopWorld_project/user/dto/SetUserRolesRequest.java)
    - Service: [AdminUserService](../src/main/java/com/example/LaptopWorld_project/user/service/AdminUserService.java) — list dùng `Specification<User>` với filter động
    - Controller: [AdminUserController](../src/main/java/com/example/LaptopWorld_project/user/controller/AdminUserController.java)
  - **Repository mở rộng:**
    - `UserRepository` extend `JpaSpecificationExecutor<User>`
    - `OrderRepository.countByUserId(Long)` + `sumDeliveredTotalByUserId(Long)` (COALESCE về 0)
    - `ReviewRepository.countByUserId(Long)`
    - `RoleRepository.countActiveUsersHavingRoleName(String)` — chỉ đếm user status=active
  - **Backend `mvnw compile` pass sạch (exit 0).**

  **Đã test end-to-end 11/11 kịch bản pass** (Postman + integration test 2026-08-24): list/filter/detail/stats + 5 guardrails + happy path setStatus/setRoles 2 chiều + SANITY (staff có view_users → 200, không có delete_products → 403) + LAST_ADMIN_LOCKED 3 hướng.

  **Bug tồn đọng Sprint 9G-perm phát hiện + fix cùng lúc:**
  - [SecurityConfig.java:110](../src/main/java/com/example/LaptopWorld_project/config/SecurityConfig.java) từng hard-code `.requestMatchers("/api/admin/**").hasRole("ADMIN")` — filter cấp cao chặn TRƯỚC `@PreAuthorize`, làm toàn bộ refactor `hasAuthority('code')` ở 17 controller (Sprint 9G-perm Bước 1) **vô hiệu hoàn toàn** — staff/user có perm vẫn 403.
  - Fix: đổi thành `.authenticated()`, để `@PreAuthorize` (ADMIN bypass + `hasAuthority`) xử lý phân quyền chi tiết.
  - Đã lưu memory `project_security_config_gotcha.md` cảnh báo tương lai không đè lại.

  ### Bước B ✅ — Frontend Users (chia 3 mini-step, 2026-08-24)

  #### Bước B1 ✅ — Refactor cột + KPI cards + endpoint stats

  **Backend:**
  - `GET /api/admin/users/stats` → `{total, active, banned, unverified, newThisWeek}`. Tuần bắt đầu **thứ Hai theo múi giờ VN** (`Asia/Ho_Chi_Minh`). Guard `view_users`.
  - Repository: `countByStatus(UserStatus)`, `countByCreatedAtGreaterThanEqual(OffsetDateTime)`.
  - DTO mới: [AdminUserStatsDto](../src/main/java/com/example/LaptopWorld_project/user/dto/AdminUserStatsDto.java).

  **Frontend:**
  - `useAdminUserStats()` hook (staleTime 60s).
  - **4 KPI cards** đầu trang: Tổng người dùng / Đang hoạt động (emerald) / Đã khóa (rose, hint số chưa xác thực) / Mới tuần này (info).
  - **Refactor 8 cột list:** Tên đăng nhập (avatar + username + ✓ verified) / Họ tên / Email / Số điện thoại / Vai trò / Trạng thái / Ngày tạo / Thao tác.

  #### Bước B2 ✅ — Trang chi tiết user với 4 tabs

  **Backend (3 endpoint mới, guard `view_users`):**
  - `GET /api/admin/users/{id}/orders?page&size` — reuse `OrderMapper.toListItem` cho format đồng nhất với AdminOrdersPage.
  - `GET /api/admin/users/{id}/reviews` — kèm product.
  - `GET /api/admin/users/{id}/vouchers` — cả đã dùng + chưa.
  - Sổ địa chỉ reuse `GET /api/addresses/of-user/{id}` (đã có từ Sprint 9E).
  - DTO mới: [AdminUserVoucherDto](../src/main/java/com/example/LaptopWorld_project/user/dto/AdminUserVoucherDto.java).
  - Repository: `ReviewRepository.findByUserIdOrderByCreatedAtDesc` + `UserVoucherRepository.findByUserIdOrderByCreatedAtDesc`.
  - Guardrail `ensureUserExists(id)` → 404 nếu user không tồn tại.

  **Frontend:**
  - 4 hook mới: `useAdminUserOrders`, `useAdminUserReviews`, `useAdminUserVouchers`, `useAdminUserAddresses`.
  - Type mới `AdminUserVoucherItem`.
  - **[AdminUserDetailPage.tsx](../../laptopworld-web/src/pages/admin/AdminUserDetailPage.tsx)** — trang riêng (không phải dialog): info card + 3 stats + **4 tabs**: Lịch sử mua hàng (pagination + link sang `/admin/don-hang/:id`) / Sổ địa chỉ (badge Mặc định) / Đánh giá (★ + phản hồi admin) / Kho voucher (trạng thái Đã dùng+link đơn / Còn dùng / Hết hạn).
  - Route mới `/admin/nguoi-dung/:id`.
  - **Xóa `AdminUserDetailDialog.tsx`** — thay bằng trang riêng.

  #### Bước B3 ✅ — Trang tạo + chỉnh sửa user

  **Chốt design:**
  - Password ban đầu do admin nhập (đơn giản, giống e-commerce admin thông thường). Note "Đưa mật khẩu cho user, họ nên đổi lại sau login lần đầu". Admin **không** đổi password của user sau đó — khách tự forgot password nếu quên.
  - **Không cho đổi email** trong Edit — email là identity, cần re-verify → phức tạp, để read-only.
  - **Gộp nút Khóa + Vai trò vào trang Chỉnh sửa** — list actions chỉ còn Chi tiết + Chỉnh sửa.

  **Backend (2 endpoint mới, guard `manage_users`):**
  - `POST /api/admin/users` — admin nhập password. Auto set `emailVerifiedAt = now`. Guardrails: `USERNAME_TAKEN`, `EMAIL_TAKEN`, `ROLE_NOT_FOUND`.
  - `PUT /api/admin/users/{id}` — chỉ update `fullName / phone / gender / birthday`. Không đổi username/email/password/status/roles (mỗi thứ có endpoint riêng).
  - DTOs mới: [CreateUserRequest](../src/main/java/com/example/LaptopWorld_project/user/dto/CreateUserRequest.java), [UpdateUserRequest](../src/main/java/com/example/LaptopWorld_project/user/dto/UpdateUserRequest.java).

  **Frontend:**
  - Hook mới: `useCreateAdminUser`, `useUpdateAdminUser`.
  - **[AdminUserFormPage.tsx](../../laptopworld-web/src/pages/admin/AdminUserFormPage.tsx)** — trang chung create/edit layout 2 cột:
    - **Main:** Section "Thông tin cơ bản" (create: 3 field bắt buộc username/email/password + nút Hiện/Ẩn; edit: username+email read-only muted card). Rồi 4 field profile (họ tên/phone/gender select/birthday date). Section "Phân vai trò" — checkbox list role (ẩn CUSTOMER).
    - **Aside:** Section "Trạng thái tài khoản" (Select 3 option + hint + cảnh báo tự khóa). Section "Thông tin" ID/tạo/cập nhật. Note xanh không đổi mật khẩu.
    - **Save khi edit:** gọi 3 API tuần tự nếu có đổi — `update` (profile) → `setStatus` (nếu đổi) → `setRoles` (union CUSTOMER để giữ).
    - **Save khi create:** 1 request duy nhất gồm cả status + roleIds.
  - Route mới: `/admin/nguoi-dung/moi` + `/admin/nguoi-dung/:id/sua`.
  - AdminUsersPage: **bỏ nút Khóa + Vai trò**, giữ Chi tiết + Chỉnh sửa; enable nút "Thêm người dùng" link `/moi`.
  - AdminUserDetailPage: **bỏ nút Khóa + Vai trò**, chỉ giữ nút Chỉnh sửa.
  - **Xóa `AssignRolesDialog.tsx`** — không còn dùng (đã gộp vào Edit form).

  **Bug UX fix song song B1/B2 (2026-08-24):**
  - Ẩn CUSTOMER khỏi dialog gán role (không có perm admin) — giữ trong roleIds khi save.
  - STAFF vào Dashboard rỗng → `AdminDashboardPage` check `hasPermission('view_reports')`, nếu không có → empty state với gợi ý menu user có quyền, không gọi API dashboard.
  - 3 bug auth UX cùng session: (1) email reset password link 404 do `PasswordResetService` sinh `/reset-password?token=` không khớp FE route `/reset-mat-khau/:token`; (2) email verify link 404 tương tự; (3) LoginPage báo "chưa xác thực email" nhưng không có action. Fix: sửa 2 dòng backend + LoginPage detect `EMAIL_NOT_VERIFIED` → hiện block vàng có input email + nút "Gửi lại email xác thực".

  **Workflow thay đổi từ Bước B** (chốt 2026-08-24 với sinh viên): bỏ git worktree Claude, làm trực tiếp trên `D:\FINALYEAR\GRADUATION\LaptopWorld_project\LaptopWorld_project\` (main tree) — tránh phải copy code 2 lần và rủi ro out-of-sync giữa 2 tree khi backend chạy từ main.

  ### Bước C ✅ — Frontend AI Embedding page (~0.3 buổi)

  **Đã hoàn thành (2026-08-24):**
  - Hook mới `useEmbeddingStats()` (`staleTime: 30s`) trong [useAdminProducts.ts](../../laptopworld-web/src/hooks/api/useAdminProducts.ts) — gọi `GET /admin/ai/embedding-stats` trả `{activeProducts, embedded, pending}`. Refactor 2 hook `useReembedProduct` + `useReembedAll` sẵn có: thêm `qc.invalidateQueries(['admin', 'ai', 'embedding-stats'])` trong `onSuccess` để KPI tự cập nhật sau mutate.
  - Type `EmbeddingStats` export cùng file.
  - **[AdminAiEmbeddingPage.tsx](../../laptopworld-web/src/pages/admin/AdminAiEmbeddingPage.tsx)** — layout dọc:
    - **Header:** icon Sparkles + title "AI Embedding" + badge "Sprint 9G · Bước C" + 2 nút action bên phải.
    - **2 nút action:** "Embed sản phẩm mới" (Play icon, force=false) + "Re-embed toàn bộ" (RefreshCw, force=true) — nút thứ hai bọc `ConfirmDialog` với description cảnh báo tốn quota Gemini + `destructive={false}`.
    - **3 KPI cards** (thay vì 4 như plan gốc — backend không có `stale`): Sản phẩm đang bán (icon Database) / Đã embed (CheckCircle2, color success, hint bao phủ N%) / Chưa embed (CircleAlert, color warning nếu >0 else success).
    - **Note sky info:** giải thích cách hoạt động (nhồi text → Gemini embedding-001 → pgvector 768 chiều → semantic search + Agent tool `search_products` dùng chung) + skip check qua `source_hash` SHA-256.
    - **Table "Sản phẩm mới nhất":** 5 cột (ID mono / Tên [link sang trang sửa SP] / Danh mục / Thương hiệu / Thao tác) — nút "Re-embed" từng SP với state `busyId` disable trong lúc chạy. Toolbar chứa badge "Top 20 mới nhất" + link "Xem toàn bộ →" sang `/admin/san-pham`.
    - **Sonner `toast.promise`** cho cả 3 action (loading → success/error với message tiếng Việt kèm `embedded/skipped/failed/durationMs`).
  - **Wire route** `/admin/ai/embedding` trong [App.tsx](../../laptopworld-web/src/App.tsx) — thay `AdminPlaceholderPage` bằng `AdminAiEmbeddingPage`.
  - **Guard**: theo pattern chung — layout `AdminProtectedRoute` cấp 1 (`access_admin` hoặc ADMIN); backend `AdminAiController` đã có `@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_ai_embedding')")` → user không perm gọi API sẽ 403 và toast lỗi; sidebar filter menu theo `manage_ai_embedding` (đã cấu hình sẵn trong [adminNav.ts:92](../../laptopworld-web/src/components/admin/adminNav.ts)).
  - **TypeScript check pass sạch** (`npx tsc --noEmit` exit 0).

  **Cần user test:**
  - Login admin → vào `/admin/ai/embedding` — thấy 3 KPI đúng số + table 20 SP.
  - Bấm "Embed sản phẩm mới" — toast loading → success với thống kê. KPI "Đã embed" tăng.
  - Bấm 1 nút "Re-embed" trên SP — toast hiện `productName + dimensions + durationMs`.
  - Bấm "Re-embed toàn bộ" → ConfirmDialog cảnh báo → chấp nhận → toast loading vài giây → success.
  - Login STAFF không có `manage_ai_embedding` → sidebar KHÔNG thấy menu "Embedding".

  ### Bước D ✅ — Frontend AI Chat Sessions page (~0.5 buổi)

  **Đã hoàn thành (2026-08-24):**

  **Backend:**
  - Extend [ChatSessionRepository](../src/main/java/com/example/LaptopWorld_project/ai/repository/ChatSessionRepository.java) với `JpaSpecificationExecutor<ChatSession>`.
  - Thêm vào [ChatMessageRepository](../src/main/java/com/example/LaptopWorld_project/ai/repository/ChatMessageRepository.java) query batch `countBySessionIds(ids)` trả về projection interface `SessionMessageCount{sid, cnt}` — tránh N+1 khi list session cùng messageCount.
  - DTOs mới:
    - [AdminChatSessionListItemDto](../src/main/java/com/example/LaptopWorld_project/ai/dto/AdminChatSessionListItemDto.java) — id, title, userId?, username?, isGuest, messageCount, lastActivityAt, createdAt
    - [AdminChatMessageDto](../src/main/java/com/example/LaptopWorld_project/ai/dto/AdminChatMessageDto.java) — id, role, content, toolName, tokensInput/Output, responseTimeMs, createdAt (thêm tokens+time so với `ChatMessageDto` gốc để giám sát hiệu năng)
    - [AdminChatSessionDetailDto](../src/main/java/com/example/LaptopWorld_project/ai/dto/AdminChatSessionDetailDto.java) — info session + userEmail + messages[]
  - Service [AdminChatSessionService](../src/main/java/com/example/LaptopWorld_project/ai/service/AdminChatSessionService.java) — `list(loggedIn, dateFrom, dateTo, pageable)` với Specification động (isNull/isNotNull `user` cho guest/logged) + `detail(id)` throw `ResourceNotFoundException` nếu không tồn tại.
  - Controller [AdminChatSessionController](../src/main/java/com/example/LaptopWorld_project/ai/controller/AdminChatSessionController.java) 2 endpoint (`GET` list + `GET /{id}`) — `@PageableDefault(sort = "lastActivityAt", direction = DESC)`; `@DateTimeFormat(iso = ISO.DATE_TIME)` cho dateFrom/dateTo. Guard `hasRole('ADMIN') or hasAuthority('manage_ai_embedding')` — dùng chung permission với embed (V20 seed chỉ có 1 permission gộp cả embed + xem chat, không có `view_ai_chat` riêng như plan gốc đề xuất).
  - Backend `./mvnw compile` pass sạch.

  **Frontend:**
  - Hook mới [useAdminChatSessions.ts](../../laptopworld-web/src/hooks/api/useAdminChatSessions.ts) — 2 hook `useAdminChatSessions(filter)` + `useAdminChatSessionDetail(id)`. Types export: `AdminChatSessionListItem`, `AdminChatMessage`, `AdminChatSessionDetail`, `AdminChatSessionFilter`.
  - Extend `ChatRole` trong [useChat.ts](../../laptopworld-web/src/hooks/api/useChat.ts) thêm `'tool'` (khớp backend enum 4 giá trị).
  - **[AdminAiChatSessionsPage.tsx](../../laptopworld-web/src/pages/admin/AdminAiChatSessionsPage.tsx)** — list layout dọc:
    - Header với description động (số session khớp filter).
    - **Filter card:** Select "Người dùng" (Tất cả / Đã đăng nhập / Khách vãng lai) + 2 Input date "Từ ngày / Đến ngày" (có `[color-scheme:light] dark:[color-scheme:dark]` cho picker dark mode) + hint giải thích lọc theo ngày tạo session múi giờ VN.
    - **Table 7 cột:** ID mono / Người dùng (Badge outline "Khách vãng lai" + icon UserX2 nếu guest, else `<UserRound>` + username) / Tiêu đề (italic nếu không có) / Số tin nhắn (Badge mono center) / Hoạt động cuối / Bắt đầu / Thao tác (nút "Xem").
    - Pagination trước/sau khi >1 trang.
    - Note sky giải thích chat log gồm guest + 5 tool Gemini (search_products, compare_products, recommend_by_budget, get_product_detail, get_my_orders) + tokens/time giúp theo dõi hiệu năng.
  - **[ChatSessionDetailDialog.tsx](../../laptopworld-web/src/pages/admin/ChatSessionDetailDialog.tsx)** — Dialog max-w-3xl, max-h-[85vh]:
    - Header: badge "Khách vãng lai" hoặc username+email + createdAt + lastActivityAt + số tin nhắn.
    - Body: scroll bg-muted/30, bubble message theo role:
      - `user`: right, primary background, avatar `User` icon phải
      - `assistant`: left, background border-only, avatar `Bot` primary
      - `system`: left, italic muted, avatar `Bot` slate
      - `tool`: left, amber background + font-mono + label "tool: {toolName}" uppercase, avatar `Wrench` amber
    - Mỗi bubble footer nhỏ: `formatChatTime` + `responseTimeMs` + `tokensInput↑/Output↓ tok` (chỉ hiện field không null).
    - Empty state khi 0 message; Skeleton khi loading.
  - **Wire route** `/admin/ai/chat` trong [App.tsx](../../laptopworld-web/src/App.tsx) — thay `AdminPlaceholderPage` bằng `AdminAiChatSessionsPage` (sidebar đã có mục "Chat sessions" với `requiredPermission: 'manage_ai_embedding'` từ Sprint 9G-perm Bước 2).
  - **TypeScript check pass sạch** (`npx tsc --noEmit` exit 0).

  **Cần user test:**
  - Restart backend → login admin → vào `/admin/ai/chat` — thấy list session gồm guest + logged (nếu có data cũ từ ChatWidget test).
  - Filter "Đã đăng nhập" → chỉ thấy session có username; filter "Khách vãng lai" → chỉ session guest.
  - Filter date range → chỉ session tạo trong khoảng.
  - Bấm "Xem" 1 session có nhiều tin nhắn → Dialog mở, hiển thị bubble user (bên phải primary) + assistant (bên trái border) + tool call (amber font-mono) nếu Agent gọi tools.
  - Login STAFF không có `manage_ai_embedding` → sidebar KHÔNG thấy menu "Chat sessions"; gọi API trực tiếp qua Postman → 403.
  - Nếu chưa có chat data, mở ChatWidget ở user site (bottom-right home page) chat vài câu → refresh admin → thấy session mới.

  ### Bước E — Polish ✅ + Test E2E cuối (user tự chạy)

  **Polish đã hoàn thành (2026-08-24):**
  - Hook mới [useCopyToClipboard.ts](../../laptopworld-web/src/hooks/useCopyToClipboard.ts) — `copy(text, successMessage?)` + state `copied` tự reset sau 1.5s. Ưu tiên `navigator.clipboard.writeText`, fallback textarea + `execCommand('copy')` cho môi trường không HTTPS. Toast tiếng Việt success/error.
  - Component mới [AdminEmptyState.tsx](../../laptopworld-web/src/components/admin/common/AdminEmptyState.tsx) — icon Lucide (mặc định `Inbox`) trong tròn muted + title + description + action button optional. Prop `compact` cho padding gọn khi nhúng vào Card nhỏ. Tách khỏi inline empty rải rác — sẵn sàng dùng cho các trang tương lai; các trang cũ vẫn giữ empty inline của `AdminTable` để giảm churn.
  - Wire nút copy vào 4 chỗ:
    - **AdminOrdersPage** cột "Mã đơn": Button ghost icon-only 6×6 opacity-60 hover-100 bên cạnh link mã, `e.stopPropagation()` để không trigger navigate.
    - **AdminOrderDetailPage** header (refactor `copyCode` cũ dùng hook chung, bỏ `toast` + `navigator.clipboard` inline) + **mã vận đơn** (thay `InfoRow` bằng custom div để inject nút copy 5×5 opacity-60 hover-100, chỉ hiện khi `order.trackingNumber` có).
    - **AdminVouchersPage** cột "Mã": nút copy 5×5 opacity-60 hover-100 cạnh Badge mono. Cột mở rộng width `w-40` → `w-44` để chứa nút.
    - **AdminUsersPage** cột "Email": nút copy 5×5 opacity-40 (nhẹ hơn vì email ít cần copy hơn) hover-100 cạnh text email, `e.stopPropagation()`.
  - **TypeScript check pass sạch** (`npx tsc --noEmit` exit 0).

  **Test E2E gộp — cover cả Sprint 9G-perm + 9G:**

  Kịch bản 1 — Phân quyền cơ bản (10 test case):
  1. Login ADMIN → sidebar hiện đầy đủ 7 group (📊 📦 🛒 🏭 📝 🤖 🔐)
  2. Vào `/admin/vai-tro` → thấy 3 role seed đúng counts
  3. Tạo role mới "Nhân viên bán hàng" tick 3 quyền: `access_admin`, `view_orders`, `manage_orders` → Save
  4. Vào `/admin/nguoi-dung` → tìm user1 → bấm "Đổi vai trò" → bỏ CUSTOMER, chọn "Nhân viên bán hàng" → Save
  5. Logout ADMIN, login user1 → sidebar chỉ hiện 2 group: 📊 Dashboard (vì view_reports không có → tự ẩn — cần fix bước này bằng cách thêm view_reports vào STAFF nếu Dashboard là quyền cơ bản, HOẶC tick view_reports khi tạo role Nhân viên bán hàng), 🛒 Đơn hàng
  6. user1 mở `/admin/don-hang` → hoạt động bình thường, thấy list đơn
  7. user1 mở đơn cụ thể → chuyển status → OK vì có `manage_orders`
  8. user1 paste URL `/admin/san-pham` → hiện `ForbiddenPage`
  9. Postman với token user1: `GET /api/admin/products` → 403 với message tiếng Việt
  10. Postman: `GET /api/admin/orders` → 200 OK, `POST /api/admin/products` (dù chưa mở page) → 403

  Kịch bản 2 — Users management (5 test case):
  1. ADMIN xem detail user1 → hiển thị đúng số đơn + review + tổng chi tiêu
  2. Ban user1 → user1 login → hiện thông báo tài khoản bị khóa (existing logic từ Sprint 2)
  3. Mở lại user1 → login OK
  4. Thử ban chính admin → chặn 400 `CANNOT_BAN_SELF`
  5. Thử gỡ toàn bộ role admin của chính mình → chặn 400 `CANNOT_REMOVE_OWN_ADMIN`

  Kịch bản 3 — AI ops (3 test case):
  1. Trang Embedding: bấm "Embed các sản phẩm mới" → toast + thấy stats update
  2. Trang Chat sessions: filter Guest → chỉ hiện session không có user
  3. Mở detail 1 session bất kỳ → thấy full messages bubble user/assistant

  Kịch bản 4 — ADMIN guardrails (3 test case):
  1. Xóa role ADMIN → chặn 400
  2. Đổi tên ADMIN → chặn 400
  3. Bỏ tick permission trong form Sửa ADMIN → checkbox disabled, backend im lặng bỏ qua

  ### Không làm (out of scope theo chốt sinh viên)
  - Xóa user vĩnh viễn (FK vào orders/reviews không cho phép)
  - Admin sửa profile khách (privacy)
  - Admin reset password thay khách (khách tự forgot)
  - ⌘K command palette (defer sang polish riêng sau)
  - Audit log ai gán/gỡ role (over-scope, Phase 11 làm chung với activity_log)

  ### Deliverable Sprint 9G

  Admin có thể: quản lý toàn bộ khách hàng (khóa/mở/gán role), giám sát pipeline AI (embed + chat), test đầy đủ phân quyền end-to-end trên UI thật. Hết Sprint 9G → Phase 9 xong 8/9 sprint, chỉ còn Sprint 9H (test tổng + docs + Postman).

- [x] **Sprint 9H ✅ — Test end-to-end + docs** (~1 buổi, chia 3 mini-step)

  **Đã hoàn thành (2026-08-24):**

  ### Bước H1 ✅ — Postman folder cho Sprint 9B-9F
  Cập nhật [LaptopWorld.postman_collection.json](LaptopWorld.postman_collection.json):
  - Thêm 12 collection variable mới: `partnerId`, `receiptId`, `issueId`, `voucherId`, `bannerId`, `reviewId`, `postCategoryId`, `postId`, `roleId`, `userId`, `productId`, `chatSessionId`.
  - Thêm 5 endpoint bổ sung vào folder 10 (Order): `status-counts`, admin create order, search users, get address of user (đã có 1 số phần trước).
  - Thêm 8 folder mới (11-18) tổng ~53 endpoint:
    - **11. Admin Dashboard** (11): pending-counts + 10 widget stats (kpi, revenue-timeseries, stock-movement, sales-by-category, top-products, dead-stock, low-rated, latest-orders, chatbot-stats, chatbot-top-questions)
    - **12. Admin Product mở rộng** (4): list deleted, PATCH active, restore, filter stockStatus
    - **13. Admin Partners** (6): CRUD 2 loại supplier/shipping_provider
    - **14. Admin Goods Receipts** (3): list/detail/create
    - **15. Admin Inventory + Goods Issues** (8): batches, list-with-type-filter, counts, approve (kèm shippingPartnerId), reject, create manual
    - **16. Admin Banners** (6): 5 CRUD + public
    - **17. Admin Reviews Moderation** (4): list/hide/reply/delete
    - **18. Admin Blog** (11): PostCategories 4 + Posts 5 + 2 public

  ### Bước H2 ✅ — Postman folder cho Sprint 9G-perm + 9G
  Thêm 3 folder (19-21) tổng 23 endpoint:
  - **19. Admin Roles & Permissions** (6): list + detail + list 30 permissions + create + update + delete (kèm ví dụ body cho SALE role)
  - **20. Admin Users** (10): list/stats/detail/orders/reviews/vouchers/create/update/setStatus/setRoles (kèm ví dụ cho từng guard case CANNOT_BAN_SELF, CANNOT_REMOVE_OWN_ADMIN, LAST_ADMIN_LOCKED)
  - **21. Admin AI Ops** (7): embedding-stats + embed all/one + re-embed one + chat-sessions list (2 filter khác nhau) + detail

  **Tổng Postman collection**: **21 folder / 151 endpoint** (từ 10/58 gốc → +11 folder, +93 endpoint). Verify Python `json.load` OK.

  ### Bước H3 ✅ — README rewrite + đóng Sprint 9H
  Rewrite toàn bộ [README.md](../README.md) từ ~3.6KB Phase 0 gốc → ~7KB đầy đủ 11 section:
  - Progress hiện tại (8/9 sprint Phase 9)
  - Yêu cầu hệ thống (Java 21, Docker, Node 20+)
  - Chạy backend (docker compose + application-local.properties + mvnw run)
  - Chạy frontend (npm dev, user site + admin cùng project)
  - **Tài khoản test** (bảng admin/user1/user2)
  - **Luồng demo phân quyền chi tiết** (6 bước cho hội đồng bảo vệ đồ án — tạo role SALE, gán user1, verify UI + Postman)
  - Điểm nhấn AI (RAG + Agent 5 tools + Admin giám sát)
  - Postman reference
  - Cấu trúc project cập nhật cả BE + FE
  - Migration V1-V20 + cách reset DB
  - Lệnh hữu ích
  - Fix technical quan trọng tích lũy

  **Test end-to-end tổng hợp:** user đã pass 21 test case ở Sprint 9G Bước E (4 kịch bản), verify toàn bộ Sprint 9G-perm + 9G trên UI thật. Sprint 9H không cần chạy lại test — chỉ cập nhật docs + Postman.

**Deliverable cuối Sprint 9H:** Postman + README đủ hướng dẫn cho hội đồng bảo vệ + demo phân quyền + AI pipeline. Phase 9 chính thức đóng 9/9 sprint. Sẵn sàng sang **Phase 10 — VNPay sandbox**.

---

## Phase 10 — Payment integration (VNPay sandbox) — ✅ HOÀN THÀNH (2026-08-24)

**Mục tiêu:** Có ít nhất 1 phương thức thanh toán online hoạt động (VNPay sandbox).

Chia 3 bước 10A backend / 10B FE / 10C test + docs.

### Bước 10A ✅ — Backend VNPay module (2026-08-24)

**Đã hoàn thành:**

- **V21 migration** [V21__payment_transaction_fields.sql](../src/main/resources/db/migration/V21__payment_transaction_fields.sql) — thêm 2 cột vào `orders`:
  - `payment_transaction_ref` VARCHAR(50) — lưu `vnp_TransactionNo` từ VNPay, dùng đối soát.
  - `paid_at` TIMESTAMPTZ — thời điểm nhận IPN callback thành công.
  - Index `idx_orders_payment_transaction_ref` (partial WHERE not null).
- **Order entity** thêm 2 field tương ứng `paymentTransactionRef` + `paidAt`.
- **[VnpayProperties](../src/main/java/com/example/LaptopWorld_project/config/VnpayProperties.java)** record `@ConfigurationProperties("app.payment.vnpay")` — tmnCode, hashSecret, payUrl, returnUrl, apiUrl, version 2.1.0, command "pay", currCode VND, locale vn, orderType 250000 (other).
- **application-dev.properties** wire env var mặc định + note đăng ký sandbox tại https://sandbox.vnpayment.vn/devreg.
- **[VnpayService](../src/main/java/com/example/LaptopWorld_project/payment/vnpay/VnpayService.java)** — 2 method public:
  - `createPaymentUrl(order, clientIp)` — build TreeMap params (auto-sort alphabet key), tính amountX100 (VND × 100), format createDate + expireDate múi giờ VN "yyyyMMddHHmmss", hash HMAC-SHA512 hashSecret + hashData `key=urlEncodedValue&...`, gắn `vnp_SecureHash` vào query cuối cùng.
  - `verifyChecksum(params)` — loại `vnp_SecureHash` + `vnp_SecureHashType` khỏi TreeMap, tính lại hash, so equalsIgnoreCase với hash nhận.
  - Constants: expire 15 phút, HMAC-SHA512, US_ASCII URLEncode.
- **[VnpayCallbackController](../src/main/java/com/example/LaptopWorld_project/payment/vnpay/VnpayCallbackController.java)** — 2 endpoint public:
  - `GET /api/payments/vnpay/return` — user redirect về sau khi thanh toán, trả JSON `{orderCode, responseCode, transactionStatus, transactionNo, amount, checksumValid, success}` cho FE hiển thị page kết quả. KHÔNG update DB ở đây (chờ IPN chính thức).
  - `GET /api/payments/vnpay/ipn` — VNPay server-to-server callback: verify hash → lookup order → verify số tiền (amountX100 phải khớp) → idempotency (đã paid rồi trả `02 Order already confirmed`) → nếu response+status đều `00` set `paymentStatus=paid` + `paymentTransactionRef` + `paidAt=now()` → trả `{RspCode, Message}` đúng format VNPay yêu cầu (`00` success, `97` invalid checksum, `01` order not found, `04` invalid amount, `02` already confirmed).
- **SecurityConfig** thêm public matcher `GET /api/payments/vnpay/**` (VNPay không gửi JWT, verify bằng hash).
- **[CheckoutResponse](../src/main/java/com/example/LaptopWorld_project/order/dto/CheckoutResponse.java)** DTO mới `{order, paymentUrl}` — thay `OrderDetailDto` làm return type của `POST /api/checkout`.
- **CheckoutService.placeOrder** thêm param `clientIp`, sau khi save order xong nếu `paymentMethod=vnpay` → gọi `vnpayService.createPaymentUrl(saved, clientIp)` → trả về `CheckoutResponse{order, paymentUrl}`. COD → paymentUrl=null.
- **OrderController.checkout** extract clientIp từ header `X-Forwarded-For` → `X-Real-IP` → `getRemoteAddr()`, truyền vào service.
- **`./mvnw compile` pass sạch** (chỉ warning Lombok/Unsafe).

**Blocker cho Bước 10B/10C:** User cần đăng ký VNPay sandbox tại https://sandbox.vnpayment.vn/devreg (chờ email duyệt 1-2 ngày) rồi paste `tmnCode` + `hashSecret` vào `application-local.properties`:
```properties
app.payment.vnpay.tmn-code=YOUR_TMN_CODE
app.payment.vnpay.hash-secret=YOUR_HASH_SECRET
```

**Cần user test Bước 10A:**
- Restart backend → Flyway chạy V21 → check log không lỗi.
- Postman: login → thêm SP giỏ → `POST /api/checkout` body có `paymentMethod=vnpay` → response trả `{order, paymentUrl}` với paymentUrl là URL bắt đầu bằng `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...&vnp_SecureHash=...`.
- (Sau khi có creds thật) Copy paymentUrl paste browser → nhập thẻ test VNPay `9704198526191432198` (NCB, ngày hết hạn 07/15, OTP `123456`) → thanh toán → check log backend nhận IPN → order.paymentStatus = paid.

### Bước 10B ✅ — Frontend VNPay integration (2026-08-24)

**Đã hoàn thành:**

- **Types** (`types/api.ts`): OrderDetail thêm `paymentTransactionRef` + `paidAt`; 2 interface mới `CheckoutResponse {order, paymentUrl?}` + `VnpayReturnResult {orderCode, responseCode, transactionStatus, transactionNo?, amount?, checksumValid, success}`.
- **Hook** (`useOrders.ts`): `useCheckout` đổi return type sang `CheckoutResponse`. Hook mới `useVnpayReturn(queryString)` — forward toàn bộ location.search cho backend verify hash.
- **[CheckoutPage.tsx](../../laptopworld-web/src/pages/CheckoutPage.tsx)**:
  - `handleSubmit`: nếu `result.paymentUrl` có → toast "Đang chuyển sang cổng VNPay..." + `window.location.href = result.paymentUrl`; nếu null → navigate `/dat-hang/thanh-cong/:code` như cũ.
  - Radio button VNPay từ "chưa khả dụng" → active với hint thẻ test NCB `9704198526191432198` OTP `123456` + badge "Mới" emerald.
- **[VnpayReturnPage.tsx](../../laptopworld-web/src/pages/VnpayReturnPage.tsx)** trang mới `/thanh-toan/vnpay/ket-qua`:
  - Extract `location.search` → gọi `useVnpayReturn` → backend verify HMAC.
  - 4 state UI: no query params (ShieldAlert amber "trang này chỉ hoạt động khi được VNPay chuyển về"), loading (Clock spin "đang xác thực"), checksumValid=false (**ShieldAlert rose** với warning mạnh "URL bị chỉnh sửa hoặc phiên hết hạn"), success/fail (CheckCircle2 emerald hoặc XCircle rose) với card thông tin đầy đủ (Mã đơn / Số tiền / Mã GD VNPay / Response code / Transaction status / HMAC hợp lệ badge) + note giải thích IPN + 2 CTA link tới danh sách đơn hoặc chi tiết đơn.
- **App.tsx** thêm route `/thanh-toan/vnpay/ket-qua` (protected — bọc `ProtectedRoute` cho khách logged-in).
- **[OrderDetailPage.tsx](../../laptopworld-web/src/pages/OrderDetailPage.tsx)** (user): block "Thanh toán" gồm phương thức + trạng thái màu (emerald=paid / amber=unpaid / sky=refunded) + mã GD VNPay mono + ngày thanh toán.
- **[AdminOrderDetailPage.tsx](../../laptopworld-web/src/pages/admin/AdminOrderDetailPage.tsx)** (admin): Card riêng "Thanh toán" trong aside — Row phương thức + Badge trạng thái + mã GD (kèm nút copy dùng `useCopyToClipboard` sẵn có) + ngày TT.
- **Postman folder 22 "Payment — VNPay"** (3 endpoint reference): POST checkout với vnpay + GET return/ipn với hash fake để inspect payload — real hash chỉ có khi VNPay redirect thật, test full luồng phải qua browser.
- **`npx tsc --noEmit` pass sạch (exit 0)**. **Postman tổng: 22 folder / 154 endpoint**.

**Cần user test Bước 10B:**
1. Đảm bảo backend đã restart để load V21 + Vnpay* + credentials từ `application-local.properties`.
2. `npm run dev` → login user1 → thêm SP giỏ → checkout chọn "VNPay — Thẻ ATM/QR/Visa" → bấm Đặt hàng.
3. Browser redirect tự động sang trang sandbox VNPay → chọn ngân hàng "NCB" → nhập thẻ `9704198526191432198`, ngày `07/15`, OTP `123456`.
4. VNPay redirect về `/thanh-toan/vnpay/ket-qua?vnp_...` → phải thấy card emerald "Thanh toán thành công" với đầy đủ mã đơn + số tiền + mã GD + badge HMAC hợp lệ.
5. Vào `/tai-khoan/don-hang/:code` → phải thấy trạng thái "Đã thanh toán" xanh + mã GD VNPay + ngày TT (từ IPN callback, có thể trễ vài giây).
6. (Admin) Login admin → `/admin/don-hang/:id` → aside "Thanh toán" hiện đúng badge paid + copy được mã GD.

  **Bug fix bổ sung (2026-08-24) — IPN không tới localhost:**
  - **Triệu chứng:** Sau khi thanh toán VNPay thành công trên browser, VnpayReturnPage hiện card emerald OK nhưng vào `/tai-khoan/don-hang/:code` vẫn "Chưa thanh toán".
  - **Root cause:** VNPay sandbox chạy trên server công cộng, không gọi được `http://localhost:8080/api/payments/vnpay/ipn` (localhost = máy user, VNPay không thấy). Chỉ `/return` được browser gọi tới, nhưng logic cũ để trống — chỉ hiển thị UI, chờ IPN update DB → dead-end.
  - **Fix:** Refactor `VnpayCallbackController` — extract logic verify+update thành helper `updateOrderIfValid(params)` dùng chung. `/return` giờ cũng update DB (best-effort, wrap try/catch tránh lỗi update phá page kết quả). `/ipn` giữ nguyên logic + trả VNPay format. Idempotency đảm bảo cùng 1 giao dịch không double-update (return + IPN cùng xử lý → cái đến trước paid, cái sau skip). Ghi rõ trade-off dev/prod trong Javadoc class.
  - **FE:** `VnpayReturnPage` thêm `useEffect` invalidate cache `['order', code]` + `['my-orders']` khi `data.success` → user vào chi tiết đơn thấy paid ngay không cần F5.
  - Backend `./mvnw compile` + FE `tsc --noEmit` pass sạch sau fix.

### Bước 10C — Test end-to-end + docs (~1 buổi)

### Bước 10C ✅ — Test end-to-end + docs (2026-08-24)

**Đã hoàn thành:**

- **Test end-to-end thẻ NCB** — user đã thanh toán thành công với thẻ test `9704198526191432198` OTP `123456`. Sau bug fix "IPN không tới localhost" (`/return` cũng update DB best-effort), luồng full pass:
  - Checkout VNPay → cổng VNPay → chọn "Thẻ nội địa" → nhập NCB → OTP → redirect về `/thanh-toan/vnpay/ket-qua` card emerald.
  - `/tai-khoan/don-hang/:code` hiện "✓ Đã thanh toán" + mã GD + ngày TT ngay không cần F5 (nhờ `useEffect` invalidate cache).
  - Admin `/admin/don-hang/:id` aside "Thanh toán" hiện Badge paid + copy được mã GD.
- **[ai-docs/testcases.md](testcases.md)** — bảng test case chuẩn bị hội đồng bảo vệ:
  - 5 kịch bản VNPay (TC-VNPAY-01 → 05): happy path / user cancel / amount tampered / duplicate F5 / HMAC correctness verify. 3 ✅ pass, 2 🟡 Postman verify.
  - Regression 21 case Phân quyền Sprint 9G ✅
  - Regression 7 case Inventory FIFO Sprint 9E ✅
  - Regression 1 case Race condition oversell ✅
  - Regression 4 case AI layer smoke test ✅
  - **Tổng: 38 case, 38 pass.**
- **[ai-docs/vnpay-flow.md](vnpay-flow.md)** — ~800 từ thiết kế payment layer đầy đủ dùng nguyên cho báo cáo đồ án:
  - Tổng quan (phạm vi + điểm nhấn kỹ thuật)
  - Kiến trúc luồng dữ liệu (ASCII diagram checkout → VNPay → return + IPN parallel)
  - Chi tiết `VnpayProperties`, `VnpayService.createPaymentUrl`, `VnpayCallbackController` dual-callback pattern
  - Vì sao `/return` cũng update DB (fallback dev localhost)
  - Bảo mật 4 lớp (HMAC / amount verify / idempotency / secret storage)
  - Data model V21 + partial index
  - Roadmap cải tiến out of scope (refund, retry, MoMo/ZaloPay, bảng payment_transactions)
  - Tham chiếu source code + VNPay docs
- **Postman folder 22 "Payment VNPay"** đã xong ở Bước 10B (3 endpoint reference: POST checkout vnpay + GET return/ipn với hash fake).

**Deliverable Phase 10:** Đặt đơn → redirect VNPay sandbox → thanh toán thẻ NCB → về lại LaptopWorld, order `payment_status = paid`, admin thấy paid + mã GD. Documentation đầy đủ (testcases + vnpay-flow) sẵn sàng cho hội đồng bảo vệ và báo cáo.

---

## Phase 11 — Testing, hardening, seed data, Docker ✅ HOÀN THÀNH 2026-08-25

**Tổng kết đạt được:** 57 test tự động pass ~40s (41 unit + 16 integration Testcontainers), 154 request Newman pass 20.8s, Docker Compose 3 container end-to-end, `AuthRateLimiter` login/register/forgot bảo vệ IP, security-audit.md 220 dòng verify 0 IDOR, V22 seed 5 user + 5 voucher + 10 order, testcases.md 38→93 case. **Hotfix cùng ngày** (post-Phase 11): tách session admin/customer qua `loginSource` — STAFF login được `/admin/dang-nhap`, customer session bắt re-login khi vào `/admin/*`.

**Mục tiêu tổng:** Dự án ổn định, chạy được toàn bộ stack bằng `docker compose up -d`, có bộ test tự động (~50 case) làm bằng chứng cho chương "Kiểm thử" của báo cáo, có Newman report HTML đính kèm.

**Thời lượng gợi ý:** ~7 buổi (2-3h/buổi).

**Thứ tự thực hiện:** 11A → 11B → 11D → 11C → 11E (test trước để không phá gì → Docker sớm để chạy Newman → hardening + docs cuối).

**Nguyên tắc:** Sau mỗi bước dừng lại review + cập nhật `overview.md`, không tự nhảy sang bước kế.

**Ảnh sản phẩm & banner (chuẩn bị trước Phase 11):** 2026-08-25 đã copy 255 ảnh SP từ `webthegioididong/public/storage/img/` sang `LaptopWorld_project/uploads/products/legacy/` + 10 banner sang `uploads/banners/`. V14 seed đã reference đúng tên file → không cần chỉnh SQL. Ảnh nằm trong `.gitignore` (`uploads/`) → khi deploy Docker sẽ mount volume riêng.

---

### Bước 11A — Unit test service quan trọng (~1.5 buổi)

**Mục tiêu:** ~30 unit test JUnit 5 + Mockito + AssertJ, chạy `./mvnw test` xanh sạch, không cần DB, thời gian < 10s.

**Dependencies bổ sung `pom.xml`:**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```
(Bao trọn: JUnit 5, Mockito, AssertJ, Hamcrest. `data-jpa-test` + `webmvc-test` + `spring-security-test` đã có sẵn.)

**Files test tạo trong `src/test/java/com/example/LaptopWorld_project/`:**

| File | Cover | Số case |
|------|-------|---------|
| `voucher/VoucherServiceTest.java` | `calculateDiscount` fixed / percent / min-order / max-cap / expired / hết lượt | 6 |
| `order/CheckoutServiceTest.java` | Snapshot pattern / voucher mark used / stock validate / order code retry / total tính đúng | 5 |
| `inventory/InventoryServiceTest.java` | FIFO batch order / approve auto issue / reject rollback / manual issue / oversell block / rollback khi cancel shipping | 6 |
| `payment/VnPayServiceTest.java` | Build URL param alphabet order / HMAC-SHA512 giống công cụ VNPay online / verify chữ ký return đúng+sai / IPN idempotent (gọi 2 lần không update 2 lần) | 4 |
| `ai/AgentChatServiceTest.java` | Mock Gemini — tool call loop 2 lần / max 5 iterations dừng / no tool call trả text thẳng | 3 |
| `auth/JwtServiceTest.java` | Generate + parse valid / expired throws / wrong secret throws | 3 |
| `auth/AuthRateLimiterTest.java` | 10 lần trong 15 phút pass / lần 11 throws / khác IP không ảnh hưởng | 3 |

**Test properties (`src/test/resources/application-test.properties`):**
- `VNPAY_TMN_CODE=FAKE_TEST`, `VNPAY_HASH_SECRET=SANDBOXSECRETFORHMAC512`
- Gemini disabled qua `@MockBean GeminiClient`
- SMTP mock qua `@MockBean MailService`

**Deliverable:** `./mvnw test` xanh **30 case** < 10s.

---

### Bước 11B — Integration test Testcontainers (~1.5 buổi)

**Mục tiêu:** ~20 integration test chạy trên Postgres THẬT (pgvector) qua Testcontainers, cover 5 flow end-to-end + 3 vùng bổ sung.

**Dependencies bổ sung `pom.xml`:**
```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
```

**Files tạo trong `src/test/java/.../integration/`:**

| File | Cover | Số case |
|------|-------|---------|
| `BaseIntegrationTest.java` | Abstract class `@Testcontainers` — `pgvector/pgvector:pg16` container static (share cho cả suite), `@DynamicPropertySource` inject datasource, Flyway auto chạy V1-V20 | — |
| `AuthFlowIT.java` | Register → verify (fake token DB) → login → refresh → logout | 5 |
| `OrderFlowIT.java` | Login user → add cart → checkout → admin confirm → confirm→preparing (tạo phiếu pending) → approve issue → check stock FIFO giảm đúng batch → check `order.status=shipping` | 7 |
| `ReviewGateIT.java` | User chưa mua → 400 NOT_PURCHASED; đơn shipping → 400 NOT_DELIVERED; delivered → 201 OK | 3 |
| `ReservedStockRaceIT.java` | 2 thread checkout song song cùng SP còn 1 → 1 pass 1 fail `INSUFFICIENT_STOCK` (dùng `ExecutorService` + `CountDownLatch`) | 1 |
| `PermissionRbacIT.java` | STAFF có `view_products` GET được nhưng PUT 403; STAFF không có `manage_users` gọi API 403; ADMIN bypass mọi permission | 3 |
| `SemanticSearchIT.java` | Embed 3 SP mock (bypass Gemini bằng vector cố định) → semantic search query "laptop gaming" → top-1 khớp SP gaming (test HNSW index + pgvector cosine) | 1 |

**Chú ý kỹ thuật:**
- Container start 1 lần cho cả module test (static field), Flyway migration cache lại
- Cần Docker Desktop bật khi chạy `./mvnw verify` — nếu không sẽ skip
- VNPay + Gemini vẫn mock (`@MockBean`) trong integration test — chỉ test luồng nghiệp vụ

**Deliverable:** `./mvnw verify` xanh **20 case integration** < 90s.

---

### Bước 11D — Docker Compose full stack (~2 buổi)

**Mục tiêu:** 1 lệnh `docker compose up -d` chạy được toàn bộ stack: postgres + backend + frontend. Ảnh SP hiển thị đúng, login admin thao tác được.

**Files tạo mới:**

**D.1 — `LaptopWorld_project/Dockerfile` (multi-stage backend):**
- Stage 1 build: `eclipse-temurin:21-jdk` + `./mvnw -B clean package -DskipTests` (skip test vì test đã chạy ở bước 11A-B)
- Stage 2 runtime: `eclipse-temurin:21-jre` + COPY jar + `ENTRYPOINT java -jar app.jar`

**D.2 — `laptopworld-web/Dockerfile` (multi-stage frontend + Nginx):**
- Stage 1: `node:22-alpine` + `npm ci` + `npm run build` → ra `dist/`
- Stage 2: `nginx:1.27-alpine` + COPY `dist/` vào `/usr/share/nginx/html` + COPY `nginx.conf`

**D.3 — `laptopworld-web/nginx.conf`:**
- `try_files $uri /index.html` (SPA fallback cho React Router)
- `location /api/` → `proxy_pass http://backend:8080/api/`
- `location /uploads/` → `proxy_pass http://backend:8080/uploads/`
- Bật gzip cho `text/css`, `application/javascript`

**D.4 — `docker-compose.yml` (ngang cấp `LaptopWorld_project/`):**
```yaml
services:
  postgres:      # pgvector/pgvector:pg16, internal only, không expose port
  backend:       # build ./LaptopWorld_project, depends_on postgres healthy
  frontend:      # build ./laptopworld-web, port 80 → host 80
volumes:
  pgdata:
  uploads:       # mount vào backend /app/uploads
```

**D.5 — `.env.example` (root repo):**
```
POSTGRES_PASSWORD=change_me
JWT_SECRET=<generate-64-char-string>
GEMINI_API_KEY=<your-key>
VNPAY_TMN_CODE=<sandbox-code>
VNPAY_HASH_SECRET=<sandbox-secret>
VNPAY_RETURN_URL=http://localhost/api/payment/vnpay/return
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=<gmail-app-password>
MAIL_FROM=noreply@laptopworld.com
SPRING_PROFILES_ACTIVE=prod
```

**D.6 — `application-prod.properties` mới:**
- Actuator `show-details=never` (không lộ config)
- CORS `allowed-origins=http://localhost,https://laptopworld.com` (không `*`)
- Log level `INFO` (không `DEBUG`)
- Uploads path `/app/uploads`

**D.7 — Copy ảnh vào volume lần đầu:**
- Script `docker/init-uploads.sh` hoặc hướng dẫn manual: sau lần `docker compose up` đầu → `docker cp uploads/. laptopworld_backend_1:/app/uploads/`
- Hoặc: mount bind `./LaptopWorld_project/uploads:/app/uploads` (đơn giản hơn cho dev, sẽ ghi trong README)

**D.8 — Update README repo root:**
- Section "Chạy Docker Compose": 3 lệnh (`cp .env.example .env` → sửa → `docker compose up -d`)
- Section "VNPay trong Docker": note rõ IPN không tới localhost, dev vẫn dùng dual-callback, cần ngrok nếu muốn test IPN live
- Section "Xoá sạch làm lại": `docker compose down -v`

**Test after build:**
- `docker compose down -v` (xoá sạch)
- `docker compose up -d --build`
- Đợi ~2 phút Flyway chạy xong
- Truy cập `http://localhost` → login `admin/admin123` → dashboard hiển thị
- Xem `/danh-muc/laptop` → ảnh SP hiển thị từ `/uploads/products/legacy/*.jpg`
- Tạo 1 đơn thử → confirm → preparing → approve issue → shipping OK

**Deliverable:** 1 lệnh `docker compose up -d` chạy được full stack, checklist test 5 điểm pass.

---

### Bước 11C — Hardening (~1 buổi)

**C.1 — Rate limit endpoint nhạy cảm** (~40 phút)
- Tạo `auth/ratelimit/AuthRateLimiter.java` — mô phỏng `ChatRateLimiter` (thuần Java, in-memory `ConcurrentHashMap<String, TokenBucket>`, key = IP address):
  - `/api/auth/login`: 10 lần / 15 phút / IP → 429 với message tiếng Việt "Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút"
  - `/api/auth/register`: 5 lần / 1 giờ / IP
  - `/api/auth/forgot-password`: 3 lần / 1 giờ / IP
- Filter/interceptor gắn trước SecurityFilterChain lấy IP qua `X-Forwarded-For` (Nginx set) fallback `request.getRemoteAddr()`
- Unit test đã cover ở bước 11A (`AuthRateLimiterTest`)

**C.2 — Security audit** (~40 phút)
- Grep tất cả `@RequestMapping`/`@GetMapping`/`@PostMapping` → verify từng endpoint
- Check IDOR: `/api/orders/{code}`, `/api/addresses/{id}`, `/api/reviews/{id}` — có filter theo `currentUser.id` không?
- Check admin: mọi endpoint `/api/admin/**` có `@PreAuthorize` với permission phù hợp?
- Ghi kết quả vào `ai-docs/security-audit.md`:
  - Bảng danh sách endpoint | Verdict (PASS/FIX) | Ghi chú
  - Ít nhất 3 IDOR check phải PASS (Order, Address, Review)
  - Chốt: N endpoint audited, K fixed

**C.3 — Nhỏ lẻ**
- `management.endpoint.health.show-details=never` cho profile prod (đã include trong D.6)
- CORS prod: `allowed-origins` cụ thể (đã include trong D.6)
- Xoá endpoint debug/test nếu có
- Verify `application-local.properties` không commit (đã ignore từ Phase 0)

**Deliverable:** `ai-docs/security-audit.md` chi tiết, AuthRateLimiter chạy được, test manual 11 lần login liên tiếp → 429.

---

### Bước 11E — Seed bổ sung + Newman + testcases.md (~1 buổi)

**E.1 — Migration `V21__seed_demo_data.sql`:**
- 5 user thường: `user1..user5` / `admin123` — email `verified=true`
- 5 voucher đang chạy: `WELCOME10` (10% max 100k), `FLASH50K` (fixed 50k min-order 500k), `LAPTOP200K` (fixed 200k min-order 10tr), `FREESHIP` (fixed 30k), `NEWUSER15` (15% max 200k)
- 10 order sample rải qua 5 user:
  - 3 delivered (test review sau này)
  - 2 shipping
  - 2 preparing (có phiếu pending)
  - 1 confirmed
  - 1 pending
  - 1 cancelled
- 3 goods_issue tương ứng (2 completed FIFO, 1 pending chờ duyệt)
- Idempotent qua `ON CONFLICT DO NOTHING` với natural key (username, code)

**E.2 — Mở rộng `ai-docs/testcases.md`:**
- Đã có 38 case VNPay từ Phase 10
- Thêm ~50 case chia bảng:
  - Auth (10): register OK, register email trùng, verify token hết hạn, login sai, login khoá, refresh OK, refresh revoke, forgot-password, reset OK, reset token dùng lại
  - Catalog (8): list filter combo, filter category+brand+price, detail OK, detail 404, search fulltext, sort giá
  - Cart + Checkout (10): add cart, update qty, remove, apply voucher, remove voucher, checkout OK, checkout hết stock, checkout voucher hết hạn, price change detection, snapshot đúng
  - Order FIFO (10): pending→confirmed, confirmed→preparing tạo phiếu, kho approve FIFO trừ batch cũ, kho reject rollback, cancel preparing không hoàn kho, cancel shipping hoàn kho, manual issue approve, manual issue reject, tracking auto-gen, oversell block
  - Review (5): NOT_PURCHASED, NOT_DELIVERED, ALREADY_REVIEWED, review OK, admin hide/unhide
  - Voucher (7): fixed, percent, min-order, max-cap, expired, hết lượt, refund khi cancel
- Format bảng: | STT | Chức năng | Input | Expected | Actual | Status |

**E.3 — Chạy Newman + xuất HTML:**
- Cài local: `npm install -g newman newman-reporter-htmlextra` (hoặc dùng `npx`)
- Chạy: `newman run LaptopWorld.postman_collection.json --reporters cli,htmlextra --reporter-htmlextra-export ai-docs/newman-report.html`
- Chú ý: Postman collection cần env variables (`baseUrl`, `adminToken`, `userToken`) → chuẩn bị file `newman-env.json` với token pre-login
- Thêm 1 script Postman `Pre-request Script` cho folder auth: nếu chưa có token → tự login → set env var
- Save file HTML vào `ai-docs/newman-report.html` → đính kèm báo cáo tốt nghiệp

**E.4 — Update `ai-docs/overview.md`:**
- Phase 11 ✅ + summary: 30 unit + 20 integration = 50 test case + Newman 151 endpoint + Docker Compose 3 container
- Update bảng progress phase 11 → ✅

**Deliverable:** V21 migration chạy sạch, testcases.md ~88 case (38 VNPay + 50 mới), `newman-report.html` xanh 151 endpoint.

---

### 🎯 Tổng kết Phase 11

| Bước | Nội dung | Deliverable | Ngày dự kiến |
|------|----------|-------------|-------------|
| 11A | 30 unit test (VoucherService, CheckoutService, InventoryService, VnPayService, AgentChatService, JwtService, AuthRateLimiter) | `./mvnw test` xanh < 10s | ~1.5 buổi |
| 11B | 20 integration test Testcontainers (AuthFlow, OrderFlow, ReviewGate, ReservedStockRace, PermissionRbac, SemanticSearch) | `./mvnw verify` xanh < 90s | ~1.5 buổi |
| 11D | Dockerfile backend + frontend + docker-compose.yml + .env.example + application-prod.properties + README update | `docker compose up -d` full stack xanh, ảnh SP hiển thị | ~2 buổi |
| 11C | AuthRateLimiter + security-audit.md + CORS/Actuator prod hardening | Doc audit + rate limit test manual pass | ~1 buổi |
| 11E | V21 seed + testcases.md mở rộng + Newman HTML report + update overview.md | 88 test case docs + Newman report | ~1 buổi |
| **Tổng** | | | **~7 buổi** |

**Không làm ở Phase 11 (đã cân nhắc):**
- ❌ **Redis** — 1 backend instance, rate limit in-memory + TanStack Query cache client đã đủ; Redis phù hợp khi scale horizontal, nằm ngoài phạm vi đồ án
- ❌ **CI GitHub Actions** — hội đồng không kiểm tra CI; Newman chạy local + export HTML đã đủ bằng chứng
- ❌ **Load test JMeter** — không phải yêu cầu đồ án
- ❌ **SonarQube / code coverage tool** — overkill, JaCoCo có thể thêm nếu dư thời gian nhưng không blocker
- ❌ **Cypress/Playwright E2E frontend** — demo bằng video Phase 12 là đủ

**Rủi ro cần theo dõi:**
- Java 25 + Testcontainers 1.20 — nếu vỡ, downgrade JVM sang 21 chỉ cho test profile (Maven surefire config)
- VNPay callback trong Docker — document rõ trong README rằng test IPN live cần ngrok, không phải bug

**Deliverable tổng Phase 11:**
1. `./mvnw test verify` xanh 50 case
2. `docker compose up -d` chạy full stack, ảnh SP hiển thị đúng
3. `ai-docs/security-audit.md` + `ai-docs/testcases.md` mở rộng + `ai-docs/newman-report.html`
4. AuthRateLimiter bảo vệ 3 endpoint auth
5. Update `overview.md` marker ✅ Phase 11

---

## Phase 12 — Báo cáo, slide, video demo

**Mục tiêu:** Nộp đồ án hoàn chỉnh.

### Việc cần làm
- [ ] Báo cáo Word/PDF: cấu trúc theo mẫu trường (Mở đầu, Cơ sở lý thuyết, Phân tích thiết kế, Cài đặt, Kết luận).
- [ ] Section AI: giải thích RAG, function calling, vector similarity — dùng lại `ai-design.md`.
- [ ] Slide bảo vệ (~20 slide): tổng quan, tech stack, demo AI (điểm nhấn), demo checkout, demo FIFO, kết luận.
- [ ] Video demo (~5-7 phút): quay screen cast luồng chính.
- [ ] Screenshot bổ sung cho báo cáo.
- [ ] Push code final lên GitHub, tag `v1.0`.

---

## Nguyên tắc chung trong lúc làm

1. **Không skip test khi hoàn thành 1 endpoint** — Postman collection cập nhật liên tục.
2. **Commit nhỏ và thường xuyên** — mỗi feature một branch, PR merge vào `main`.
3. **Ghi chú quyết định kiến trúc** vào `ai-docs/decisions/YYYY-MM-DD-<slug>.md` khi có quyết định lớn (VD: chọn Flyway thay Liquibase).
4. **Không tối ưu sớm** — code hoạt động trước, tối ưu sau khi có metric.
5. **Backup DB dev** trước migration nguy hiểm (`pg_dump`).
6. **Không hard-code secret** — luôn qua ENV / `application-local.properties` (git ignore).

---

## Danh sách file docs cần viết dần

| File | Viết ở phase | Nội dung |
|---|---|---|
| `ai-docs/overview.md` | (đã có) | Tổng quan dự án |
| `ai-docs/plan.md` | (đã có) | Kế hoạch |
| `ai-docs/database.md` | Phase 1 | Schema chi tiết |
| `ai-docs/api.md` | Phase 2-7 | Cập nhật dần theo endpoint |
| `ai-docs/ai-design.md` | Phase 5 | Thiết kế AI layer (dùng cho báo cáo) |
| `ai-docs/deployment.md` | Phase 11 | Hướng dẫn deploy |
| `ai-docs/testcases.md` | Phase 11 | Bảng test case |
| `ai-docs/decisions/*.md` | Xuyên suốt | ADR nhỏ |
