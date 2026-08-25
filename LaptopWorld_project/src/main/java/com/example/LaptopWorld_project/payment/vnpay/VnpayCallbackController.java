package com.example.LaptopWorld_project.payment.vnpay;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 2 endpoint callback VNPay:
 *  - {@code /return}: user redirect về sau thanh toán. Verify HMAC + update DB
 *    (fallback cho dev localhost khi IPN không tới được). Trả JSON cho FE hiển thị.
 *  - {@code /ipn}: server-to-server callback từ VNPay. Nguồn tin cậy chính thức
 *    khi deploy public. Trả về format {@code {RspCode, Message}} theo chuẩn VNPay.
 *
 * Cả 2 đều public (không cần JWT) — VNPay không gửi token, chỉ verify bằng HMAC.
 * Anti-tamper handle bằng {@link VnpayService#verifyChecksum(Map)}.
 * Idempotency: cả 2 đường đều gọi {@link #updateOrderIfValid(Map)} — nếu order
 * đã paid rồi thì skip, không double-update.
 *
 * Vì sao return URL cũng update DB (không chỉ chờ IPN):
 * VNPay sandbox chạy trên server công cộng, IPN không tới được {@code localhost:8080}.
 * Khi deploy public (có domain thật) thì IPN sẽ tới trước return → update xảy ra
 * ở IPN, return chỉ nhìn thấy paymentStatus=paid và bỏ qua. Khi dev local, return
 * là con đường duy nhất update DB → phải để nó update.
 */
@Slf4j
@Tag(name = "VNPay Callback", description = "Endpoint nhận callback từ VNPay sau thanh toán")
@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
public class VnpayCallbackController {

    private final VnpayService vnpayService;
    private final OrderRepository orderRepository;

    @Operation(summary = "Return URL — khách redirect về sau thanh toán. Verify + update DB fallback (dev localhost), trả JSON cho FE.")
    @GetMapping("/return")
    @Transactional
    public ApiResponse<Map<String, Object>> returnUrl(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);
        boolean checksumOk = vnpayService.verifyChecksum(params);
        String orderCode = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String transactionNo = params.get("vnp_TransactionNo");
        String amount = params.get("vnp_Amount");

        boolean success = checksumOk && "00".equals(responseCode) && "00".equals(transactionStatus);
        log.info("VNPay return: order={} responseCode={} status={} checksumOk={}",
                orderCode, responseCode, transactionStatus, checksumOk);

        // Fallback update DB — dev localhost IPN không tới được.
        // Try/catch để lỗi update không phá page kết quả FE.
        String dbAction = "skipped";
        if (success) {
            try {
                dbAction = updateOrderIfValid(params);
            } catch (Exception e) {
                log.error("VNPay return: update DB failed for order {}: {}", orderCode, e.getMessage());
                dbAction = "error:" + e.getMessage();
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", orderCode);
        data.put("responseCode", responseCode);
        data.put("transactionStatus", transactionStatus);
        data.put("transactionNo", transactionNo);
        data.put("amount", amount);
        data.put("checksumValid", checksumOk);
        data.put("success", success);
        data.put("dbAction", dbAction);
        return ApiResponse.ok(success ? "Thanh toán thành công" : "Thanh toán không thành công", data);
    }

    /**
     * IPN — VNPay gọi server-to-server. Chỉ hoạt động khi backend có public URL
     * (deploy hoặc dùng ngrok tunnel). Trả về đúng format VNPay yêu cầu.
     */
    @Operation(summary = "IPN callback — VNPay gọi server-to-server, verify + update DB")
    @GetMapping("/ipn")
    @Transactional
    public Map<String, String> ipn(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);
        String orderCode = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");

        log.info("VNPay IPN incoming: order={} responseCode={} status={}",
                orderCode, responseCode, transactionStatus);

        try {
            String result = updateOrderIfValid(params);
            return switch (result) {
                case "updated_paid"     -> ipnResponse("00", "Confirm success");
                case "updated_failed"   -> ipnResponse("00", "Payment failed but logged");
                case "already_paid"     -> ipnResponse("02", "Order already confirmed");
                default                  -> ipnResponse("00", result);
            };
        } catch (CallbackException e) {
            return ipnResponse(e.code, e.getMessage());
        }
    }

    /**
     * Verify + update order — dùng chung cho cả /return và /ipn.
     * Trả về mã kết quả để caller quyết định response format.
     *
     * @throws CallbackException khi verify fail (hash sai / order không tồn tại / amount sai).
     */
    private String updateOrderIfValid(Map<String, String> params) {
        String orderCode = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String transactionNo = params.get("vnp_TransactionNo");
        String amountRaw = params.get("vnp_Amount");

        // 1. Verify hash
        if (!vnpayService.verifyChecksum(params)) {
            log.warn("VNPay update: checksum invalid for order {}", orderCode);
            throw new CallbackException("97", "Invalid checksum");
        }

        // 2. Lookup order
        Optional<Order> optOrder = orderRepository.findByCode(orderCode);
        if (optOrder.isEmpty()) {
            log.warn("VNPay update: order not found — code {}", orderCode);
            throw new CallbackException("01", "Order not found");
        }
        Order order = optOrder.get();

        // 3. Verify số tiền — VNPay gửi amount đã x100
        long expectedX100 = order.getTotal()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
        long receivedX100;
        try {
            receivedX100 = Long.parseLong(amountRaw);
        } catch (NumberFormatException e) {
            throw new CallbackException("04", "Invalid amount format");
        }
        if (expectedX100 != receivedX100) {
            log.warn("VNPay update: amount mismatch order={} expected={} received={}",
                    orderCode, expectedX100, receivedX100);
            throw new CallbackException("04", "Invalid amount");
        }

        // 4. Idempotency — đã paid rồi thì skip
        if (order.getPaymentStatus() == PaymentStatus.paid) {
            log.info("VNPay update: order {} already paid — idempotent OK", orderCode);
            return "already_paid";
        }

        // 5. Update theo response code
        boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);
        if (success) {
            order.setPaymentStatus(PaymentStatus.paid);
            order.setPaymentTransactionRef(transactionNo);
            order.setPaidAt(OffsetDateTime.now());
            orderRepository.save(order);
            log.info("VNPay update: order {} marked PAID (transactionNo={})", orderCode, transactionNo);
            return "updated_paid";
        } else {
            // Giao dịch thất bại — chỉ log transactionRef để đối soát, không đổi status.
            order.setPaymentTransactionRef(transactionNo);
            orderRepository.save(order);
            log.info("VNPay update: order {} payment FAILED (responseCode={})", orderCode, responseCode);
            return "updated_failed";
        }
    }

    private static Map<String, String> extractParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((k, v) -> {
            if (v != null && v.length > 0) params.put(k, v[0]);
        });
        return params;
    }

    private static Map<String, String> ipnResponse(String code, String message) {
        Map<String, String> m = new HashMap<>();
        m.put("RspCode", code);
        m.put("Message", message);
        return m;
    }

    /** Exception nội bộ để trả về mã lỗi VNPay từ helper method. */
    private static class CallbackException extends RuntimeException {
        final String code;
        CallbackException(String code, String message) {
            super(message);
            this.code = code;
        }
    }
}
