package com.example.LaptopWorld_project.voucher.dto;

import com.example.LaptopWorld_project.voucher.entity.VoucherType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record VoucherDto(
        Long id,
        String code,
        String name,
        VoucherType type,
        BigDecimal discountAmount,
        BigDecimal minOrderValue,
        BigDecimal maxDiscount,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        Integer usageLimit,
        int usedCount,
        boolean isActive,
        boolean isSaved,     // user hiện tại đã lưu voucher này chưa (chỉ có ý nghĩa với user endpoint)
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
