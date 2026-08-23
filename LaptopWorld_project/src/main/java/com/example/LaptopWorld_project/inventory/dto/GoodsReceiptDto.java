package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record GoodsReceiptDto(
        Long id,
        String code,
        Long supplierId,
        String supplierName,
        Long userId,
        String userFullName,
        BigDecimal totalAmount,
        String note,
        List<GoodsReceiptDetailDto> items,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
