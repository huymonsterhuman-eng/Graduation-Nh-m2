package com.example.LaptopWorld_project.order.dto;

import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderDetailDto(
        Long id,
        String code,
        Long userId,
        String username,

        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal shippingFee,
        BigDecimal total,

        String shippingName,
        String shippingAddress,
        String shippingPhone,
        String shippingMethod,

        OrderStatus status,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,

        String voucherCode,       // null nếu không dùng voucher
        String trackingNumber,
        String adminNote,

        OffsetDateTime preparingAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,

        List<OrderItemDto> items
) {
    public record OrderItemDto(
            Long id,
            Long productId,
            String productName,
            String productImage,
            int quantity,
            BigDecimal priceAtPurchase,
            BigDecimal lineTotal
    ) {}
}
