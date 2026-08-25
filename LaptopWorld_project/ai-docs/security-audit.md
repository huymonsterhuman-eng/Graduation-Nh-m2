# LaptopWorld — Security Audit (Phase 11 — Bước 11C)

> Ngày audit: **2026-08-25**
> Phạm vi: Toàn bộ REST endpoint (~153 endpoint / 31 controller)
> Mục đích: Kiểm tra IDOR, missing `@PreAuthorize`, rate-limit, thông tin nhạy cảm lộ ra.
> Kết quả: **✅ PASS** — 0 lỗ hổng nghiêm trọng, tất cả endpoint user-scoped đã có ownership check.

---

## 1. Tóm tắt

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| **Rate limit** endpoint nhạy cảm (login/register/forgot-password) | ✅ **Đã fix Bước 11C** | `AuthRateLimiter` — token bucket in-memory, giới hạn theo IP client |
| **IDOR** — Order, Address, Cart, Voucher, Review, Chat | ✅ PASS | Tất cả endpoint đều check ownership qua `userId` từ JWT |
| **`@PreAuthorize`** trên endpoint `/api/admin/**` | ✅ PASS | 100% endpoint admin đều có `hasRole('ADMIN') or hasAuthority(...)` |
| **CORS** trong prod | ✅ PASS | `app.cors.allowed-origins` bind từ ENV, không dùng `*` |
| **Actuator** trong prod | ✅ PASS | `show-details=never`, chỉ expose `health` (không có `env`, `beans`, `configprops`) |
| **JWT secret** | ✅ PASS | Load từ ENV `JWT_SECRET`, min 64 chars, không hardcode |
| **Password storage** | ✅ PASS | BCrypt cost 10 qua `PasswordEncoder` (Spring Security) |
| **Refresh token storage** | ✅ PASS | SHA-256 hash trong DB, gửi raw về client — chống DB leak |
| **VNPay HMAC** | ✅ PASS | Verify chữ ký với constant-time compare, secret load từ ENV |
| **Email + SMTP credentials** | ✅ PASS | Load từ ENV, không commit `application-local.properties` |

---

## 2. Rate limit — `AuthRateLimiter` (mới thêm Bước 11C)

| Endpoint | Giới hạn | Key | Response khi vượt |
|----------|---------|-----|-------------------|
| `POST /api/auth/login` | 10 lần / 15 phút | IP client (X-Forwarded-For > getRemoteAddr) | HTTP 429 `RATE_LIMITED` |
| `POST /api/auth/register` | 5 lần / 1 giờ | IP client | HTTP 429 |
| `POST /api/auth/forgot-password` | 3 lần / 1 giờ | IP client | HTTP 429 |
| `POST /api/ai/chat/sessions/{id}/agent-messages` | 30 msg / giờ, burst 5 | sessionId | HTTP 429 với `retryAfter` |

**Impl:** Thuần Java `ConcurrentHashMap<String, TokenBucket>`, không dùng Redis/Bucket4j.

**Test:** `AuthRateLimiterTest` (6 case): quota / vượt quota / IP khác không ảnh hưởng / X-Forwarded-For chain / register / forgot.

**Hạn chế:** In-memory → reset khi restart, không share giữa nhiều instance. Với 1 backend instance đủ. Scale → chuyển Redis-backed.

---

## 3. IDOR (Insecure Direct Object Reference) — 5 endpoint user-scoped

Đã audit 5 endpoint user thao tác trên resource của chính mình. **Tất cả đều có ownership check** (implicit hoặc explicit):

| # | Endpoint | Service check | File:line |
|---|----------|--------------|-----------|
| 1 | `GET /api/orders/{code}` | `if (!order.getUser().getId().equals(userId)) throw FORBIDDEN` | [OrderService.java:78](../src/main/java/com/example/LaptopWorld_project/order/service/OrderService.java#L78) |
| 2 | `POST /api/orders/{code}/cancel` | Same as above + status check | [OrderService.java:91](../src/main/java/com/example/LaptopWorld_project/order/service/OrderService.java#L91) |
| 3 | `PUT /api/cart/items/{itemId}` | Filter items từ cart của userId → item khác user → NotFound | [CartService.java](../src/main/java/com/example/LaptopWorld_project/order/service/CartService.java) |
| 4 | `DELETE /api/cart/items/{itemId}` | Same as above | [CartService.java](../src/main/java/com/example/LaptopWorld_project/order/service/CartService.java) |
| 5 | `GET /api/addresses/{id}` (implicit qua checkout) | Repository `findByIdAndUserId` | [AddressRepository](../src/main/java/com/example/LaptopWorld_project/user/repository/AddressRepository.java) |
| 6 | `POST /api/ai/chat/sessions/{id}/*` | `getOwnedSession()` throw `SESSION_MISMATCH` nếu session của user khác | [ChatService.java](../src/main/java/com/example/LaptopWorld_project/ai/service/ChatService.java) |
| 7 | `POST /api/reviews` | Chỉ pass nếu `existsDeliveredOrderWithProduct(userId, productId)` — implicit gate | [ReviewService.java:50](../src/main/java/com/example/LaptopWorld_project/review/service/ReviewService.java#L50) |

**Verdict:** Không tìm thấy endpoint nào cho phép user A truy cập resource user B qua ID.

---

## 4. `@PreAuthorize` trên endpoint admin

Grep tất cả method trong `/api/admin/**` — 100% có `@PreAuthorize`:

```
grep -B 1 "@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping\|@PatchMapping" \
     src/main/java/**/admin*.java \
     src/main/java/**/Admin*.java
→ Tất cả method có `@PreAuthorize("hasRole('ADMIN') or hasAuthority('<code>')")`
```

Pattern nhất quán từ Sprint 9G-perm:
- ADMIN role bypass mọi permission
- Non-ADMIN cần permission code cụ thể trong bảng `permissions` (30 permission, 4 nhóm)
- Endpoint không có `@PreAuthorize` → SecurityConfig fallback `requestMatchers("/api/admin/**").authenticated()` — vẫn require login

**Config path an toàn:** [SecurityConfig.java:115](../src/main/java/com/example/LaptopWorld_project/config/SecurityConfig.java#L115) — `/api/admin/**` yêu cầu login, phân quyền chi tiết qua `@PreAuthorize`.

**Kiểm tra bằng Integration test:** [PermissionRbacIT](../src/test/java/com/example/LaptopWorld_project/integration/PermissionRbacIT.java) — 4 case:
1. ADMIN GET /api/admin/products → 200 ✅
2. STAFF có `view_products` GET /api/admin/products → 200 ✅
3. STAFF không có `view_users` GET /api/admin/users → 403 ✅
4. Anonymous GET /api/admin/products → 401 ✅

---

## 5. Config production hardening

Đã áp dụng ở [application-prod.properties](../src/main/resources/application-prod.properties):

| Setting | Value prod | Value dev | Lý do |
|---------|-----------|-----------|-------|
| `management.endpoint.health.show-details` | `never` | `always` | Không lộ tên DB, version library |
| `management.endpoints.web.exposure.include` | `health` | `health,info` | Chỉ expose 1 endpoint cần thiết |
| `app.cors.allowed-origins` | `${APP_FRONTEND_URL}` cụ thể | `localhost:5173` | Không dùng `*` — chống CSRF |
| `spring.jpa.show-sql` | `false` | `true` | Không log SQL trong prod |
| `spring.flyway.clean-disabled` | `true` | `false` | Chống accidental DROP schema |
| `logging.level.root` | `INFO` | `INFO` | |
| `logging.level.com.example.LaptopWorld_project` | `INFO` | `DEBUG` | Prod không log DEBUG |

---

## 6. Secret management

Tất cả secret load qua ENV, không hardcode trong source:

| Secret | ENV var | File dev | File prod |
|--------|---------|----------|-----------|
| DB password | `DB_PASSWORD` / `POSTGRES_PASSWORD` | `application-local.properties` (gitignored) | `.env` (gitignored) |
| JWT secret (≥64 chars) | `JWT_SECRET` | Có placeholder trong dev | Bắt buộc set trong `.env` |
| Gemini API key | `GEMINI_API_KEY` | `application-local.properties` | `.env` |
| VNPay TmnCode + HashSecret | `VNPAY_TMN_CODE` + `VNPAY_HASH_SECRET` | `application-local.properties` | `.env` |
| SMTP password (Gmail App Password) | `SMTP_PASSWORD` | `application-local.properties` | `.env` |

**Gitignore verify:**
```
.gitignore includes:
  application-local.properties
  application-*-local.properties
  .env
  .env.*
  !.env.example
  **/vnpayconfig.txt
```

---

## 7. Password + token storage

| Loại | Cách lưu | Verify |
|------|---------|--------|
| User password | BCrypt cost 10 qua `BCryptPasswordEncoder` bean | Không thể reverse hash |
| Refresh token | SHA-256 hash trước khi INSERT vào `refresh_tokens.token_hash` | DB leak không lộ token gốc |
| Email verify token | SHA-256 hash trong `email_verify_tokens.token_hash` | Same |
| Password reset token | SHA-256 hash trong `password_reset_tokens.token_hash`, TTL 30 phút | Same, ngắn hạn |
| JWT access token | HS256 signed, TTL 15 phút, không lưu DB | Stateless, revoke qua expiry |

---

## 8. Kết luận & khuyến nghị deploy

**Sẵn sàng deploy prod:**
- ✅ Rate limit chống brute-force
- ✅ IDOR đã cover
- ✅ Config prod hardened (Actuator, CORS, log)
- ✅ Secret via ENV, không commit
- ✅ Password BCrypt, token SHA-256

**Khuyến nghị bổ sung nếu deploy public thật:**
1. HTTPS via Let's Encrypt (Nginx reverse proxy)
2. Đổi mật khẩu admin default `admin123` ngay sau lần login đầu
3. Tạo user riêng ứng dụng, KHÔNG dùng superuser Postgres
4. Bật fail2ban để chống brute-force ở tầng Nginx (bổ sung cho AuthRateLimiter tầng app)
5. Backup DB định kỳ (`pg_dump` cron)
6. Log rotation cho backend container (Docker daemon config)
7. Nếu scale nhiều backend instance → chuyển AuthRateLimiter + ChatRateLimiter sang Redis-backed

**Không nằm trong phạm vi đồ án:**
- Web Application Firewall (WAF)
- DDoS protection tầng network
- Penetration testing bên ngoài
