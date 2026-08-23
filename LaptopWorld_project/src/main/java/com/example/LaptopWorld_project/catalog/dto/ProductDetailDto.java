package com.example.LaptopWorld_project.catalog.dto;

import com.example.LaptopWorld_project.review.dto.RatingSummaryDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record ProductDetailDto(
        Long id,
        String name,
        String slug,
        String sku,
        String shortDescription,
        String description,
        BigDecimal price,
        BigDecimal salePrice,
        BigDecimal costPrice,
        Map<String, Object> specs,
        int stock,
        int reservedStock,
        int availableStock,
        int views,
        boolean isFeatured,
        boolean isActive,
        BrandRef brand,
        CategoryRef category,
        List<ImageRef> images,
        BigDecimal avgRating,   // null nếu SP chưa có review
        int reviewCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public record BrandRef(Long id, String name, String slug, String logo) {}
    public record CategoryRef(Long id, String name, String slug) {}
    public record ImageRef(Long id, String path, String alt, int sortOrder, boolean isPrimary) {}

    public ProductDetailDto withRating(RatingSummaryDto r) {
        RatingSummaryDto s = r != null ? r : RatingSummaryDto.empty();
        return new ProductDetailDto(id, name, slug, sku, shortDescription, description,
                price, salePrice, costPrice, specs,
                stock, reservedStock, availableStock, views, isFeatured, isActive,
                brand, category, images,
                s.avgRating(), s.reviewCount(),
                createdAt, updatedAt);
    }
}
