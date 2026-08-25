# LaptopWorld

E-commerce Spring Boot 4 + PostgreSQL + React tích hợp trợ lý AI (Gemini) — đồ án tốt nghiệp.

- **Tổng quan** (state, sprint): [ai-docs/overview.md](ai-docs/overview.md)
- **Kế hoạch** (13 phase chi tiết): [ai-docs/plan.md](ai-docs/plan.md)
- **Kiến trúc AI** (RAG + function calling, dùng cho báo cáo): [ai-docs/ai-design.md](ai-docs/ai-design.md)
- **Postman collection** (21 folder / 151 endpoint): [ai-docs/LaptopWorld.postman_collection.json](ai-docs/LaptopWorld.postman_collection.json)

Progress: Phase 0-8 ✅ + Phase 9 hiện 8/9 sprint (9A→9F + 9G-perm + 9G). Còn Sprint 9H (đang làm) → Phase 10 VNPay → 11 Docker + Test → 12 Báo cáo.

---

## 1. Yêu cầu hệ thống

- **JDK 21** (chạy được trên JVM 25 với `-proc:full` — đã cấu hình sẵn trong `pom.xml`)
- **Docker Desktop** (chạy Postgres pgvector cổng 5433)
- **Node.js 20+** + **npm** (cho frontend)
- Gemini API key (đăng ký free tại https://aistudio.google.com)

---

## 2. Chạy backend

### 2.1. Khởi động Postgres bằng Docker
```bash
cd LaptopWorld_project
docker compose -f docker-compose.dev.yml up -d
```
Container `pgvector/pgvector:pg16` chạy cổng **5433**, DB `laptopworld_dev`, user `laptopworld_app`.

### 2.2. Config secret local
Tạo file `src/main/resources/application-local.properties` (đã gitignore):
```properties
spring.datasource.password=laptopworld_dev_pw
app.jwt.secret=<64-byte-random-string>
app.ai.gemini.api-key=<your-gemini-api-key>
spring.mail.username=<your-gmail>
spring.mail.password=<gmail-app-password>
app.mail.from=<your-gmail>
```

### 2.3. Chạy Spring Boot
```bash
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev,local"
```
Boot xong Flyway tự chạy 20 migration + `DataInitializer` seed admin/admin123.

Kiểm tra:
- Health: http://localhost:8080/actuator/health → `UP`
- Swagger UI: http://localhost:8080/swagger-ui.html
- API root: http://localhost:8080/api/

> **Lưu ý Java 25:** DevTools **đã tắt** trong `application.properties` (`spring.devtools.restart.enabled=false`) do lỗi `NoClassDefFoundError`. Mỗi lần sửa backend phải restart tay.

---

## 3. Chạy frontend (user site + admin dashboard chung 1 project)

```bash
cd ../laptopworld-web
npm install       # lần đầu
npm run dev       # → http://localhost:5173
```
Vite proxy `/api` + `/uploads` → `localhost:8080` tự động.

- **User site:** http://localhost:5173/
- **Admin dashboard:** http://localhost:5173/admin/dang-nhap

---

## 4. Tài khoản test

| Tài khoản | Password | Vai trò | Ghi chú |
|-----------|----------|---------|---------|
| `admin` | `admin123` | ADMIN | Bypass mọi permission |
| `user1` | `admin123` | CUSTOMER | Có đơn hàng mẫu để test admin xem |
| `user2` | `admin123` | CUSTOMER | Đã đặt hàng, có review |

**Voucher mẫu:** `WELCOME500` (giảm 500K, đơn tối thiểu 5tr), `SALE10` (giảm 10% max 2tr).

---

## 5. Luồng demo phân quyền chi tiết (Sprint 9G-perm)

Backend seed 30 permission chia 4 nhóm (🔐 Hệ thống / 📦 Sản phẩm & Nội dung / 🏭 Kho & Vận chuyển / 🛒 Bán hàng & Khách hàng) + 3 role sẵn (ADMIN full 30, STAFF 11 cơ bản, CUSTOMER 0).

**Kịch bản demo cho hội đồng:**

1. **Login `admin`** → sidebar hiện đầy đủ 7 group emoji (📊 Dashboard / 📦 Sản phẩm / 🛒 Đơn hàng / 🏭 Kho / 📝 Nội dung / 🤖 AI / 🔐 Hệ thống).
2. **Vào `/admin/vai-tro`** → tạo role mới **"SALE"** tick 4 quyền: `access_admin`, `view_reports`, `view_orders`, `manage_orders`.
3. **Vào `/admin/nguoi-dung`** → sửa `user1` → gỡ role `CUSTOMER`, chọn role `SALE` → Lưu.
4. **Logout admin, login `user1`** → sidebar chỉ còn 2 group (📊 Dashboard + 🛒 Đơn hàng). Paste URL `/admin/san-pham` → hiện `ForbiddenPage`.
5. **user1 mở đơn cụ thể** → chuyển status (xác nhận → chuyển kho) → OK vì có `manage_orders`.
6. **Postman:** dùng token user1 gọi `POST /api/admin/products` → **403** với message tiếng Việt.

**Guardrails an toàn ADMIN:** không thể tự khóa mình, không thể tự gỡ role ADMIN của mình, không thể xóa role ADMIN cuối cùng.

---

## 6. Điểm nhấn AI (dùng cho báo cáo)

- **Semantic search** dùng Gemini `gemini-embedding-001` (768 dim) + pgvector HNSW.
- **Chat RAG** tại `/api/ai/chat/sessions/{id}/messages` — top-5 SP tương đồng nhồi vào system prompt.
- **Chat Agent** tại `/api/ai/chat/sessions/{id}/agent-messages` — Gemini gọi **5 tool**: `search_products`, `compare_products`, `recommend_by_budget`, `get_product_detail`, `get_my_orders` (login required).
- **ChatWidget** ở góc phải-dưới user site — voice input tiếng Việt (Web Speech API).
- Admin giám sát pipeline: `/admin/ai/embedding` (KPI + re-embed) + `/admin/ai/chat` (list session + xem bubble từng message với tokens + response time).

---

## 7. Postman

Import [ai-docs/LaptopWorld.postman_collection.json](ai-docs/LaptopWorld.postman_collection.json):

- **21 folder / 151 endpoint** — 10 folder user + 11 folder admin (11-21).
- Chạy `01. Auth → Login as admin` → token tự lưu vào `accessToken` collection variable.
- Các folder admin (11-21) tự dùng token đó.

---

## 8. Cấu trúc project

```
D:\FINALYEAR\GRADUATION\LaptopWorld_project\    ← git repo root
├── LaptopWorld_project\          ← Spring Boot backend
│   ├── ai-docs\                  (tài liệu — đọc trước khi làm)
│   ├── docker-compose.dev.yml    (Postgres pgvector cổng 5433)
│   ├── pom.xml
│   ├── uploads\                  (files admin upload — gitignored)
│   └── src\main\java\com\example\LaptopWorld_project\
│       ├── auth\        (JWT, login/register/refresh/reset)
│       ├── user\        (User, Role, Permission — quản lý user + role admin)
│       ├── catalog\     (Category, Brand, Product, Collection, Media)
│       ├── order\       (Cart, Order, Checkout — reserved_stock lock)
│       ├── voucher\
│       ├── review\
│       ├── inventory\   (Partner, GoodsReceipt/Issue — FIFO 5 status)
│       ├── banner\, blog\
│       ├── ai\          (Chat, Semantic search, Agent 5 tools, admin ops)
│       ├── admin\       (Dashboard 10 widget + user picker)
│       ├── common\, config\
│       └── config\SecurityConfig.java   (/api/admin/** = authenticated,
│                                         chi tiết ở @PreAuthorize từng endpoint)
│
└── laptopworld-web\              ← React + Vite (user site + admin gộp chung)
    ├── package.json
    ├── vite.config.ts            (proxy /api + /uploads → :8080)
    └── src\
        ├── stores\               (Zustand: auth + wishlist + compare + theme)
        ├── hooks\api\            (TanStack Query hooks)
        ├── components\ui\        (shadcn/ui copy-paste)
        ├── components\admin\     (AdminLayout + Sidebar + common primitives)
        └── pages\
            ├── auth\
            ├── admin\            (30+ trang admin)
            └── (user site pages — 26 route)
```

---

## 9. Migration + DB

19 Flyway migration V1-V19 (xem [ai-docs/database.md](ai-docs/database.md)):
- V1-V11: schema đầy đủ + indexes advanced
- V12-V15: seed roles/permissions + admin + 200 SP + 12 categories + 27 brands + inventory ảo bao trọn 200 SP
- V16-V19: preparing status, partner code, reserved_stock, cost_price, blog + banner seed
- V20: 30 permission mới + gán ADMIN full + STAFF 11 (Sprint 9G-perm)

Reset DB dev: `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d` (xóa volume + boot lại → Flyway tự chạy lại).

---

## 10. Lệnh hữu ích

| Lệnh | Ý nghĩa |
|---|---|
| `./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev,local"` | Chạy backend |
| `./mvnw compile` | Compile check nhanh |
| `./mvnw test` | Chạy unit test |
| `./mvnw clean package` | Build jar |
| `./mvnw flyway:info` | Xem trạng thái migration |
| `npm run dev` (trong `laptopworld-web/`) | Chạy frontend Vite dev server |
| `npx tsc --noEmit` (trong `laptopworld-web/`) | Type-check FE toàn project |
| `npm run build` (trong `laptopworld-web/`) | Build production FE |

---

## 11. Fix technical quan trọng đã tích lũy

Xem [ai-docs/overview.md](ai-docs/overview.md) section "Fix quan trọng" và [ai-docs/plan.md](ai-docs/plan.md) từng sprint.

Nổi bật:
- Java 25 clean compile: `-proc:full` compilerArg (Java 24+ tắt annotation processor mặc định).
- Race condition oversell: `V19 reserved_stock` + `@Lock(PESSIMISTIC_WRITE)` khi checkout.
- Filter cấp cao trong SecurityConfig `/api/admin/**` phải `.authenticated()` không phải `hasRole("ADMIN")` để `@PreAuthorize("hasAuthority(...)")` per-endpoint hoạt động.
- pgvector chưa map JPA sẵn → dùng JdbcTemplate + literal `?::vector`.
- Gemini `gemini-embedding-001` (768 dim) + `gemini-flash-latest` (alias tránh model deprecate nhanh).
