package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record GoodsReceiptListItemDto(
        Long id,
        String code,
        String supplierName,
        String userFullName,
        BigDecimal totalAmount,
        OffsetDateTime createdAt
) {}
