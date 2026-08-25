package com.example.LaptopWorld_project.payment;

import com.example.LaptopWorld_project.config.VnpayProperties;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.payment.vnpay.VnpayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test VnpayService — build URL + verify HMAC-SHA512 checksum.
 * Khong goi API VNPay that.
 */
class VnpayServiceTest {

    private static final String TMN = "TESTMERCHANT";
    private static final String SECRET = "SANDBOXHASHSECRETFORHMACSHA512TESTONLY";

    private VnpayService svc;

    @BeforeEach
    void setUp() {
        VnpayProperties props = new VnpayProperties(
                TMN,
                SECRET,
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "http://localhost:5173/thanh-toan/vnpay/ket-qua",
                "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
                "2.1.0", "pay", "VND", "vn", "250000"
        );
        svc = new VnpayService(props);
    }

    private Order buildOrder(String code, String total) {
        Order o = new Order();
        o.setCode(code);
        o.setTotal(new BigDecimal(total));
        return o;
    }

    @Test
    @DisplayName("createPaymentUrl — URL chua day du field bat buoc + amount x100")
    void createPaymentUrl_containsAllRequiredParams() {
        Order order = buildOrder("ORD-20260825-001", "1250000");

        String url = svc.createPaymentUrl(order, "127.0.0.1");

        assertThat(url).startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?");
        // Amount x100: 1250000 * 100 = 125000000
        assertThat(url).contains("vnp_Amount=125000000");
        assertThat(url).contains("vnp_TmnCode=" + TMN);
        assertThat(url).contains("vnp_TxnRef=ORD-20260825-001");
        assertThat(url).contains("vnp_Version=2.1.0");
        assertThat(url).contains("vnp_Command=pay");
        assertThat(url).contains("vnp_CurrCode=VND");
        assertThat(url).contains("vnp_Locale=vn");
        assertThat(url).contains("vnp_SecureHash=");
        // vnp_IpAddr
        assertThat(url).contains("vnp_IpAddr=127.0.0.1");
    }

    @Test
    @DisplayName("verifyChecksum — chu ky dung tra ve true")
    void verifyChecksum_validSignature_returnsTrue() {
        // Build 1 payload gia dinh trang thai VNPay tra ve, tinh hash chuan roi verify.
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", "125000000");
        params.put("vnp_BankCode", "NCB");
        params.put("vnp_OrderInfo", "Thanh toan don hang ORD-20260825-001");
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TmnCode", TMN);
        params.put("vnp_TxnRef", "ORD-20260825-001");
        params.put("vnp_TransactionStatus", "00");

        String hash = computeHmacSha512(SECRET, buildHashData(params));
        params.put("vnp_SecureHash", hash);

        assertThat(svc.verifyChecksum(params)).isTrue();
    }

    @Test
    @DisplayName("verifyChecksum — chu ky sai tra ve false")
    void verifyChecksum_wrongSignature_returnsFalse() {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Amount", "125000000");
        params.put("vnp_TxnRef", "ORD-20260825-001");
        params.put("vnp_SecureHash", "deadbeef00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fake");

        assertThat(svc.verifyChecksum(params)).isFalse();
    }

    @Test
    @DisplayName("verifyChecksum — thieu vnp_SecureHash tra ve false (khong crash)")
    void verifyChecksum_missingHash_returnsFalse() {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Amount", "125000000");

        assertThat(svc.verifyChecksum(params)).isFalse();
    }

    // ================ helpers giong VnpayService noi bo ================
    private String buildHashData(Map<String, String> params) {
        TreeMap<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            if (e.getValue() == null || e.getValue().isEmpty()) continue;
            if (!first) sb.append("&");
            sb.append(e.getKey()).append("=")
              .append(java.net.URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
            first = false;
        }
        return sb.toString();
    }

    private String computeHmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
