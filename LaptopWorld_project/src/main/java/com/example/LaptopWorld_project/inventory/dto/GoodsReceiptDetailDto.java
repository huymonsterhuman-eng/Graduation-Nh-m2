package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;

public record GoodsReceiptDetailDto(
        Long id,
        Long productId,
        String productName,
        String productSku,
        int quantity,
        int remainingQuantity,
        BigDecimal importPrice,
        BigDecimal lineTotal
) {}
