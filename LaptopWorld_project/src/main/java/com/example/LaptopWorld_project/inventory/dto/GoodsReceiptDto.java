package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record GoodsReceiptDto(
        Long id,
        String code,
        GoodsReceiptStatus status,
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
