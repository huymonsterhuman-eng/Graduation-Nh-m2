package com.example.LaptopWorld_project.inventory.dto;

import java.math.BigDecimal;

public record GoodsIssueDetailDto(
        Long id,
        Long goodsReceiptDetailId,
        String goodsReceiptCode,
        Long productId,
        String productName,
        String productImage,
        int quantity,
        BigDecimal importPrice,
        BigDecimal totalPrice
) {}
