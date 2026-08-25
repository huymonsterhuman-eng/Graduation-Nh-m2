package com.example.LaptopWorld_project.user.dto;

import com.example.LaptopWorld_project.voucher.entity.VoucherType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 1 voucher trong kho của user — dùng cho tab "Kho voucher" ở trang chi tiết user (admin).
 * Kèm trạng thái đã dùng và mã đơn đã áp (nếu có).
 */
public record AdminUserVoucherDto(
        Long id,
        String code,
        String name,
        VoucherType type,
        BigDecimal discountAmount,
        BigDecimal minOrderValue,
        BigDecimal maxDiscount,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        boolean isUsed,
        OffsetDateTime usedAt,
        Long orderId,
        OffsetDateTime savedAt
) {}
