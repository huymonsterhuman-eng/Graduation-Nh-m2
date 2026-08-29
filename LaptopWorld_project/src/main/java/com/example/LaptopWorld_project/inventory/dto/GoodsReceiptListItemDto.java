package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record GoodsReceiptListItemDto(
        Long id,
        String code,
        GoodsReceiptStatus status,
        String supplierName,
        String userFullName,
        BigDecimal totalAmount,
        OffsetDateTime createdAt
) {}
