# LaptopWorld — Bảng test case chuẩn bị hội đồng bảo vệ

> Ghi lại các kịch bản test end-to-end đã pass — dùng khi demo cho hội đồng hoặc smoke test trước khi nộp.
> Đánh dấu ✅ = đã pass trên UI thật, 🟡 = pass ở Postman, ⚪ = chưa test.

---

## 1. Kịch bản VNPay Payment (Phase 10)

### Setup
- Backend chạy `--spring.profiles.active=dev,local` với `application-local.properties` có `app.payment.vnpay.tmn-code` + `hash-secret` từ email VNPay.
- Frontend chạy `npm run dev` (Vite proxy sang backend).
- Login `user1/admin123` → đặt sẵn 1 địa chỉ + có SP trong giỏ.

### TC-VNPAY-01: Happy path — thanh toán thành công ✅
| Bước | Hành động | Kết quả kỳ vọng |
|------|-----------|-----------------|
| 1 | `/gio-hang` → `/dat-hang` → chọn "VNPay — Thẻ ATM/QR/Visa" → bấm Đặt hàng | Toast "Đang chuyển sang cổng VNPay..." + browser redirect sang `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...` |
| 2 | Chọn "Thẻ nội địa và tài khoản ngân hàng" | Form nhập thẻ |
| 3 | Nhập NCB / `9704198526191432198` / `NGUYEN VAN A` / `07/15` / OTP `123456` | VNPay xử lý → redirect `/thanh-toan/vnpay/ket-qua?vnp_...` |
| 4 | Xem `VnpayReturnPage` | Card emerald "Thanh toán thành công" + mã đơn + số tiền + mã GD VNPay + badge HMAC hợp lệ |
| 5 | Vào `/tai-khoan/don-hang/:code` | Trạng thái "✓ Đã thanh toán" xanh + mã GD + ngày TT |
| 6 | Login admin → `/admin/don-hang/:id` | Card "Thanh toán" aside có Badge paid + mã GD copy được |

**Backend log kỳ vọng:**
```
VNPay return: order=ORD-... responseCode=00 status=00 checksumOk=true
VNPay update: order ORD-... marked PAID (transactionNo=...)
```

### TC-VNPAY-02: Failed — user hủy trên cổng VNPay ✅
| Bước | Hành động | Kết quả kỳ vọng |
|------|-----------|-----------------|
| 1 | Chọn VNPay checkout, sang trang VNPay | Trang chọn phương thức |
| 2 | Bấm "Quay lại" (top-left) | VNPay redirect về `/thanh-toan/vnpay/ket-qua` với `vnp_ResponseCode=24` (user canceled) |
| 3 | Xem VnpayReturnPage | Card rose "Thanh toán không thành công" + code 24 |
| 4 | Order detail | Status "Chưa thanh toán" (không đổi), transactionRef được log |

### TC-VNPAY-03: Amount tampered — chống giả mạo 🟡 (Postman)
| Bước | Hành động | Kết quả kỳ vọng |
|------|-----------|-----------------|
| 1 | Copy paymentUrl từ checkout response | URL có `vnp_Amount=...` và `vnp_SecureHash=...` |
| 2 | Sửa `vnp_Amount` thành số khác (VD giảm 90%) mà không đổi hash | URL bị tampered |
| 3 | Paste URL vào browser → VNPay sẽ báo checksum invalid, không xử lý | VNPay chặn ở gateway |
| 4 | Giả sử VNPay không chặn: sửa cả amount trong callback → backend `/return` phải trả `checksumValid=false` | VnpayReturnPage hiện card **rose "Chữ ký giao dịch không hợp lệ"** với ShieldAlert |

**Log kỳ vọng:** `VNPay verify FAILED — expected xxx, received yyy`

### TC-VNPAY-04: Duplicate return (F5 lại nhiều lần) ✅
| Bước | Hành động | Kết quả kỳ vọng |
|------|-----------|-----------------|
| 1 | Thanh toán thành công, VnpayReturnPage hiện | Card emerald |
| 2 | F5 trang → gọi lại `/api/payments/vnpay/return` cùng query | Vẫn thấy card emerald, `dbAction=already_paid` |
| 3 | Kiểm tra DB `orders.paid_at` | Không bị overwrite, giá trị lần đầu |

**Log kỳ vọng:** `VNPay update: order ORD-... already paid — idempotent OK`

### TC-VNPAY-05: HMAC-SHA512 correctness verify 🟡
| Bước | Hành động | Kết quả kỳ vọng |
|------|-----------|-----------------|
| 1 | Postman: `POST /api/checkout` body có `paymentMethod=vnpay` | Response `{order, paymentUrl}` |
| 2 | Parse paymentUrl bằng script tay: extract từng field trừ `vnp_SecureHash` | List params đã URL-encode |
| 3 | Sort key alphabet + build `k=v&k=v` + HMAC-SHA512 với hashSecret | Hash tính tay |
| 4 | So sánh với `vnp_SecureHash` trong URL | Phải trùng nhau (verify code build URL đúng chuẩn) |

---

## 2. Kịch bản Phân quyền (Sprint 9G-perm + 9G) — 21 case ✅

Đã user tự chạy pass 2026-08-24 trên UI thật. Tham chiếu chi tiết ở [plan.md](plan.md) Sprint 9G Bước E.

### Kịch bản 1 — Phân quyền cơ bản (10 case)
1. Login ADMIN → sidebar hiện 7 group ✅
2. `/admin/vai-tro` → 3 role seed đúng counts ✅
3. Tạo role "SALE" tick quyền `access_admin`, `view_reports`, `view_orders`, `manage_orders` ✅
4. Sửa user1 → gỡ CUSTOMER, chọn SALE ✅
5. Login user1 → sidebar chỉ hiện 📊 Dashboard + 🛒 Đơn hàng ✅
6. user1 mở `/admin/don-hang` → thấy list ✅
7. user1 chuyển status đơn → OK ✅
8. user1 paste `/admin/san-pham` → `ForbiddenPage` ✅
9. Postman user1 token: `GET /api/admin/products` → 403 message VN ✅
10. Postman: `GET /api/admin/orders` → 200, `POST /api/admin/products` → 403 ✅

### Kịch bản 2 — Users management (5 case)
1. ADMIN xem detail user1 → hiển thị đúng orderCount + reviewCount + totalSpent ✅
2. Ban user1 → user1 login → toast "Tài khoản bị khóa" ✅
3. Mở lại user1 → login OK ✅
4. Ban chính admin → 400 `CANNOT_BAN_SELF` ✅
5. Gỡ toàn bộ role admin của chính mình → 400 `CANNOT_REMOVE_OWN_ADMIN` ✅

### Kịch bản 3 — AI ops (3 case)
1. `/admin/ai/embedding` "Embed SP mới" → stats update, coverage% tăng ✅
2. `/admin/ai/chat` filter Guest → chỉ session không có user ✅
3. Xem detail 1 session → bubble user/assistant/tool/system 4 màu ✅

### Kịch bản 4 — ADMIN guardrails (3 case)
1. Xóa role ADMIN → 400 `ADMIN_ROLE_LOCKED` ✅
2. Đổi tên ADMIN → 400 ✅
3. Bỏ tick permission trong form Sửa ADMIN → checkboxes disabled, backend im lặng bỏ qua ✅

---

## 3. Kịch bản Inventory FIFO (Sprint 9E) — 7 case ✅

Đã pass end-to-end trước đó. Tham chiếu ở [plan.md](plan.md) Phase 6 Sprint 6D.

1. `confirmed→preparing` tự tạo phiếu pending + stub, kho chưa đụng, `preparing_at` set ✅
2. Kho approve phiếu auto → FIFO trừ batch cũ trước (COGS chuẩn), order tự sang `shipping` ✅
3. Kho reject phiếu → cancelled + note append, order về `confirmed`, kho nguyên ✅
4. Cancel order ở `preparing` → phiếu pending → cancelled, kho không hoàn ✅
5. Cancel order ở `shipping` → hoàn kho đúng batch, issue cancelled ✅
6. Manual issue → approve → FIFO trừ đúng, COGS chuẩn ✅
7. Manual issue → reject → cancelled, kho nguyên ✅

---

## 4. Kịch bản Race Condition Oversell (Sprint 9E) — 1 case ✅

Đã test trước khi có `reserved_stock`:
- SP còn 1, 2 khách checkout đồng thời → cả 2 pass (oversell).

Sau khi có `V19 reserved_stock` + `@Lock(PESSIMISTIC_WRITE)` trên `Product.findByIdForUpdate`:
- Khách A checkout trước, `reservedStock++`
- Khách B checkout → `availableStock = stock - reserved = 0` → chặn `INSUFFICIENT_STOCK` ✅

---

## 5. Kịch bản AI (Phase 5) — smoke test ✅

- Semantic search: gõ "laptop gaming asus" → trả top-5 SP có similarity % ✅
- Chat RAG: hỏi "SP nào phù hợp làm việc văn phòng dưới 20 triệu?" → Gemini gọi tool `recommend_by_budget` → trả list SP cite được ✅
- Chat Agent 5 tools: hỏi so sánh 2 SP → gọi `compare_products` → so sánh spec ✅
- Voice input: bấm mic → nói "tìm iphone" → autofill input ✅

---

## Test case bổ sung (Phase 11 — 2026-08-25)

Bảng dưới được mở rộng cho toàn bộ nghiệp vụ chính, phục vụ chương "Kiểm thử" trong báo cáo tốt nghiệp.

### Auth (TC-AUTH)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| AUTH-01 | Register OK | username hợp lệ, email chưa tồn tại, password ≥ 8 ký tự | 200 + gửi email verify | ✅ |
| AUTH-02 | Register email trùng | email đã tồn tại | 400 `USER_EXISTS` | ✅ |
| AUTH-03 | Register username sai regex | username = "abc@def" | 400 validation error | ✅ |
| AUTH-04 | Verify email token hợp lệ | token còn hạn | 200 + `emailVerifiedAt` set | ✅ |
| AUTH-05 | Verify email token hết hạn | token > 24h | 400 `TOKEN_EXPIRED` | ✅ |
| AUTH-06 | Login user chưa verify | user tồn tại nhưng `emailVerifiedAt = null` | 401 `EMAIL_NOT_VERIFIED` | ✅ |
| AUTH-07 | Login sai password | password không khớp BCrypt | 401 `INVALID_CREDENTIALS` | ✅ |
| AUTH-08 | Login user status=banned | `status = 'banned'` | 401 `ACCOUNT_BANNED` | ✅ |
| AUTH-09 | Refresh token hợp lệ | refresh token còn hạn + chưa revoke | 200 + access token mới | ✅ |
| AUTH-10 | Refresh token đã revoke | logout xong rồi refresh | 401 `REFRESH_INVALID` | ✅ |
| AUTH-11 | Forgot password → reset OK | request → nhận token → reset | 200 + password đổi + all refresh tokens revoked | ✅ |
| AUTH-12 | Reset token dùng lại | dùng token 2 lần | 400 `TOKEN_USED` | ✅ |
| AUTH-13 | **Rate limit login** — 11 lần liên tiếp | 11 request `/api/auth/login` từ 1 IP trong 15 phút | 429 `RATE_LIMITED` với message VN | ✅ |
| AUTH-14 | **Rate limit register** — 6 lần liên tiếp | 6 request `/api/auth/register` từ 1 IP trong 1h | 429 `RATE_LIMITED` | ✅ |
| AUTH-15 | **Rate limit forgot-password** — 4 lần liên tiếp | 4 request từ 1 IP trong 1h | 429 `RATE_LIMITED` | ✅ |

### Catalog (TC-CAT)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| CAT-01 | List filter category + brand | category=laptop, brand=asus | 200 + array SP đúng filter | ✅ |
| CAT-02 | List filter price range | priceMin=10tr, priceMax=20tr | 200 + SP trong khoảng | ✅ |
| CAT-03 | Detail by slug | slug hợp lệ | 200 + full spec + rating | ✅ |
| CAT-04 | Detail slug không tồn tại | slug fake | 404 `Product not found` | ✅ |
| CAT-05 | Search fulltext tiếng Việt | keyword="máy tính chơi game" | 200 + relevance ranked | ✅ |
| CAT-06 | Sort giá tăng | sort=price,asc | Array sort đúng | ✅ |
| CAT-07 | Related products | productId=1 | Top 4-8 SP cùng category | ✅ |
| CAT-08 | Filter stockStatus=OUT_OF_STOCK | admin filter | Chỉ SP `stock=0` | ✅ |

### Cart + Checkout (TC-CART)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| CART-01 | Add to cart | productId, qty=2 | 200 + cart có item | ✅ |
| CART-02 | Update qty | qty=5 | Cart update, subtotal đúng | ✅ |
| CART-03 | Remove item | itemId | Item bị xoá | ✅ |
| CART-04 | Add item vượt tồn kho | qty > availableStock | 400 `INSUFFICIENT_STOCK` | ✅ |
| CART-05 | Apply voucher preview | code=WELCOME10, subtotal=1tr | 200 + discount=100k | ✅ |
| CART-06 | Apply voucher không đủ min-order | FLASH50K min 500k, subtotal 300k | 400 `VOUCHER_INVALID` | ✅ |
| CART-07 | Checkout OK COD | address + payment=cod | 200 + order status=pending + paymentUrl=null | ✅ |
| CART-08 | Checkout OK VNPay | payment=vnpay | 200 + paymentUrl là URL VNPay sandbox | ✅ |
| CART-09 | Checkout cart rỗng | cart.items empty | 400 `EMPTY_CART` | ✅ |
| CART-10 | Checkout snapshot productName + price | Đổi giá SP sau checkout | order_detail giữ giá cũ | ✅ |

### Order FIFO (TC-ORDER)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| ORDER-01 | Transition pending → confirmed | admin xác nhận | Status update OK | ✅ |
| ORDER-02 | Transition confirmed → preparing | admin chuyển kho | Auto tạo goods_issue pending + set `preparing_at` | ✅ |
| ORDER-03 | Admin approve issue → shipping | kho duyệt phiếu + chọn ĐVVC | FIFO trừ batch cũ trước, order sang shipping + tracking auto-gen | ✅ |
| ORDER-04 | Admin reject issue → rollback | kho từ chối phiếu | Phiếu cancelled, order về confirmed, kho không đụng | ✅ |
| ORDER-05 | Cancel order ở preparing | user hủy khi chưa duyệt | Phiếu pending → cancelled, kho không hoàn (chưa trừ) | ✅ |
| ORDER-06 | Cancel order ở shipping | admin hủy sau khi đã trừ kho | Hoàn kho về đúng batch, issue → cancelled | ✅ |
| ORDER-07 | Manual issue → approve | admin tạo phiếu xuất manual | FIFO trừ đúng, COGS tính chuẩn | ✅ |
| ORDER-08 | Manual issue → reject | admin reject phiếu | Cancelled, kho nguyên | ✅ |
| ORDER-09 | Auto tracking format | approve auto issue | Tracking match regex `[A-Z]+\d{6}\d{5}` | ✅ |
| ORDER-10 | Race condition oversell | 2 checkout song song SP còn 1 | 1 pass, 1 fail `INSUFFICIENT_STOCK` | ✅ |

### Review gate (TC-REV)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| REV-01 | User chưa mua post review | userId chưa có order SP | 400 `NOT_PURCHASED` | ✅ |
| REV-02 | User có order shipping | order.status = shipping | 400 `NOT_PURCHASED` (chỉ delivered mới OK) | ✅ |
| REV-03 | User có order delivered | order.status = delivered | 201 OK + review lưu vào DB | ✅ |
| REV-04 | Review trùng | user đã review SP này rồi | 400 `ALREADY_REVIEWED` | ✅ |
| REV-05 | Admin hide review | isHidden=true | Public không thấy nữa | ✅ |

### Voucher (TC-VOU)

| # | Chức năng | Input | Expected | Status |
|---|-----------|-------|----------|--------|
| VOU-01 | Fixed voucher — subtotal đủ | FLASH50K, subtotal=1tr | discount=50k | ✅ |
| VOU-02 | Percent voucher — max cap | NEWUSER15 (max 200k), subtotal=10tr | discount=200k (không phải 1.5tr) | ✅ |
| VOU-03 | Percent voucher — không cap | subtotal thấp | discount tính đúng % | ✅ |
| VOU-04 | Voucher hết hạn | expiresAt < now | 400 `VOUCHER_INVALID` | ✅ |
| VOU-05 | Voucher hết lượt | usedCount ≥ usageLimit | 400 `VOUCHER_INVALID` | ✅ |
| VOU-06 | Voucher chưa mở | startedAt > now | 400 `VOUCHER_INVALID` | ✅ |
| VOU-07 | Refund khi cancel order | cancel order dùng voucher | usedCount giảm 1 | ✅ |

---

## Tổng kết

| Module | Số case | Đã pass |
|--------|---------|---------|
| VNPay Payment | 5 | 3 ✅ + 2 🟡 |
| Phân quyền + Users | 21 | 21 ✅ |
| Inventory FIFO | 7 | 7 ✅ |
| Race condition | 1 | 1 ✅ |
| AI layer | 4 | 4 ✅ |
| **Auth (mới)** | **15** | **15 ✅** |
| **Catalog (mới)** | **8** | **8 ✅** |
| **Cart + Checkout (mới)** | **10** | **10 ✅** |
| **Order FIFO chi tiết (mới)** | **10** | **10 ✅** |
| **Review gate (mới)** | **5** | **5 ✅** |
| **Voucher (mới)** | **7** | **7 ✅** |
| **Tổng** | **93** | **91 ✅ + 2 🟡** |

## Test tự động

Ngoài 93 test case thủ công trên, dự án có **57 test tự động** chạy được bằng `./mvnw test` (~40 giây):
- **41 unit test** (Voucher, Jwt, Vnpay, ChatRateLimiter, AuthRateLimiter, Checkout, Inventory, AgentChat)
- **16 integration test** (Testcontainers pgvector) — AuthFlow, OrderFlow, PermissionRbac, ReviewGate

**Newman API test:** Postman collection [`LaptopWorld.postman_collection.json`](LaptopWorld.postman_collection.json) 21 folder / 151 endpoint chạy được bằng `npx newman run` — xuất HTML report [`newman-report.html`](newman-report.html).

**Cần chạy lại trước khi bảo vệ đồ án:** toàn bộ TC-VNPAY (đảm bảo credentials còn hoạt động) + Kịch bản 1 phân quyền (demo trực tiếp cho hội đồng).
