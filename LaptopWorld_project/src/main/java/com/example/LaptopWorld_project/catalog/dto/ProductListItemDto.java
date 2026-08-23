package com.example.LaptopWorld_project.catalog.dto;

import com.example.LaptopWorld_project.review.dto.RatingSummaryDto;

import java.math.BigDecimal;

/**
 * DTO gọn cho list/grid trang catalog + kết quả tìm kiếm.
 * Chỉ chứa field cần render card sản phẩm.
 */
public record ProductListItemDto(
        Long id,
        String name,
        String slug,
        String shortDescription,
        BigDecimal price,
        BigDecimal salePrice,
        String primaryImage,
        String categoryName,
        String brandName,
        int stock,             // cache stock vật lý (có thể lớn hơn "còn giao được")
        int availableStock,    // stock - reserved — số còn khả dụng cho khách đặt
        boolean isFeatured,
        BigDecimal avgRating,   // null nếu SP chưa có review
        int reviewCount
) {
    /** Trả về bản copy với rating gắn vào — dùng sau khi bulk aggregate. */
    public ProductListItemDto withRating(RatingSummaryDto r) {
        RatingSummaryDto s = r != null ? r : RatingSummaryDto.empty();
        return new ProductListItemDto(id, name, slug, shortDescription, price, salePrice,
                primaryImage, categoryName, brandName, stock, availableStock, isFeatured,
                s.avgRating(), s.reviewCount());
    }
}
