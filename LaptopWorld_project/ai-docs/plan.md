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

  ### Bước A — Backend Users management (~0.5 buổi)

  **4 endpoint mới `/api/admin/users`:**
  - `GET` — list paginated + filter keyword (username/email/fullName) + status (active/banned/unverified) + role (id). Guard `hasRole('ADMIN') or hasAuthority('view_users')`.
  - `GET /{id}` — detail user kèm stats (số đơn, số review, tổng chi tiêu ước tính từ orders delivered). Guard `view_users`.
  - `POST /{id}/status` body `{status}` — set active/banned/unverified. Guard `manage_users`.
    - Chặn admin ban chính mình → 400 `CANNOT_BAN_SELF`
    - Chặn ban user ADMIN cuối cùng → 400 `LAST_ADMIN_LOCKED`
  - `POST /{id}/roles` body `{roleIds: number[]}` — replace toàn bộ roles của user. Guard `assign_user_roles`.
    - Chặn gỡ role ADMIN cuối cùng của chính mình → 400 `CANNOT_REMOVE_OWN_ADMIN`
    - Chặn user không tồn tại role → 400 `ROLE_NOT_FOUND`

  **DTOs mới:**
  - `AdminUserListItemDto` (id, username, email, emailVerified, fullName, phone, avatar, status, roleNames[], createdAt)
  - `AdminUserDetailDto` (list fields + roles[] full DTO + stats {orderCount, reviewCount, totalSpent})
  - `SetUserStatusRequest`, `SetUserRolesRequest`
  - `AdminUserService.list/findById/setStatus/setRoles`

  ### Bước B — Frontend Users page (~0.5 buổi)

  **`AdminUsersPage`** (`/admin/nguoi-dung`):
  - List cột: Avatar (initials fallback) / Username + email + badge "Verified" / Full name + phone / Chips vai trò (role badges với màu phân biệt ADMIN/STAFF/tự tạo) / Status badge (Active xanh / Banned đỏ / Unverified xám) / Ngày tạo / Thao tác (Chi tiết + Khóa/Mở + Vai trò)
  - Filter: keyword / status / role
  - Pagination

  **`AdminUserDetailDialog`** — mở khi bấm Chi tiết:
  - Info card: avatar to + username + email + phone + fullName + gender + birthday + trạng thái
  - Stats card: đơn hàng total, review total, tổng chi tiêu (formatPrice)
  - Roles card: chips vai trò hiện có + link "Đổi vai trò"

  **`AssignRolesDialog`** — form gán role:
  - CheckboxList list toàn bộ role (từ `useAdminRoles`)
  - Preview: badges vai trò đã chọn + total permission count (tính bằng cách gộp permissions của tất cả role đã chọn)
  - Note vàng "User đang online cần logout+login để áp quyền mới"
  - Save → toast + invalidate list

  **Hooks `hooks/api/useAdminUsers.ts`:** useAdminUsers/useAdminUserDetail/useSetUserStatus/useSetUserRoles

  **Wire route** `/admin/nguoi-dung` từ placeholder → AdminUsersPage.

  ### Bước C — Frontend AI Embedding page (~0.3 buổi)

  **`AdminAiEmbeddingPage`** (`/admin/ai/embedding`):
  - Backend đã có sẵn (Sprint 5): `GET /admin/ai/embedding-stats`, `POST /admin/ai/embed-products?force=`, `POST /admin/ai/embed-products/{id}`
  - **KPI cards** (4): Total SP / Đã embed / Chưa embed / Stale (embed cũ so với updated_at)
  - **Nút actions:**
    - "Embed các sản phẩm mới" (default force=false, chỉ embed SP chưa có embedding)
    - "Re-embed toàn bộ" (force=true) — có ConfirmDialog vì tốn API call
  - **Progress:** Sonner promise toast hiển thị đang chạy → kết quả (embedded/skipped/failed + durationMs)
  - **Table SP recent:** list 20 SP mới nhất kèm cột "Trạng thái embedding" (Có/Chưa) + nút "Re-embed" từng SP
  - Guard route: `manage_ai_embedding`
  - Wire route từ placeholder.

  ### Bước D — Frontend AI Chat Sessions page (~0.5 buổi)

  **Backend endpoint mới:**
  - `GET /api/admin/ai/chat-sessions` — list paginated + filter (loggedIn=true/false, dateFrom/dateTo). Cần thêm method vào `ChatSessionRepository.findAll(Specification, Pageable)`.
  - `GET /api/admin/ai/chat-sessions/{id}` — detail session + toàn bộ messages ordered by createdAt asc.
  - Guard `hasAuthority('manage_ai_embedding')` (dùng chung, vì AI ops là 1 nhóm).
  - DTOs: `AdminChatSessionListItemDto` (id, userId?, username?, isGuest, messageCount, lastActivityAt, createdAt), `AdminChatSessionDetailDto` (info + messages[] {role, content, createdAt, citedProductIds?})

  **`AdminAiChatSessionsPage`** (`/admin/ai/chat`):
  - List cột: ID (mono) / User (username hoặc badge "Khách") / Số tin nhắn / Hoạt động cuối / Thao tác (Xem chi tiết)
  - Filter: guest/logged / date range
  - Pagination
  - **`ChatSessionDetailDialog`** khi bấm Xem: hiện info + list messages dạng bubble (user right, assistant left, timestamps nhỏ), scroll trong dialog.
  - Wire route từ placeholder.

  ### Bước E — Polish + Test E2E cuối (~0.5 buổi)

  **Polish:**
  - Hook `useCopyToClipboard()` — dùng `navigator.clipboard.writeText` + toast success/error
  - Component `AdminEmptyState` (icon Lucide + title + description + optional action button) — refactor các trang list dùng empty message inline sang component chung
  - Thêm nút copy cho: mã đơn (AdminOrdersPage + AdminOrderDetailPage), mã voucher (AdminVouchersPage), mã tracking, ID user

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

- [ ] **Sprint 9H — Test end-to-end + docs** (~1 buổi)
  - Chạy tay flow admin đầy đủ end-to-end
  - Update Postman collection với ~25 endpoint admin mới
  - README ghi cách chạy admin

**Deliverable đến cuối Sprint 9F:** Admin login → làm được toàn bộ Catalog/Order/Inventory/Partner/Voucher/Banner/Blog/Review qua UI. Race protection chống oversell hoạt động. Filament-style form cho các trang tạo. Backend guardrails đầy đủ. Còn nợ: Users management, AI ops page, polish (Sprint 9G) + test end-to-end + docs (Sprint 9H).

---

## Phase 10 — Payment integration

**Mục tiêu:** Có ít nhất 1 phương thức thanh toán online hoạt động (VNPay sandbox).

### Việc cần làm
- [ ] Đăng ký VNPay sandbox, lấy `vnp_TmnCode` + `vnp_HashSecret`.
- [ ] `payment/vnpay/` module:
  - `VnpayService.createPaymentUrl(order)` — build query string + HMAC.
  - `VnpayCallbackController` — nhận IPN + return URL, verify hash, cập nhật `payment_status`.
- [ ] (Optional) MoMo tương tự.
- [ ] Update `Checkout` để redirect user sang VNPay khi chọn payment method này.

**Deliverable:** Đặt đơn → redirect VNPay sandbox → thanh toán thẻ test → về lại LaptopWorld, order `payment_status = paid`.

---

## Phase 11 — Testing, hardening, seed data, Docker

**Mục tiêu:** Dự án ổn định, có bộ seed dữ liệu demo phong phú, chạy được bằng `docker-compose up`.

### Việc cần làm
- [ ] Unit test service quan trọng: `CheckoutService`, `InventoryService.reduceStock`, `VoucherService.calculateDiscount`, `ChatService` (mock Gemini).
- [ ] Integration test bằng Testcontainers PostgreSQL cho: auth flow, catalog CRUD, order flow, FIFO.
- [ ] Load seed data lớn: 100 products đa dạng category, 20 vouchers, 10 users, 30 orders sample.
- [ ] Rate limit endpoint sensitive (login, chat, register).
- [ ] Security audit: kiểm tra tất cả endpoint có `@PreAuthorize` hợp lý, không lộ ID không thuộc user.
- [ ] `Dockerfile` multi-stage cho backend.
- [ ] `docker-compose.yml`: postgres (pgvector image `pgvector/pgvector:pg16`), redis, backend, frontend (Nginx serve build).
- [ ] `.env.example` liệt kê tất cả biến môi trường cần.
- [ ] README cập nhật đầy đủ cách chạy.

**Deliverable:** Xóa DB, `docker-compose up`, đợi migration + seed → truy cập được full app.

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
