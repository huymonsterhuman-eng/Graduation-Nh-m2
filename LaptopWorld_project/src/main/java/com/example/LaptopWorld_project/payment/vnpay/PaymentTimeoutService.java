package com.example.LaptopWorld_project.payment.vnpay;

import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Auto-cancel đơn VNPay pending unpaid quá hạn (mặc định 15 phút).
 * Chạy mỗi 60 giây. Reuse {@link OrderService#systemCancelExpired} để release
 * reserved stock + refund voucher qua {@code doTransition(pending → cancelled)}.
 *
 * Race với VNPay IPN: khi job đang chạy mà IPN vừa về set paid,
 * {@code systemCancelExpired} check status + paymentStatus lần cuối trước khi cancel.
 * Nếu IPN thắng → job skip đơn đó.
 *
 * Fault tolerance: try/catch từng đơn để 1 lỗi không dừng cả loop.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentTimeoutService {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    /**
     * Quét mỗi 60 giây. Dùng fixedDelay thay fixedRate — đảm bảo lần trước xong mới chạy lần sau,
     * tránh chồng chéo nếu 1 lần chạy chậm hơn dự kiến.
     *
     * KHÔNG @Transactional ở đây — vì systemCancelExpired đã có @Transactional riêng.
     * Nếu wrap thêm readOnly=true bên ngoài, systemCancelExpired sẽ tham gia transaction
     * readOnly (propagation mặc định REQUIRED) → write không commit ra DB.
     * Ngoài ra tách transaction từng đơn: 1 đơn fail không rollback các đơn còn lại.
     */
    @Scheduled(fixedDelayString = "${app.payment-timeout.check-interval-ms:60000}",
               initialDelayString = "${app.payment-timeout.initial-delay-ms:30000}")
    public void cancelExpiredVnpayOrders() {
        List<Order> expired = orderRepository.findExpiredUnpaidOrders(
                OrderStatus.pending, PaymentMethod.vnpay, PaymentStatus.unpaid,
                OffsetDateTime.now()
        );
        if (expired.isEmpty()) return;

        log.info("PaymentTimeout: tìm thấy {} đơn VNPay quá hạn — bắt đầu xử lý", expired.size());
        int ok = 0;
        int skipped = 0;
        for (Order o : expired) {
            try {
                orderService.systemCancelExpired(o.getId(),
                        "Quá 15 phút chưa thanh toán VNPay");
                ok++;
            } catch (Exception ex) {
                skipped++;
                log.error("PaymentTimeout: lỗi khi cancel order {}", o.getCode(), ex);
            }
        }
        log.info("PaymentTimeout: đã xử lý {} đơn ({} thành công, {} lỗi)",
                expired.size(), ok, skipped);
    }
}
