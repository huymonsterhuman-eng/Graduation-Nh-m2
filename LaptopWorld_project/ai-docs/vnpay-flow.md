# LaptopWorld — Thiết kế Payment layer (VNPay integration)

> Tài liệu này giải thích kiến trúc module thanh toán VNPay của LaptopWorld — dùng nguyên bộ cho báo cáo đồ án Phase 10.

---

## 1. Tổng quan

LaptopWorld tích hợp **VNPay sandbox** làm phương thức thanh toán online duy nhất (bên cạnh COD mặc định). VNPay là cổng thanh toán phổ biến nhất Việt Nam, hỗ trợ ~40 ngân hàng nội địa + Visa/Mastercard/JCB/QR ví điện tử — phù hợp với đối tượng khách hàng của một e-commerce Việt.

**Phạm vi Phase 10:**
- Thanh toán 1-chiều: khách chọn VNPay → chuyển sang cổng → thanh toán → về lại LaptopWorld.
- Không hỗ trợ: refund tự động (chỉ ghi nhận thủ công), partial payment, retry giao dịch failed.
- Sandbox: test bằng thẻ ảo NCB `9704198526191432198` OTP `123456`.

**Điểm nhấn kỹ thuật:**
- **HMAC-SHA512** ký checksum toàn bộ query — chống giả mạo URL.
- **Dual callback** (`/return` + `/ipn`) với idempotency đảm bảo update DB đúng 1 lần.
- **Amount verify** ở callback — chống khách sửa `vnp_Amount` để trả ít hơn.
- **Pessimistic lock** ở checkout đảm bảo `reserved_stock` không oversell (kế thừa từ Sprint 9E).

---

## 2. Kiến trúc luồng dữ liệu

```
┌─────────┐  1. POST /api/checkout          ┌──────────────┐
│  KHÁCH  │ ─────────────────────────────►  │   BACKEND    │
│(browser)│    {paymentMethod: "vnpay"}     │ Spring Boot  │
└─────────┘                                  └──────┬───────┘
     ▲                                              │
     │                                              │ 2. Save Order (status=pending, paymentStatus=unpaid)
     │                                              │    + build paymentUrl (HMAC-SHA512)
     │                                              ▼
     │  3. Response: {order, paymentUrl}    ┌──────────────┐
     └───────────────────────────────────── │  PostgreSQL  │
                                             └──────────────┘
     ▼ 4. window.location.href = paymentUrl
┌─────────────────────────────────────────┐
│  https://sandbox.vnpayment.vn/          │
│  paymentv2/vpcpay.html?vnp_...          │
│                                         │
│  [Chọn NH → Nhập thẻ → OTP]             │
└──────────┬──────────────────────────────┘
           │
           │ 5. Redirect return URL với query đã ký HMAC
           ▼
   http://localhost:5173/thanh-toan/vnpay/ket-qua?vnp_ResponseCode=00&...&vnp_SecureHash=xxx
           │
           │ 6. FE gọi GET /api/payments/vnpay/return (forward query)
           ▼
   ┌──────────────────────┐
   │ VnpayCallbackController │
   │  - verifyChecksum()   │  ── verify hash
   │  - updateOrderIfValid │  ── verify amount + idempotency + update DB
   └──────────────────────┘
           │
           │ 7. Response JSON {success, checksumValid, dbAction, ...}
           ▼
   ┌──────────────────────┐
   │ VnpayReturnPage      │
   │  hiển thị card       │
   │  emerald/rose        │
   │  + invalidate cache  │
   └──────────────────────┘

(Song song, khi deploy public):
   VNPay server ──► GET /api/payments/vnpay/ipn (server-to-server, không qua browser)
                    Cùng logic updateOrderIfValid → update DB
                    Trả về {"RspCode": "00", "Message": "Confirm success"}
```

---

## 3. Chi tiết các thành phần

### 3.1. `VnpayProperties` — cấu hình

Load từ `application-local.properties` (gitignored) qua `@ConfigurationProperties("app.payment.vnpay")`:

| Field | Ý nghĩa |
|-------|---------|
| `tmnCode` | Mã website merchant do VNPay cấp (7 ký tự) |
| `hashSecret` | Secret key HMAC-SHA512 (32+ ký tự) — **không commit** |
| `payUrl` | Sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `returnUrl` | FE nhận query: `http://localhost:5173/thanh-toan/vnpay/ket-qua` |
| `version`, `command`, `currCode`, `locale`, `orderType` | Constants VNPay yêu cầu (2.1.0 / pay / VND / vn / 250000) |

### 3.2. `VnpayService.createPaymentUrl(order, clientIp)`

Build URL redirect khách sang VNPay:

1. **Tạo TreeMap params** (auto-sort key theo alphabet — bắt buộc để hash reproducible):
   - `vnp_Version`, `vnp_Command`, `vnp_TmnCode`, `vnp_Amount`, `vnp_CurrCode`
   - `vnp_TxnRef` = `order.code` (dùng để lookup lại khi callback)
   - `vnp_OrderInfo`, `vnp_OrderType`, `vnp_Locale`
   - `vnp_ReturnUrl`, `vnp_IpAddr`
   - `vnp_CreateDate` + `vnp_ExpireDate` (`yyyyMMddHHmmss` theo múi giờ VN)

2. **Tính `vnp_Amount`**: đơn vị VNPay lưu là "xu" — nhân số tiền VND với 100. Ví dụ 15.000₫ → `vnp_Amount=1500000`.

3. **Build hashData**: iterate TreeMap, `key=urlEncodedValue`, join bằng `&`. **URL-encode US_ASCII** (không phải UTF-8) để khớp chuẩn VNPay.

4. **HMAC-SHA512**: `Mac.getInstance("HmacSHA512")` + `SecretKeySpec(hashSecret)` → hex lowercase.

5. **Gắn `vnp_SecureHash`** vào TreeMap → build query cuối cùng → concat với `payUrl`.

### 3.3. `VnpayCallbackController` — dual callback pattern

Cả 2 endpoint đều `public` (SecurityConfig cho phép `GET /api/payments/vnpay/**` bypass JWT) vì VNPay không gửi token. **Anti-tamper handle bằng HMAC verify.**

#### `/return` — browser gọi khi khách quay về

```java
@GetMapping("/return") @Transactional
public ApiResponse<Map<String,Object>> returnUrl(HttpServletRequest req) {
    Map<String,String> params = extractParams(req);
    boolean checksumOk = vnpayService.verifyChecksum(params);
    boolean success = checksumOk && "00".equals(responseCode) && "00".equals(transactionStatus);
    if (success) {
        try { updateOrderIfValid(params); }
        catch (Exception e) { /* best-effort, không phá UI */ }
    }
    return ApiResponse.ok(..., data);  // trả JSON cho FE hiển thị
}
```

#### `/ipn` — VNPay server-to-server

```java
@GetMapping("/ipn") @Transactional
public Map<String,String> ipn(HttpServletRequest req) {
    try {
        String result = updateOrderIfValid(extractParams(req));
        return ipnResponse("00", "Confirm success");   // format VNPay yêu cầu
    } catch (CallbackException e) {
        return ipnResponse(e.code, e.getMessage());     // "97", "01", "04"
    }
}
```

#### Helper `updateOrderIfValid(params)` — dùng chung

Chuỗi verify 5 bước:
1. **HMAC verify** — nếu fail throw `CallbackException("97", "Invalid checksum")`.
2. **Lookup order** theo `vnp_TxnRef` — không tồn tại throw `("01", "Order not found")`.
3. **Amount verify** — tính lại `expectedX100 = order.total × 100`, so với `vnp_Amount`. Sai throw `("04", "Invalid amount")` → **chống khách sửa amount**.
4. **Idempotency** — nếu `paymentStatus == paid` return `"already_paid"` không update.
5. **Update DB** nếu `responseCode=00 && transactionStatus=00`: set `paymentStatus=paid`, `paymentTransactionRef=vnp_TransactionNo`, `paidAt=now()`.

### 3.4. Vì sao `/return` cũng update DB (không chỉ chờ IPN)

**Chuẩn best-practice của VNPay** yêu cầu update DB **chỉ** ở IPN (server-to-server) vì browser có thể đóng, mất mạng, refresh nhiều lần. Nhưng khi **dev localhost**, VNPay không truy cập được `http://localhost:8080` → IPN không tới → order mãi `unpaid`.

**Giải pháp:** `/return` cũng update DB (fallback), `/ipn` giữ nguyên. Nhờ **idempotency** ở helper, cả 2 đường có thể chạy song song mà không double-update:
- **Dev local:** chỉ `/return` chạy được → update DB.
- **Deploy public** (ngrok / VPS): IPN đến trước vì server-to-server nhanh hơn browser redirect → update DB. `/return` chạy sau → `paymentStatus=paid` rồi → skip.

Trade-off được chấp nhận vì **HMAC verify + amount verify** đảm bảo cả 2 đường đều an toàn khỏi giả mạo.

---

## 4. Bảo mật

### 4.1. HMAC-SHA512 checksum
Toàn bộ query VNPay ↔ merchant đều ký với `hashSecret` shared secret. Attacker không có secret → không tạo được URL fake nào backend chấp nhận.

### 4.2. Amount verify
Attacker có thể copy URL từ transaction thật, sửa `vnp_Amount` mong "trả 1000đ mua laptop 15tr". Backend lookup order theo `vnp_TxnRef` → so `order.total × 100` với `vnp_Amount` → khác → reject. Kết hợp HMAC verify (attacker không ký được URL mới) → 2 lớp phòng thủ.

### 4.3. Idempotency
- Duplicate `/ipn` (VNPay retry khi timeout) → skip lần 2 nhờ check `paymentStatus == paid`.
- User F5 trang `VnpayReturnPage` → `/return` chạy lại → skip.
- Cả `/return` + `/ipn` cùng đến → chỉ 1 cái update thành công.

### 4.4. Secret storage
- `hashSecret` **không commit git** — đặt trong `application-local.properties` (gitignored).
- File email VNPay `vnpayconfig.txt` cũng ignored qua `**/vnpayconfig.txt` trong `.gitignore`.
- Deploy production: dùng env var `VNPAY_HASH_SECRET`.

---

## 5. Data model

### `orders` (bảng đã có, thêm 2 cột V21)
```sql
ALTER TABLE orders
    ADD COLUMN payment_transaction_ref VARCHAR(50),   -- vnp_TransactionNo
    ADD COLUMN paid_at TIMESTAMPTZ;                    -- thời điểm update DB

CREATE INDEX idx_orders_payment_transaction_ref
    ON orders(payment_transaction_ref)
    WHERE payment_transaction_ref IS NOT NULL;         -- partial index
```

Không tạo bảng `payment_transactions` riêng vì đồ án không hỗ trợ retry / partial — mỗi order chỉ có 1 giao dịch VNPay hợp lệ (nếu thất bại, khách phải hủy đơn tạo mới).

### Enum `PaymentStatus`
`unpaid` (mặc định) → `paid` (VNPay OK) → `refunded` (thủ công, chưa implement).

---

## 6. Kiểm thử

Xem chi tiết ở [testcases.md](testcases.md) — mục "1. Kịch bản VNPay Payment":
- TC-VNPAY-01: Happy path (thẻ NCB) ✅
- TC-VNPAY-02: User cancel (`vnp_ResponseCode=24`) ✅
- TC-VNPAY-03: Amount tampered — HMAC chặn ✅
- TC-VNPAY-04: Duplicate return F5 — idempotency ✅
- TC-VNPAY-05: HMAC-SHA512 correctness verify 🟡

---

## 7. Roadmap cải tiến (out of scope Phase 10)

- **Refund API** — gọi VNPay `refund` endpoint để hoàn tiền tự động khi admin hủy đơn đã paid.
- **Retry giao dịch failed** — cho phép khách tạo payment URL mới cho đơn `unpaid` (hiện tại phải hủy đơn tạo mới).
- **QR ví điện tử** — MoMo / ZaloPay tương tự flow VNPay.
- **Webhook signature v2** — VNPay có API version 2.1.1 với format ký khác, sẽ cần khi VNPay deprecate 2.1.0.
- **Bảng `payment_transactions`** log đầy đủ mọi callback (kể cả failed / tampered attempts) để đối soát nâng cao.

---

## 8. Tham chiếu

- VNPay official docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- Bảng mã lỗi VNPay: https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/
- Merchant Admin sandbox: https://sandbox.vnpayment.vn/merchantv2/
- Đăng ký sandbox: https://sandbox.vnpayment.vn/devreg

**Source code liên quan:**
- [VnpayProperties.java](../src/main/java/com/example/LaptopWorld_project/config/VnpayProperties.java)
- [VnpayService.java](../src/main/java/com/example/LaptopWorld_project/payment/vnpay/VnpayService.java)
- [VnpayCallbackController.java](../src/main/java/com/example/LaptopWorld_project/payment/vnpay/VnpayCallbackController.java)
- [CheckoutService.java](../src/main/java/com/example/LaptopWorld_project/order/service/CheckoutService.java) (integration point)
- [VnpayReturnPage.tsx](../../laptopworld-web/src/pages/VnpayReturnPage.tsx) (FE result page)
- [V21__payment_transaction_fields.sql](../src/main/resources/db/migration/V21__payment_transaction_fields.sql)
