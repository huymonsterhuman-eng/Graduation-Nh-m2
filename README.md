# LaptopWorld — Full Stack - Nhóm 2

Đồ án tốt nghiệp: E-commerce Spring Boot 4 + React SPA tích hợp trợ lý AI Gemini (RAG + function calling).

Repo gộp backend + frontend:
- **Backend** (Spring Boot 4 + PostgreSQL pgvector): [`LaptopWorld_project/`](LaptopWorld_project/)
- **Frontend user + admin site** (Vite + React 19 + TypeScript): [`laptopworld-web/`](laptopworld-web/)

Tài liệu chi tiết: [`LaptopWorld_project/ai-docs/overview.md`](LaptopWorld_project/ai-docs/overview.md) · [`plan.md`](LaptopWorld_project/ai-docs/plan.md) · [`ai-design.md`](LaptopWorld_project/ai-docs/ai-design.md)

---

## 🚀 Chạy nhanh bằng Docker Compose (khuyến nghị)

Yêu cầu: **Docker Desktop** đã cài.

```bash
# 1. Copy env template và sửa các giá trị (JWT_SECRET, GEMINI_API_KEY, SMTP...)
cp .env.example .env
# → Mở .env sửa các dòng CHANGE_ME

# 2. Build + start toàn bộ stack (postgres + backend + frontend)
docker compose up -d --build

# 3. Truy cập
#   Frontend user site + admin:  http://localhost
#   Login admin:                  admin / admin123
```

**Xem log:** `docker compose logs -f`
**Dừng:** `docker compose down`
**Xoá hoàn toàn (mất data):** `docker compose down -v`

Container:
- `laptopworld_postgres` (pgvector/pgvector:pg16, internal only)
- `laptopworld_backend` (Spring Boot 4, JVM 21, chạy Flyway V1-V20 auto khi boot)
- `laptopworld_frontend` (Nginx 1.27, serve React build + reverse proxy `/api` + `/uploads` → backend)

Ảnh sản phẩm (`uploads/products/legacy/*.jpg`) được **bind mount** từ `./LaptopWorld_project/uploads/` — persist qua restart.

---

## 📦 Environment variables (.env)

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu DB Postgres |
| `JWT_SECRET` | ✅ | ≥ 64 ký tự. Sinh: `openssl rand -base64 64` |
| `APP_FRONTEND_URL` | | Default `http://localhost` — đổi khi deploy public |
| `GEMINI_API_KEY` | | Free tại https://aistudio.google.com/apikey — không có → chat AI tắt |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | | Sandbox tại https://sandbox.vnpayment.vn/devreg — không có → chỉ dùng COD |
| `VNPAY_RETURN_URL` | | Default `http://localhost/thanh-toan/vnpay/ket-qua` |
| `SMTP_HOST/PORT/USERNAME/PASSWORD` | | Gmail App Password https://myaccount.google.com/apppasswords |
| `MAIL_FROM` | | Địa chỉ gửi email verify + reset password |

⚠️ **Lưu ý VNPay IPN trong Docker:** VNPay không thể callback vào `localhost`. Với sandbox local, dùng dual-callback pattern (return URL + IPN cùng update DB, idempotency chống double). Test IPN live cần `ngrok` tunnel hoặc deploy public.

---

## 🧪 Test

### Unit + Integration tự động (JUnit)

```bash
cd LaptopWorld_project
./mvnw test
```

**57 test case:** 41 unit (Voucher, JWT, VNPay HMAC, ChatRateLimiter, AuthRateLimiter, Checkout, Inventory FIFO, AgentChat) + 16 integration Testcontainers (AuthFlow, OrderFlow, PermissionRbac, ReviewGate). Thời gian ~40s (đầu load Spring context ~30s, sau cache).

**Yêu cầu integration test:** Docker Desktop bật (Testcontainers auto khởi container `pgvector/pgvector:pg16`).

### Newman API test (Postman collection 151 endpoint)

Cần backend đang chạy ở `http://localhost` (Docker Compose) hoặc `http://localhost:8080` (dev). Sửa `baseUrl` trong `LaptopWorld_project/ai-docs/newman-env.json` cho khớp.

```bash
# Login admin trước, lấy accessToken, dán vào newman-env.json → key "accessToken"
# Sau đó chạy:
cd LaptopWorld_project/ai-docs
npx --yes -p newman -p newman-reporter-htmlextra newman run \
  LaptopWorld.postman_collection.json \
  -e newman-env.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export newman-report.html
```

Kết quả: `newman-report.html` (~3MB) — mở bằng browser xem full 151 request + response time.

---

## 🛠 Chạy dev (không Docker)

Xem chi tiết trong [`LaptopWorld_project/README.md`](LaptopWorld_project/README.md).

```bash
# Backend (cần Postgres đã bật ở port 5433)
cd LaptopWorld_project
docker compose -f docker-compose.dev.yml up -d
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev,local"
# → http://localhost:8080

# Frontend
cd ../laptopworld-web
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Cấu trúc repo

```
LaptopWorld_project/          ← Root repo git
├── docker-compose.yml         ← Full stack prod (Phase 11)
├── .env.example               ← Template env vars
├── LaptopWorld_project/       ← Backend Spring Boot 4
│   ├── Dockerfile
│   ├── docker-compose.dev.yml ← Chỉ Postgres cho dev
│   ├── ai-docs/               ← Docs (overview, plan, ai-design, testcases, vnpay-flow)
│   ├── src/main/java/         ← Code Java (auth, catalog, order, inventory, ai, payment...)
│   ├── src/main/resources/db/migration/  ← Flyway V1-V20
│   └── src/test/java/         ← 51 test case (35 unit + 16 integration)
└── laptopworld-web/           ← Frontend Vite + React 19
    ├── Dockerfile
    ├── nginx.conf             ← SPA fallback + reverse proxy
    └── src/                   ← Code TypeScript (50+ pages)
```
