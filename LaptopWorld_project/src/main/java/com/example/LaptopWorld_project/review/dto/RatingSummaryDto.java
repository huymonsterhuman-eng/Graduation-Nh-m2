package com.example.LaptopWorld_project.review.dto;

import java.math.BigDecimal;

/** Tổng hợp rating của 1 sản phẩm — dùng gắn vào ProductListItemDto và ProductDetailDto. */
public record RatingSummaryDto(
        BigDecimal avgRating,  // null nếu chưa có review nào
        int reviewCount
) {
    public static RatingSummaryDto empty() {
        return new RatingSummaryDto(null, 0);
    }
}
