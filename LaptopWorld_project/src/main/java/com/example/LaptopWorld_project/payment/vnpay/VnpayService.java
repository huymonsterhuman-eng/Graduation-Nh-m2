package com.example.LaptopWorld_project.payment.vnpay;

import com.example.LaptopWorld_project.config.VnpayProperties;
import com.example.LaptopWorld_project.order.entity.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Build payment URL + verify checksum theo chuẩn VNPay v2.1.0.
 *
 * Chi tiết chuẩn ký + list field:
 * https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Luồng:
 *  1. FE gọi checkout với paymentMethod=vnpay → CheckoutService gọi
 *     {@link #createPaymentUrl(Order, String)} → trả URL đầy đủ về FE.
 *  2. FE {@code window.location.href = url} → khách nhập thẻ trên VNPay.
 *  3. VNPay redirect khách về {@code returnUrl} với query params + hash.
 *  4. VNPay đồng thời gọi IPN server-to-server tới {@code /api/payments/vnpay/ipn}.
 *  5. Cả 2 endpoint đều verify hash bằng {@link #verifyChecksum(Map)} trước khi
 *     tin tưởng payload.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayService {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final VnpayProperties props;

    /**
     * Build URL redirect khách sang VNPay để thanh toán.
     *
     * @param order    đơn hàng cần thanh toán (dùng order.code làm vnp_TxnRef)
     * @param clientIp IP khách (lấy từ X-Forwarded-For hoặc HttpServletRequest.getRemoteAddr)
     * @return URL đầy đủ dạng {payUrl}?vnp_...=...&vnp_SecureHash=...
     */
    public String createPaymentUrl(Order order, String clientIp) {
        OffsetDateTime now = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        // Đơn hết hạn thanh toán sau 15 phút (VNPay yêu cầu 15 phút mặc định).
        OffsetDateTime expire = now.plusMinutes(15);

        // vnp_Amount: nhân 100 vì VNPay lưu VND theo đơn vị "xu".
        long amountX100 = order.getTotal()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .longValueExact();

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", props.version());
        params.put("vnp_Command", props.command());
        params.put("vnp_TmnCode", props.tmnCode());
        params.put("vnp_Amount", String.valueOf(amountX100));
        params.put("vnp_CurrCode", props.currCode());
        params.put("vnp_TxnRef", order.getCode());
        params.put("vnp_OrderInfo", "Thanh toan don hang " + order.getCode());
        params.put("vnp_OrderType", props.orderType());
        params.put("vnp_Locale", props.locale());
        params.put("vnp_ReturnUrl", props.returnUrl());
        params.put("vnp_IpAddr", clientIp);
        params.put("vnp_CreateDate", FMT.format(now));
        params.put("vnp_ExpireDate", FMT.format(expire));

        String hashData = buildHashData(params);
        String secureHash = hmacSHA512(props.hashSecret(), hashData);

        params.put("vnp_SecureHash", secureHash);

        String query = buildQueryString(params);
        String url = props.payUrl() + "?" + query;
        log.info("VNPay payment URL created for order {}: amountX100={}", order.getCode(), amountX100);
        return url;
    }

    /**
     * Verify vnp_SecureHash trong query trả về (returnUrl + IPN).
     *
     * @param params query params từ VNPay (đã decode URL). Có chứa vnp_SecureHash + vnp_SecureHashType.
     * @return true nếu hash match, false nếu bị giả mạo hoặc thiếu.
     */
    public boolean verifyChecksum(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            log.warn("VNPay verify: missing vnp_SecureHash");
            return false;
        }
        Map<String, String> filtered = new TreeMap<>(params);
        filtered.remove("vnp_SecureHash");
        filtered.remove("vnp_SecureHashType");

        String hashData = buildHashData(filtered);
        String expected = hmacSHA512(props.hashSecret(), hashData);

        boolean ok = expected.equalsIgnoreCase(receivedHash);
        if (!ok) log.warn("VNPay verify FAILED — expected {}, received {}", expected, receivedHash);
        return ok;
    }

    // ==================== helpers ====================

    /**
     * Build hash data theo chuẩn VNPay: key1=urlEncodedValue1&key2=urlEncodedValue2...
     * — SẮP XẾP KEY THEO ALPHABET (TreeMap tự làm).
     * — URL-encode value theo US_ASCII với space=+ (chuẩn HTML form).
     */
    private String buildHashData(Map<String, String> params) {
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (e.getValue() != null && !e.getValue().isEmpty()) {
                parts.add(e.getKey() + "=" +
                        URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
            }
        }
        return String.join("&", parts);
    }

    /**
     * Build query string cuối cùng — giống hashData nhưng thêm vnp_SecureHash.
     * VNPay chấp nhận value URL-encoded theo US_ASCII.
     */
    private String buildQueryString(Map<String, String> params) {
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (e.getValue() != null && !e.getValue().isEmpty()) {
                parts.add(URLEncoder.encode(e.getKey(), StandardCharsets.US_ASCII) + "=" +
                        URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
            }
        }
        return String.join("&", parts);
    }

    private static String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HmacSHA512 error", e);
        }
    }

    /** Test helper: build hashData từ ordered list (dùng khi debug với case cụ thể). */
    public static String testHashData(Map<String, String> ordered) {
        return String.join("&", Collections.list(Collections.enumeration(ordered.entrySet())).stream()
                .map(e -> e.getKey() + "=" +
                        URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                .toList());
    }
}
