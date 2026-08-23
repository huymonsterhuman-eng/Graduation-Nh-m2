package com.example.LaptopWorld_project.order.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record CartDto(
        Long id,
        List<CartItemDto> items,
        int itemCount,
        BigDecimal subtotal,
        OffsetDateTime updatedAt
) {
    public record CartItemDto(
            Long id,
            Long productId,
            String productName,
            String productSlug,
            String productImage,
            int quantity,
            BigDecimal priceSnapshot,     // giá lúc add vào cart
            BigDecimal currentPrice,      // giá hiện tại của SP
            boolean priceChanged,         // true nếu currentPrice != priceSnapshot
            BigDecimal lineTotal,         // quantity * currentPrice
            int stockAvailable,
            boolean productActive
    ) {}
}
