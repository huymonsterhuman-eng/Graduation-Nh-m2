package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;

public record GoodsIssueDetailDto(
        Long id,
        Long goodsReceiptDetailId,
        Long productId,
        String productName,
        int quantity,
        BigDecimal importPrice,
        BigDecimal totalPrice
) {}
