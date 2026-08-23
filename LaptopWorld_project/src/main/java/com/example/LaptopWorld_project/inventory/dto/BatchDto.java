package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BatchDto(
        Long goodsReceiptDetailId,
        Long goodsReceiptId,
        String goodsReceiptCode,
        Long supplierId,
        String supplierName,
        int quantity,
        int remainingQuantity,
        BigDecimal importPrice,
        OffsetDateTime importedAt
) {}
