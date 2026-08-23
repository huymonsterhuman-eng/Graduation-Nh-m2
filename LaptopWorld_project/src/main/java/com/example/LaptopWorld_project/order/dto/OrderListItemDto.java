package com.example.LaptopWorld_project.order.dto;

import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record OrderListItemDto(
        Long id,
        String code,
        BigDecimal total,
        OrderStatus status,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        int itemCount,
        Long partnerId,          // đơn vị vận chuyển — nullable
        String shippingMethod,   // 'standard' / 'express' / null
        OffsetDateTime createdAt
) {}
