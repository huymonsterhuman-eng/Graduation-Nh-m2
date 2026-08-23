# LaptopWorld

E-commerce Spring Boot + PostgreSQL + React tích hợp trợ lý AI (Gemini) — đồ án tốt nghiệp.

Chi tiết: [ai-docs/overview.md](ai-docs/overview.md) · Kế hoạch: [ai-docs/plan.md](ai-docs/plan.md)

---

## Yêu cầu hệ thống

- **JDK 21** (LTS)
- **Maven 3.9+** (hoặc dùng wrapper `./mvnw`)
- **PostgreSQL 15+** với extension **pgvector**
- **Node.js 20+** (cho frontend, sẽ có ở Phase 8)

---

## Setup lần đầu (Phase 0)

### 1. Cài PostgreSQL + pgvector
Xem hướng dẫn chi tiết tại [ai-docs/setup-postgres-windows.md](ai-docs/setup-postgres-windows.md).

Tóm tắt:
1. Đã có PostgreSQL local + pgAdmin4.
2. Cài extension `vector` (pgvector).
3. Tạo database `laptopworld_dev` (đã có).
4. Tạo user riêng cho app:
   ```sql
   CREATE USER laptopworld_app WITH PASSWORD 'your_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE laptopworld_dev TO laptopworld_app;
   \c laptopworld_dev
   GRANT ALL ON SCHEMA public TO laptopworld_app;
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 2. Config secret local
Tạo file `src/main/resources/application-local.properties` (đã gitignore):
```properties
spring.datasource.password=your_strong_password
app.jwt.secret=<64-byte-random-string>
app.ai.gemini.api-key=<your-gemini-api-key>
```
Rồi kích hoạt profile khi chạy: `--spring.profiles.active=dev,local`.

**Hoặc** dùng biến môi trường (PowerShell):
```powershell
$env:DB_PASSWORD = "your_strong_password"
$env:JWT_SECRET  = "your-64-byte-random-string"
$env:GEMINI_API_KEY = "your-gemini-api-key"
```

### 3. Chạy app
```bash
./mvnw spring-boot:run
```
Kiểm tra:
- Health: http://localhost:8080/actuator/health → `{"status":"UP"}`
- Swagger UI: http://localhost:8080/swagger-ui.html

---

## Cấu trúc project

```
src/main/java/com/example/LaptopWorld_project/
├── LaptopWorldProjectApplication.java  (entry point)
├── config/       (Security, CORS, OpenAPI, Gemini config)   — Phase 2+
├── common/       (BaseEntity, ApiResponse, exception)        — Phase 2
├── auth/         (JWT, register/login)                        — Phase 2
├── user/         (User, Role, Permission)                     — Phase 2
├── catalog/      (Category, Brand, Product, ProductImage)     — Phase 3
├── cart/         (Cart, CartItem)                              — Phase 4
├── order/        (Order, OrderDetail, Checkout)                — Phase 4
├── voucher/      (Voucher, UserVoucher)                        — Phase 4
├── review/                                                     — Phase 7
├── inventory/    (GoodsReceipt, GoodsIssue, FIFO)              — Phase 6
├── payment/      (VNPay, MoMo)                                 — Phase 10
├── media/        (upload)                                       — Phase 3
└── ai/           (Chatbot Gemini + RAG + pgvector)             — Phase 5

src/main/resources/
├── application.properties           (common)
├── application-dev.properties        (dev)
├── application-local.properties      (LOCAL SECRETS — gitignored)
└── db/migration/                     (Flyway SQL — Phase 1)
```

---

## Lệnh hữu ích

| Lệnh | Ý nghĩa |
|---|---|
| `./mvnw spring-boot:run` | Chạy dev |
| `./mvnw test` | Chạy test |
| `./mvnw clean package` | Build jar |
| `./mvnw flyway:migrate` | Chạy migration DB thủ công |
| `./mvnw flyway:info` | Xem trạng thái migration |
| `./mvnw flyway:clean` | Xóa toàn bộ schema (cẩn thận!) |
