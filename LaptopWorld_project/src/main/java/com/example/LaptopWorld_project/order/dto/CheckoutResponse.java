package com.example.LaptopWorld_project.order.dto;

/**
 * Kết quả checkout. Nếu payment method = vnpay/momo, có thêm {@code paymentUrl}
 * để FE redirect khách sang cổng thanh toán (window.location.href = paymentUrl).
 * COD/ATM tại nhà trả {@code paymentUrl=null}.
 *
 * @param order      chi tiết đơn vừa tạo (status=pending, paymentStatus=unpaid)
 * @param paymentUrl URL redirect sang cổng thanh toán, null nếu COD
 */
public record CheckoutResponse(
        OrderDetailDto order,
        String paymentUrl
) {
    // paymentExpiresAt đã có sẵn trong OrderDetailDto → không cần expose thêm ở đây.
}
